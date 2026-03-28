import { EventEmitter } from "node:events";
import OpenAI from "openai";

export class GROK extends EventEmitter {
  private client: OpenAI | null;

  constructor() {
    super();
    this.client = null;
  }

  async init(): Promise<void> {
    // xAI has an OpenAI-compatible API. Use an xAI key from console.x.ai.
    const apiKey = process.env.XAI_API_KEY ?? process.env.GROK_API_KEY;
    if (!apiKey) throw new Error("XAI_API_KEY (or GROK_API_KEY) not found");

    this.client = new OpenAI({
      apiKey,
      baseURL: "https://api.x.ai/v1",
    });
  }

  async connect(): Promise<void> {
    await this.init();
  }

  async sendMessage(message: string): Promise<string> {
    if (!this.client) throw new Error("GROK client not initialized");

    const response = await this.client.chat.completions.create({
      model: "grok-3-mini-latest",
      messages: [{ role: "user", content: message }],
    });

    return response.choices?.[0]?.message?.content ?? "";
  }
}
