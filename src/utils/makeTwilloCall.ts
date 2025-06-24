import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER!;

const client = twilio(accountSid, authToken);

export async function makeTwilloCall(toPhoneNumber: string) {
  const twilioWebsocketUrl = `wss://dingo-suitable-accurately.ngrok-free.app/media-stream`;

  return client.calls.create({
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
}
