import fastify from 'fastify';
import fastifyFormBody from '@fastify/formbody';
import fastifyWs from '@fastify/websocket';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import twilio from 'twilio';

// Load environment variables first
dotenv.config();


const port : number = Number(process.env.PORT) || 8080;

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// Function to create outbound call
async function createCall() {
  if (!process.env.TWILIO_PHONE_NUMBER) {
    throw new Error('TWILIO_PHONE_NUMBER environment variable is not set');
  }
  
  if (!process.env.NGROK_URL) {
    throw new Error('NGROK_URL environment variable is not set');
  }
  
  try {
    console.log('Making call with credentials:', {
      accountSid: process.env.TWILIO_ACCOUNT_SID ? 'Set' : 'Not set',
      authToken: process.env.TWILIO_AUTH_TOKEN ? 'Set' : 'Not set',
      from: process.env.TWILIO_PHONE_NUMBER,
    });
    const twilioWebsocketUrl = `wss://dingo-suitable-accurately.ngrok-free.app/media-stream`;
    const toPhoneNumber = "+919381756966";
    const fromPhoneNumber = "+19284473424";
    
    const call = await client.calls.create({
        twiml: `<Response>
            <Connect>
                <Stream url="${twilioWebsocketUrl}"/>
            </Connect>
            <Pause length="3600"/>
        </Response>`,
        to: toPhoneNumber,
        from: fromPhoneNumber,
        statusCallback: `https://dingo-suitable-accurately.ngrok-free.app/incomming-call`,
        statusCallbackEvent: ['completed', 'failed', 'busy', 'no-answer'],
        statusCallbackMethod: 'POST',
    });
    console.log('Call created with SID:', call.sid);
    return call.sid;
  } catch (error) {
    console.error('Detailed error creating call:', error);
    throw error;
  }
}

// Initialize fastify app
const app = fastify();
app.register(fastifyFormBody)
app.register(fastifyWs)



// const server = createServer(app.server);
// setUpWebSocket(server);

app.get('/', (req, res) => {
  res.send('Hello World! Twillo server with WebSocket is configured.');
})

app.post('/make-call', createCall)

app.get('/incomming-call', async(req, res) => {
   console.log('req.headers.host', req.headers.host, req.body);
    return    res.send('Hello World! Twillo server with WebSocket is configured.');  
})


app.register( async function(app)  {
  app.get('/media-stream', { websocket: true }, (connection, req) => {
    console.log("🔌 New WebSocket connection request received from Twilio");
    console.log("📡 Request headers:", req.headers);

    const openAiWs = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview", {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "OpenAI-Beta": "realtime=v1"
      }
    });

    const SYSTEM_MESSAGE = 'You are a helpful and bubbly AI assistant who loves to chat about anything the user is interested about and is prepared to offer them facts. You have a penchant for dad jokes, owl jokes, and rickrolling – subtly. Always stay positive, but work in a joke when appropriate.';
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

    console.log("🤖 Attempting to connect to OpenAI WebSocket...");

    const connectionTimeout = setTimeout(() => {
      console.error('❌ OpenAI WebSocket connection timeout after 10 seconds');
      process.exit(1);
    }, 10000);

    openAiWs.on('open', () => {
      clearTimeout(connectionTimeout);
      console.log("✅ OpenAI WebSocket Connected Successfully!");
      const sessionUpdate = {
        type: 'session.update',
        session: {
          turn_detection: { type: 'server_vad' },
          input_audio_format: 'g711_ulaw',
          output_audio_format: 'g711_ulaw',
          voice: VOICE,
          instructions: SYSTEM_MESSAGE,
          modalities: ["text", "audio"],
          temperature: 0.8,
        }
      };
      openAiWs.send(JSON.stringify(sessionUpdate));
    });

    openAiWs.on('error', (error) => {
      console.error('❌ OpenAI WebSocket Error:', error);
      process.exit(1);
    });

    openAiWs.on('close', (code, reason) => {
      console.log('🔌 OpenAI WebSocket Closed:', { code, reason: reason.toString() });
      process.exit(1);
    });

    let streamSid: string | null = null;

    openAiWs.on('message', (data) => {
      try {
        const response = JSON.parse(data.toString());
        if (LOG_EVENT_TYPES.includes(response.type)) {
          console.log(`📥 Received event from OpenAI: ${response.type}`, response);
        }
        if (response.type === 'session.updated') {
          console.log('✅ Session updated successfully:', response);
        }

        if (response.type === 'response.audio.delta' && response.delta) {
          const audioData = {
            event: 'media',
            streamSid: streamSid,
            media: { payload: Buffer.from(response.delta, 'base64').toString('base64') }
          };
          connection.send(JSON.stringify(audioData));
        }
      } catch (error) {
        console.error('❌ Error processing OpenAI message:', error, 'Raw message:', data);
      }
    });

    connection.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        switch (data.event) {
          case 'media':
            if (openAiWs.readyState === WebSocket.OPEN) {
              const audioAppend = {
                type: 'input_audio_buffer.append',
                audio: data.media.payload
              };
              openAiWs.send(JSON.stringify(audioAppend));
            }
            break;
          case 'start':
            streamSid = data.start.streamSid;
            console.log('🎬 Stream started with SID:', streamSid);
            break;
          case 'stop':
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
      console.log('🔌 Client disconnected');
      if (openAiWs.readyState === WebSocket.OPEN) {
        openAiWs.close();
      }
    });
  });
})









// Start the server
app.listen({ port: port, }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Web Server is running on port ${port}`);
});

