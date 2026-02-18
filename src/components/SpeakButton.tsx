"use client";

import type { ConversationStatus } from "@/types";

interface SpeakButtonProps {
  status: ConversationStatus;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export function SpeakButton({
  status,
  onStart,
  onStop,
  disabled,
}: SpeakButtonProps) {
  const isRecording = status === "recording";
  const isProcessing = status === "processing";
  const isSpeaking = status === "speaking";
  const isBusy = isProcessing || isSpeaking;

  const handleClick = () => {
    if (isRecording) {
      onStop();
    } else if (!isBusy) {
      onStart();
    }
  };

  const label = isRecording
    ? "Listening..."
    : isProcessing
      ? "Thinking..."
      : isSpeaking
        ? "Speaking..."
        : "Speak";

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isBusy}
      className={`
        relative w-20 h-20 rounded-full transition-all duration-200
        flex items-center justify-center
        ${
          isRecording
            ? "bg-red-500 hover:bg-red-600 animate-pulse-ring"
            : isBusy
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 active:scale-95"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
      aria-label={label}
    >
      {isRecording ? (
        <StopIcon />
      ) : isProcessing ? (
        <SpinnerIcon />
      ) : isSpeaking ? (
        <SoundIcon />
      ) : (
        <MicIcon />
      )}
    </button>
  );
}

function MicIcon() {
  return (
    <svg
      className="w-8 h-8 text-white"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg
      className="w-8 h-8 text-white"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="w-8 h-8 text-white animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function SoundIcon() {
  return (
    <svg
      className="w-8 h-8 text-white"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M3 9v6h4l5 5V4L7 9H3z" />
      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
      <path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}
