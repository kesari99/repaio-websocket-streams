import fastify from 'fastify';
import fastifyFormBody from '@fastify/formbody';
import fastifyWs from '@fastify/websocket';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import twilio from 'twilio';
import { registerMediaStream } from './websockets/mediastreamHandler.js';
import { callRoutes } from './routes/callRoutes.js';
import DeepgramTranscriber from './stt/deepgram-transcriber.js';
import SarvamTranscriber from './stt/sarvam-transcriber.js';

// Load environment variables first
dotenv.config();


const port : number = Number(process.env.PORT) || 8080;

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// Function to create outbound call


// Initialize fastify app
const app = fastify();
app.register(fastifyFormBody)
app.register(fastifyWs)

const transcriberMap = new Map<string, DeepgramTranscriber | SarvamTranscriber  >();



// const server = createServer(app.server);
// setUpWebSocket(server);

app.get('/', (req, res) => {
  res.send('Hello World! Twillo server with WebSocket is configured.');
})

app.register(callRoutes);


// Example using Express
app.get('/plivo-answer', (req, res) => {
  const response = `
    <Response>
  <Connect>
              <Stream url="wss://dingo-suitable-accurately.ngrok-free.app/media-stream"/>
          </Connect>
          <Pause length="3600"/>    </Response>
  `;
  return res
    .header('Content-Type', 'text/xml')
    .send(response);
});


app.get('/incomming-call', async(req, res) => {
   console.log('req.headers.host', req.headers.host, req.body);
    return  res.send('Hello World! Twillo server with WebSocket is configured.');  
})


app.register( async function(app)  {
  await registerMediaStream(app, (streamSid: string) => transcriberMap.get(streamSid) || null);
})


export function registerTranscriber(streamSid: string, transcriber: DeepgramTranscriber | SarvamTranscriber) {
  transcriberMap.set(streamSid, transcriber);
}









// Start the server
app.listen({ port: port, }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Web Server is running on port ${port}`);
});

