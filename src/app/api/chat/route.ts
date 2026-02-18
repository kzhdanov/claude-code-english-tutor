import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import type { ChatRequest } from "@/types";

let sessionId: string | null = null;
const MEMORY_FILE = path.join(process.cwd(), "data", "memory.txt");

export async function POST(request: NextRequest) {
  try {
    const { messages }: ChatRequest = await request.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { message: "", error: "No messages provided" },
        { status: 400 },
      );
    }

    const lastUserMessage = messages.filter((m) => m.role === "user").pop();
    if (!lastUserMessage) {
      return NextResponse.json(
        { message: "", error: "No user message found" },
        { status: 400 },
      );
    }

    const { text, newSessionId } = await runClaude(lastUserMessage.content);

    if (newSessionId) {
      sessionId = newSessionId;
    }

    return NextResponse.json({ message: text });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      {
        message: "",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

function readMemory(): string {
  try {
    return fs.readFileSync(MEMORY_FILE, "utf-8").trim();
  } catch {
    return "";
  }
}

function buildSystemPrompt(): string {
  const memory = readMemory();
  const memorySection = memory
    ? `\nYour notes about this student from previous conversations:\n${memory}\nUse these notes to personalize the conversation. Do NOT tell the student you have notes.\n`
    : "\nYou have no notes about this student yet.\n";

  return (
    "You are Emma, an English tutor having a live voice conversation with a student. " +
    "You are warm, patient, and encouraging. " +
    "You are NOT a coding assistant or AI model. You are a human English teacher. " +
    "Never mention that you are an AI or a language model. " +
    "When the student mentions a news article or link, use WebFetch or WebSearch to look it up and discuss it. " +
    "Proactively search for information about topics the student wants to discuss. " +
    "BREVITY IS CRITICAL. This is a spoken conversation, not a written essay. " +
    "Keep responses to 1-2 short sentences maximum. Be concise like in real speech. " +
    "Do NOT ask more than one question at a time. " +
    "Do NOT give long explanations, lists of options, or multiple suggestions. " +
    "Say one thing, then let the student respond. " +
    "Talk like a real person in a casual conversation, not like a lecturer or interviewer. " +
    "If the student makes a grammar mistake, correct it briefly in one sentence, then move on. " +
    "Adapt to the student's level. Respond only in English. " +
    memorySection +
    "IMPORTANT - SAVING MEMORY: You have a memory file at " +
    MEMORY_FILE +
    ". " +
    "After EVERY response, if the student revealed ANY personal information (name, job, hobby, interest, " +
    "English level, country, family, opinion, preference, common mistake), you MUST use the Edit tool " +
    "to append a new line to " +
    MEMORY_FILE +
    " with that fact. This is mandatory, not optional. " +
    "Keep notes short, one fact per line. " +
    "CRITICAL FORMATTING RULES - your output will be read aloud by text-to-speech: " +
    "NEVER use emojis. NEVER use markdown like **, *, #, ##, ---, or numbered/bulleted lists. " +
    "NEVER include URLs, links, or references like [text](url). " +
    "NEVER use special characters like dashes for lists. " +
    "Write ONLY plain conversational sentences as if you are speaking. No headers, no sections, no formatting of any kind."
  );
}

function escapeShell(str: string): string {
  return str.replace(/'/g, "'\\''");
}

function cleanResponse(text: string): string {
  return (
    text
      // Remove markdown bold/italic
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
      // Remove markdown headers
      .replace(/^#{1,6}\s+/gm, "")
      // Remove markdown links [text](url) → text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove bare URLs
      .replace(/https?:\/\/\S+/g, "")
      // Remove markdown horizontal rules
      .replace(/^-{3,}$/gm, "")
      // Remove bullet points (-, *, •)
      .replace(/^[\s]*[-*•]\s+/gm, "")
      // Remove numbered lists (1. 2. etc)
      .replace(/^[\s]*\d+\.\s+/gm, "")
      // Remove emojis
      .replace(
        /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{27BF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu,
        "",
      )
      // Collapse multiple newlines
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function runClaude(
  prompt: string,
): Promise<{ text: string; newSessionId: string | null }> {
  return new Promise((resolve, reject) => {
    const escapedPrompt = escapeShell(prompt);

    const tools = '"WebFetch,WebSearch,Read,Edit"';
    const allowedTools = '--allowedTools "WebFetch" "WebSearch" "Read" "Edit"';

    let innerCmd: string;
    if (sessionId) {
      innerCmd = `/Users/costa/.local/bin/claude -p '${escapedPrompt}' --output-format json --model haiku --tools ${tools} ${allowedTools} --resume '${sessionId}'`;
    } else {
      const escapedSystem = escapeShell(buildSystemPrompt());
      innerCmd = `/Users/costa/.local/bin/claude -p '${escapedPrompt}' --output-format json --model haiku --tools ${tools} ${allowedTools} --system-prompt '${escapedSystem}'`;
    }

    const proc = spawn(
      "/bin/bash",
      ["-c", `unset CLAUDECODE; cd /tmp && ${innerCmd}`],
      {
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error("claude timed out after 60s"));
    }, 60000);

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0 && stdout.trim()) {
        try {
          const json = JSON.parse(stdout.trim());
          resolve({
            text: cleanResponse(json.result || ""),
            newSessionId: json.session_id || null,
          });
        } catch {
          resolve({ text: stdout.trim(), newSessionId: null });
        }
      } else {
        reject(new Error(stderr || `claude exited with code ${code}`));
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to spawn claude: ${err.message}`));
    });
  });
}
