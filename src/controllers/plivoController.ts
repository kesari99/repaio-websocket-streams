import plivo from "plivo";

export async function createPlivoCallHandler(request: any, reply: any) {
  try {
    const accountSid = process.env.PLIVO_ACCOUNT_SID;
    const authToken = process.env.PLIVO_AUTH_TOKEN;
    const fromPhoneNumber = process.env.PLIVO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromPhoneNumber) {
      return reply.status(500).send({
        error: "Missing PLIVO credentials",
      });
    }

    const client = new plivo.Client(accountSid, authToken);
    const toPhoneNumber = "+919381756966";

    const response = await client.calls.create(
      fromPhoneNumber,
      toPhoneNumber,
      "https://dingo-suitable-accurately.ngrok-free.app/plivo-answer",
      {
        answerMethod: "GET",
      },
    );

    return reply.status(200).send(response);
  } catch (error) {
    console.error("Error creating call:", error);
    return reply
      .status(500)
      .send({ error: "Failed to create call", details: error });
  }
}