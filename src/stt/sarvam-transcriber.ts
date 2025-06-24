import { EventEmitter } from 'events';
import WebSocket, { WebSocket as WSClient } from 'ws';

interface TranscriptData {
    data: {
        request_id: string;
        transcript: string;
        timestamps: null;
        diarized_code: string;
        metrics: { audio_duration: number, processing_latency: number }

    },
    is_final: boolean;
    confidence: number;
    speaker?: string
}


class SarvamTranscriber extends EventEmitter {

    #language: string;
    #ws: WSClient | null;
    #apiKey: string;
    #isConnected: boolean = false;


    constructor(language: string) {
        super();
        this.#language = language;
        this.#ws = null;
        this.#apiKey = process.env.SARVAM_API_KEY!;

        if (!this.#apiKey) {
            throw new Error('SARVAM_API_KEY environment variable is required');
        }
    }


    #startStream(): void {

        this.#setUpEventListeners();
    }


    #setUpEventListeners(): void {
        if (!this.#ws) {
            return;
        }

        this.#ws.on('open', () => {
            console.log("✅ Sarvam STT connection opened");
            this.#isConnected = true;
            this.emit('connected');
        });

        this.#ws.on('message', (data: TranscriptData) => {
            try {
                if (data.is_final) {
                    const text = data.data.transcript;
                    console.log("� Transcribed text:", text);
                    this.emit('transcript', text);
                }


            } catch (error) {
                console.error("❌ Error parsing transcript data:", error);
                this.emit('error', error);
            }
        });

        this.#ws.on('error', (error) => {
            console.error("❌ WebSocket error:", error);
            this.#isConnected = false;
            this.emit('error', error);
        });

        this.#ws.on('close', (code, reason) => {
            console.log(`🔌 WebSocket closed: ${code} - ${JSON.parse(reason.toString())}`);
            this.#isConnected = false;
            this.emit('disconnected', { code, reason });
        });
    }







    sendAudioData(audioBuffer: Buffer): void {
        if (!this.#ws) {
            console.error("❌ WebSocket not initialized. Call start() first.");
            return;
        }


        if (this.#ws.readyState === WebSocket.OPEN) {

            const message = {
                audio: {
                    data: audioBuffer.toString('base64'),
                    encoding: "audio/wav",
                    sample_rate: 16000
                }
            };

            this.#ws.send(JSON.stringify(message));
            // console.log("🎧 Sent upsampled PCM16 audio to Sarvam");
        } else {
            console.error(`❌ WebSocket not ready. State: ${this.#ws.readyState}`);
        }
    }



    start(): Promise<void> {
        return new Promise((resolve, reject) => {
            const wsUrl = `wss://api.sarvam.ai/speech-to-text/ws?language-code=${this.#language}`;
            console.log(`🔗 Connecting to Sarvam WebSocket: ${wsUrl}`);
            console.log(`🔑 API Key: ${this.#apiKey}`);

            this.#ws = new WebSocket(wsUrl, {
                headers: {
                    'api-subscription-key': this.#apiKey,
                },
            });

            this.#ws.once('open', () => {
                console.log("🔗 Sarvam WebSocket opened");
                this.#isConnected = true;
                this.#startStream(); // set up event listeners AFTER it opens
                this.emit('connected');
                resolve();
            });

            this.#ws.once('error', (err) => {
                console.error("❌ WebSocket error:", err);
                this.#isConnected = false;
                reject(err);
            });

            this.#ws.once('close', (code, reason) => {
                console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
                this.#isConnected = false;
                reject(new Error(`WebSocket closed: ${code} - ${reason}`));
            });
        });
    }


    stop(): void {
        if (this.#ws) {
            this.#ws.close();
            this.#ws = null;
            this.#isConnected = false;
        }
    }

    isConnected(): boolean {
        return this.#isConnected;
    }
}

export default SarvamTranscriber;