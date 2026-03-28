import { GROK } from "../llm/grok.js";

export async function grokSendMessage(req: any, res: any) {
  try {
    const { message } = req.body ?? {};
    if (!message || typeof message !== "string") {
      return res.status(400).send({ error: "message is required" });
    }

    const grok = new GROK();
    await grok.connect();
    const aiResponse = await grok.sendMessage(message);

    return res.status(200).send({ message: aiResponse });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(error);

    if (
      msg.toLowerCase().includes("incorrect api key") ||
      msg.toLowerCase().includes("api key")
    ) {
      return res.status(401).send({ error: msg });
    }

    return res.status(500).send({ error: "Something went wrong" });
  }
}

