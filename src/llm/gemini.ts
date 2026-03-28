import { GoogleGenAI } from "@google/genai";
import { EventEmitter } from "node:events";

export class Gemini extends EventEmitter {
  private client: GoogleGenAI | null;
  private response: any;

  constructor() {
    super();
    this.client = null;
    this.response = null;
  }

  protected async init(): Promise<void> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("api key not found");
    }

    this.client = new GoogleGenAI({ apiKey: apiKey });
  }

  async connect(): Promise<void> {
    await this.init();
  }

  async sendMessage(message: string): Promise<string> {
    try {
      const response = this.client?.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: message,
      });

      const text = (await response)?.text || "";

      return text;
    } catch (error) {
      console.log(error, "error");
      throw error;
    }
  }
}
