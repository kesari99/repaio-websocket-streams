// mediaStreamHandler.ts
import WebSocket from 'ws';
import { FastifyInstance } from 'fastify';
import DeepgramTranscriber from '../stt/deepgram-transcriber.js';
import { registerTranscriber } from '../app.js';
import wavefilePkg from 'wavefile';
import SarvamTranscriber from '../stt/sarvam-transcriber.js';
import { decodeMuLawToPCM, upsampleTo16kHz , convertMuLawToPCM} from '../utils/convertTo16bitPCM.js';
import { writeMuLawToWav, writePCMToWav } from '../utils/convertToWav.js';
const { WaveFile } = wavefilePkg;
import { exec } from 'child_process';



export async function registerMediaStream(
  app: FastifyInstance,
  getTranscriber: (streamSid: string) => DeepgramTranscriber | SarvamTranscriber | null


) {
  app.get('/media-stream', { websocket: true }, (connection, req) => {
    console.log("🔌 New WebSocket connection request received from Twilio");
    console.log("📡 Request headers:", req.headers);




    // const openAiWs = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview", {
    //   headers: {
    //     Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    //     "OpenAI-Beta": "realtime=v1"
    //   }
    // });




    const SYSTEM_MESSAGE = 'You are a polite, professional, and empathetic AI assistant working for a loan servicing company. You are calling customers regarding their upcoming or overdue loan repayments. Your goal is to confirm their identity, remind them about the due payment, and encourage them to repay or make a payment arrangement. Use clear, conversational, and non-threatening language. Adapt your tone based on the customer\'s mood—remain calm, helpful, and supportive even if the customer is upset or hesitant. Start the conversation like a human call center representative. Always ask for permission to proceed and confirm the customer\'s name for verification. Do not sound robotic or overly formal.';
    const VOICE = 'alloy';

    const LOG_EVENT_TYPES = [
      'response.content.done',
      'rate_limits.updated',
      'response.done',
      'input_audio_buffer.committed',
      'input_audio_buffer.speech_stopped',
      'input_audio_buffer.speech_started',
      'session.created'
    ];

    // console.log("🤖 Attempting to connect to OpenAI WebSocket...");

    // const connectionTimeout = setTimeout(() => {
    //   console.error('❌ OpenAI WebSocket connection timeout after 10 seconds');
    //   process.exit(1);
    // }, 10000);

    // openAiWs.on('open', () => {
    //   clearTimeout(connectionTimeout);
    //   console.log("✅ OpenAI WebSocket Connected Successfully!");
    //   const sessionUpdate = {
    //     type: 'session.update',
    //     session: {
    //       turn_detection: { type: 'server_vad' },
    //       input_audio_format: 'g711_ulaw',
    //       output_audio_format: 'g711_ulaw',
    //       voice: VOICE,
    //       instructions: SYSTEM_MESSAGE,
    //       modalities: ["text", "audio"],
    //       temperature: 0.8,
    //     }
    //   };
    //   openAiWs.send(JSON.stringify(sessionUpdate));
    // });

    // openAiWs.on('error', (error) => {
    //   console.error('❌ OpenAI WebSocket Error:', error);
    //   process.exit(1);
    // });

    // openAiWs.on('close', (code, reason) => {
    //   console.log('🔌 OpenAI WebSocket Closed:', { code, reason: JSON.parse(reason.toString()) });
    //   process.exit(1);
    // });


    // openAiWs.on('message', (data) => {
    //   try {
    //     const response = JSON.parse(data.toString());
    //     if (LOG_EVENT_TYPES.includes(response.type)) {
    //       // console.log(`📥 Received event from OpenAI: ${response.type}`, response);
    //     }
    //     if (response.type === 'session.updated') {
    //       console.log('✅ Session updated successfully:', response);
    //     }

    //     if (response.type === 'response.audio.delta' && response.delta) {
    //       const audioData = {
    //         event: 'media',
    //         streamSid: streamSid,
    //         media: { payload: Buffer.from(response.delta, 'base64').toString('base64') }
    //       };
    //       transcriber.sendAudioData(Buffer.from(response.delta, 'base64'));
    //       connection.send(JSON.stringify(audioData));
    //     }
    //   } catch (error) {
    //     console.error('❌ Error processing OpenAI message:', error, 'Raw message:', data);
    //   }
    // });

    let streamSid: string | null = null;
    let transcriber1:  SarvamTranscriber | null = null;
    const wavFile = new WaveFile();
    let muloArray: string[] = [];
    let pcmArray: string[] = []

    connection.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        switch (data.event) {
          case 'start':
            (async () => {
              streamSid = data.start.streamSid;
              console.log('🎬 Stream started with SID:', streamSid);
              // transcriber1 = new DeepgramTranscriber("en-IN", "linear16", 16000, "16bitPCM");
              transcriber1 = new SarvamTranscriber("en-IN");

              await transcriber1.start();
              registerTranscriber(streamSid!, transcriber1);
            })();


            break;

          case 'media':
            // if (openAiWs.readyState === WebSocket.OPEN) {
            //   const audioAppend = {
            //     type: 'input_audio_buffer.append',
            //     audio: data.media.payload
            //   };
            // openAiWs.send(JSON.stringify(audioAppend));

            if (transcriber1 && transcriber1?.isConnected()) {
              // console.log("raw audio", data.media.payload)
              const mulawBuffer = Buffer.from(data.media.payload, 'base64');

              muloArray.push(mulawBuffer.toString("base64"))


              const base64Audio = data.media.payload;
              const muLawBuffer = Buffer.from(base64Audio, 'base64');
              const pcmBuffer = convertMuLawToPCM(muLawBuffer);

              const upsamplepcmBuffer = upsampleTo16kHz(pcmBuffer)

              pcmArray.push(upsamplepcmBuffer.toString('base64'))

              // console.log("audio string", pcm16kHz.toString("base64"))


              transcriber1.sendAudioData(pcmBuffer.toString('base64'));
            } else {
              console.log('⚠️ Transcriber not ready, skipping audio');
            }



            // }
            break;

          case 'stop':
            // writePCMToWav(pcmArray, "pcm.wav")
            // writeMuLawToWav(muloArray, "mulo.wav")

            exec('aplay mulo.wav', (err) => {
              if (err) {
                console.error('❌ Error playing mulo.wav:', err);
              } else {
                console.log('🎧 Playing mulo.wav');
              }
            });

            exec('aplay pcm.wav', (err) => {
              if (err) {
                console.error('❌ Error playing pcm.wav:', err);
              } else {
                console.log('🎧 Playing pcm.wav');
              }
            });
            console.log('⏹️ Stream stopped');
            break;
          default:
            console.log('❓ Unknown event:', data.event);
            break;
        }
      } catch (error) {
        console.error('❌ Error parsing message:', error, 'Message:', message);
      }
    });

    connection.on('close', () => {
      // console.log('🔌 Client disconnected');
      // if (openAiWs.readyState === WebSocket.OPEN) {
      //   openAiWs.close();
      // }
    });
  });
}
