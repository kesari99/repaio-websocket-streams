import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const client = twilio(accountSid, authToken);

export async function createTwilloCallHandler(request: any, reply: any) {



  try {






    const twilioWebsocketUrl = `wss://dingo-suitable-accurately.ngrok-free.app/media-stream`;
    const toPhoneNumber = "+919381756966";
    const fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER!;






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
    reply.send({ sid: call.sid });
  } catch (error) {
    console.error('Error creating call:', error);
    reply.status(500).send({ error: 'Failed to create call', details: error });
  }
}
