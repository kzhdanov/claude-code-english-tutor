"use client";

import { useEffect, useState } from "react";
import { useConversation } from "@/hooks/useConversation";
import { ConversationView } from "@/components/ConversationView";
import { SpeakButton } from "@/components/SpeakButton";
import type { NewsCategory } from "@/types";

export default function Home() {
  const {
    messages,
    status,
    error,
    isSupported,
    startRecording,
    stopRecording,
    sendMessage,
    voices,
    selectedVoice,
    setSelectedVoice,
  } = useConversation();

  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetch("/api/news")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch(() => {});
  }, []);

  const handleNewsTopic = (title: string) => {
    sendMessage(`Let's talk about this news: ${title}`);
  };

  const showNews = messages.length === 0 && categories.length > 0;

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div>
          {voices.length > 0 && (
            <select
              value={selectedVoice?.name || ""}
              onChange={(e) => {
                const voice = voices.find((v) => v.name === e.target.value);
                if (voice) setSelectedVoice(voice);
              }}
              className="text-sm border border-gray-300 rounded-lg pl-4 pr-10 py-2 w-52 bg-white text-gray-700 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23666%22%20stroke-width%3D%222%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat"
            >
              {voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-foreground">
            Claude Code English Tutor
          </h1>
          <p className="text-xs text-gray-500">Voice chat with AI</p>
        </div>
        <div className="w-52" />
      </header>

      {/* News topics or Chat area */}
      {showNews ? (
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-sm text-gray-500 mb-4 text-center">
            Pick a topic to discuss:
          </p>

          {/* Category tabs */}
          <div className="flex gap-2 justify-center mb-4 flex-wrap">
            {categories.map((cat, i) => (
              <button
                key={cat.label}
                onClick={() => setActiveTab(i)}
                className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                  activeTab === i
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* News items for active tab */}
          <div className="flex flex-col gap-2 max-w-xl mx-auto">
            {categories[activeTab]?.items.map((item, i) => (
              <button
                key={i}
                onClick={() => handleNewsTopic(item.title)}
                disabled={status !== "idle"}
                className="text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm text-gray-800"
              >
                {item.title}
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-400 mt-4 text-center">
            Or just press Speak and say anything in English
          </p>
        </div>
      ) : (
        <ConversationView messages={messages} status={status} />
      )}

      {/* Bottom controls */}
      <div className="border-t border-gray-200 px-4 py-6 flex flex-col items-center gap-3">
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        {!isSupported && (
          <p className="text-sm text-amber-600 text-center">
            Speech recognition is not supported in this browser. Please use
            Chrome.
          </p>
        )}

        <SpeakButton
          status={status}
          onStart={startRecording}
          onStop={stopRecording}
          disabled={!isSupported}
        />

        <p className="text-xs text-gray-400">
          {status === "recording"
            ? "Listening... tap to stop"
            : status === "processing"
              ? "Getting response..."
              : status === "speaking"
                ? "Tap to interrupt"
                : "Tap to speak"}
        </p>
      </div>
    </div>
  );
}
