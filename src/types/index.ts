export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface ChatRequest {
  messages: Message[];
}

export interface ChatResponse {
  message: string;
  error?: string;
}

export type ConversationStatus =
  | "idle"
  | "recording"
  | "processing"
  | "speaking";

export interface NewsItem {
  title: string;
  link: string;
}

export interface NewsCategory {
  label: string;
  items: NewsItem[];
}

export interface EdgeVoice {
  id: string;
  name: string;
  gender: string;
}
