import plivo from 'plivo';
import dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.PLIVO_ACCOUNT_SID!;
const authToken = process.env.PLIVO_AUTH_TOKEN!;
const client = new plivo.Client(accountSid, authToken);

export async function createPlivoCallHandler(request: any, reply: any) {
  try {
    const plivoWebsocketUrl = `wss://dingo-suitable-accurately.ngrok-free.app/media-stream-plivo`;
    const toPhoneNumber = "+919381756966";
    const fromPhoneNumber = process.env.PLIVO_PHONE_NUMBER!;


    const call = await client.calls.create(
        fromPhoneNumber,
        toPhoneNumber,
        'https://dingo-suitable-accurately.ngrok-free.app/plivo-answer',
        {
            answerMethod: "GET",
        },

    
    ).then(function(response) {
            console.log(response);
        }).catch(function(error) {
            console.error(error);
        });
  } catch (error) {
    console.error('Error creating call:', error);
    reply.status(500).send({ error: 'Failed to create call', details: error });
  }
}