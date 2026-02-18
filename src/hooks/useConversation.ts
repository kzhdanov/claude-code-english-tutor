"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSpeechRecognition } from "./useSpeechRecognition";
import { useSpeechSynthesis } from "./useSpeechSynthesis";
import type { Message, ConversationStatus, ChatResponse } from "@/types";

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function useConversation() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<ConversationStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const speech = useSpeechRecognition();
  const tts = useSpeechSynthesis();
  const lastTranscriptRef = useRef("");

  // When transcript arrives after recording stops, send it
  useEffect(() => {
    if (
      speech.transcript &&
      speech.transcript !== lastTranscriptRef.current &&
      !speech.isListening
    ) {
      lastTranscriptRef.current = speech.transcript;
      sendMessage(speech.transcript);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.transcript, speech.isListening]);

  const sendMessage = useCallback(
    async (text: string) => {
      setError(null);
      setStatus("processing");

      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content: text,
        timestamp: Date.now(),
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: updatedMessages }),
        });

        const data: ChatResponse = await res.json();

        if (!res.ok || data.error) {
          throw new Error(data.error || "Failed to get response");
        }

        const assistantMessage: Message = {
          id: generateId(),
          role: "assistant",
          content: data.message,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setStatus("speaking");
        tts.speak(data.message);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setStatus("idle");
      }
    },
    [messages, tts],
  );

  // When TTS finishes speaking, go back to idle
  useEffect(() => {
    if (status === "speaking" && !tts.isSpeaking && !speech.isListening) {
      setStatus("idle");
    }
  }, [status, tts.isSpeaking, speech.isListening]);

  const startRecording = useCallback(() => {
    tts.stop();
    setError(null);
    setStatus("recording");
    speech.startListening();
  }, [speech, tts]);

  const stopRecording = useCallback(() => {
    speech.stopListening();
  }, [speech]);

  const isSupported = speech.isSupported && tts.isSupported;

  return {
    messages,
    status,
    error,
    isSupported,
    startRecording,
    stopRecording,
    sendMessage,
    voices: tts.voices,
    selectedVoice: tts.selectedVoice,
    setSelectedVoice: tts.setSelectedVoice,
  };
}
