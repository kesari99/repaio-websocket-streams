# repaio-websocket-streams

Voice bot backend (Fastify + WebSockets) that connects phone calls (Twilio, Plivo, Exotel) to
streaming speech-to-text (Deepgram, Sarvam, Smallest.ai), LLMs (OpenAI, Gemini, Grok) and TTS (Hume).

## Setup

```bash
npm install
cp .env.example .env   # then fill in your keys
```

`PUBLIC_BASE_URL` must be a publicly reachable URL (e.g. an ngrok tunnel) so telephony providers
can reach your webhooks and media-stream WebSockets.

## Run

```bash
npm run dev     # watch mode via tsx
npm start       # compile with tsc and run dist/app.js
npm run build   # compile only
```

## Layout

- `src/app.ts` – server entry point
- `src/routes/`, `src/controllers/` – HTTP routes and handlers
- `src/websockets/` – call media-stream handlers (Twilio/Plivo, Exotel)
- `src/stt/` – speech-to-text transcribers
- `src/llm/`, `src/tts/` – LLM and TTS clients
- `src/clients/` – telephony API clients
