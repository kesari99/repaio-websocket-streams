import { Hume } from "../tts/hume.js";

export async function HumeController(req: any, res: any) {
  try {
    const { message } = req.body;
    const hume = new Hume();
    await hume.connect();

    hume.on("played", (filePath) => {
      console.log(filePath, "filePath");
    });

    hume.on("error", (err) => {
      console.error("Error", err);
    });

    // Kick off playback without blocking the HTTP response.
    void hume.streamAudio(message);

    return res.send({
      success: true,
      message: "Audio is being played",
    });
  } catch (error) {
    return res.status(500).send({ error: "Something went wrong" });
  }
}
