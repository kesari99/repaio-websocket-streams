import { Hume } from "../tts/hume.js";
import { Gemini } from "../llm/gemini.js";

export async function sendMessage(req: any, res: any) {
  const { message } = req.body;

  const gemini = new Gemini();
  await gemini.connect();

  const aiResponse = await gemini.sendMessage(message);

  const hume = new Hume();
  await hume.connect();

  hume.on("played", (filePath) => {
    console.log(filePath);
  });
  hume.on("error", (err) => {
    console.log(err);
  });
  void hume.streamAudio(aiResponse);
  return res.status(200).send({ message: aiResponse });
}
