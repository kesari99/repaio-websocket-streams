import { Server as HTTPServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';


export function setUpWebSocket(server: HTTPServer) {

    const wss = new WebSocketServer({server});

    wss.on('connection', (ws) => {
            console.log('Client Connected')

            ws.on('message', (message) => {
                console.log('Received: %s', message.toString());
                ws.send('Server Recieved the message');
            })

        ws.on('close', () => {
            console.log('❌ Client disconnected');
        });


    })

    console.log('✅ WebSocket server initialized');


}