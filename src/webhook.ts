import { FastifyRequest, FastifyReply } from 'fastify';

export interface WebhookEvent {
    type: string;
    data: any;
}

export async function handleWebhook(
    request: FastifyRequest<{ Body: WebhookEvent }>,
    reply: FastifyReply
) {
    const event = request.body;

    switch(event.type) {
        case 'user.created':
            console.log("New user created", event.data);
            break;
        case 'payment.success':
            break;
        default:
            console.log("Unknown event type", event.type);
            break;
    }

    return reply.status(200).send('web hook received');
} 