"use client";

import { useState, useCallback, useRef } from "react";
import type { EdgeVoice } from "@/types";

const EDGE_VOICES: EdgeVoice[] = [
  { id: "en-US-AriaNeural", name: "Aria (US)", gender: "Female" },
  { id: "en-US-JennyNeural", name: "Jenny (US)", gender: "Female" },
  { id: "en-US-AvaNeural", name: "Ava (US)", gender: "Female" },
  { id: "en-US-GuyNeural", name: "Guy (US)", gender: "Male" },
  { id: "en-US-AndrewNeural", name: "Andrew (US)", gender: "Male" },
  { id: "en-GB-SoniaNeural", name: "Sonia (UK)", gender: "Female" },
  { id: "en-GB-RyanNeural", name: "Ryan (UK)", gender: "Male" },
  { id: "en-AU-NatashaNeural", name: "Natasha (AU)", gender: "Female" },
];

function splitChunks(text: string): string[] {
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= 100) {
      chunks.push(remaining.trim());
      break;
    }

    // Find first period after 100 chars
    const dotIndex = remaining.indexOf(".", 100);
    if (dotIndex === -1) {
      chunks.push(remaining.trim());
      break;
    }

    chunks.push(remaining.slice(0, dotIndex + 1).trim());
    remaining = remaining.slice(dotIndex + 1);
  }

  return chunks.filter(Boolean);
}

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<EdgeVoice>(EDGE_VOICES[0]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stoppedRef = useRef(false);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src) URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      stop();
      stoppedRef.current = false;
      setIsSpeaking(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const sentences = splitChunks(text);

      // Fetch all sentences in parallel
      const fetchPromises = sentences.map((sentence) =>
        fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: sentence, voice: selectedVoice.id }),
          signal: controller.signal,
        }).then((res) => {
          if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
          return res.blob();
        }),
      );

      try {
        // Play sentences sequentially as they become ready
        for (let i = 0; i < fetchPromises.length; i++) {
          if (stoppedRef.current) return;

          const blob = await fetchPromises[i];
          if (stoppedRef.current) return;

          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audioRef.current = audio;

          await new Promise<void>((resolve, reject) => {
            audio.onended = () => {
              URL.revokeObjectURL(url);
              audioRef.current = null;
              resolve();
            };
            audio.onerror = () => {
              URL.revokeObjectURL(url);
              audioRef.current = null;
              reject(new Error("Audio playback error"));
            };
            audio.play().catch(reject);
          });
        }
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("TTS error:", err);
        }
      } finally {
        if (!stoppedRef.current) {
          setIsSpeaking(false);
        }
      }
    },
    [selectedVoice, stop],
  );

  return {
    isSpeaking,
    isSupported: true,
    voices: EDGE_VOICES,
    selectedVoice,
    setSelectedVoice,
    speak,
    stop,
  };
}
