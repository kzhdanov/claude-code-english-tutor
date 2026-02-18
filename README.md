# Claude Code English Tutor

A web app for practicing spoken English with an AI tutor (Emma). You speak into the microphone, Emma responds with voice — like a real conversation.

Built with Next.js, Web Speech API, and Claude Code CLI as the AI backend.

## Prerequisites

- Node.js 22+
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated on your machine

Verify Claude Code is working:

```bash
claude --version
```

## Setup

Install dependencies:

```bash
npm install
```

## Run

Start the dev server:

```bash
npm run dev
```

Open http://localhost:3000 in your browser (Chrome recommended for best Speech API support).

To access from other devices on your local network, the dev server binds to `0.0.0.0` by default. Find your local IP and open `http://<your-ip>:3000`.

## How it works

1. Press the microphone button and speak in English
2. After 2 seconds of silence, your speech is automatically sent to Emma
3. Emma responds with text and reads it aloud
4. Pick a news topic from the homepage to start a conversation

Emma remembers things about you between sessions (stored in `data/memory.txt`).
