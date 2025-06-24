import { EventEmitter } from "events";
import WebSocket from 'ws';
import dotenv from 'dotenv';
import { createClient, LiveClient, LiveTranscriptionEvents } from "@deepgram/sdk";
dotenv.config();

interface TranscriptData {
    channel?: {
        alternatives?: Array<{
            transcript: string;
            confidence: number;
            words: string[]
        }>;
    };
    type?: string;
    is_final?: boolean;
    speech_final?: boolean;
}




class DeepgramTranscriber extends EventEmitter {

    #label: string;
    #language: string;
    #apiKey: string;
    #deepgram: ReturnType<typeof createClient>;
    #connection: LiveClient | null;
    #isConnected: boolean;
    #encoding: string;
    #sampleRate: number;




    constructor(language: string, encoding: string, sampleRate: number, label: string) {
        super();
        this.#label = label;
        this.#language = language;
        this.#apiKey = process.env.DEEPGRAM_API_KEY!;
        if (!this.#apiKey) {
            throw new Error('DEEPGRAM_API_KEY environment variable is required');
        }
        this.#deepgram = createClient(this.#apiKey);
        this.#connection = null;
        this.#isConnected = false;
        this.#encoding = encoding;
        this.#sampleRate = sampleRate;

    }


    #startStream(): void {



        this.#setUpEventListeners();



    }

    #setUpEventListeners(): void {

        if (!this.#connection) {
            return;
        }


        this.#connection
            .on(LiveTranscriptionEvents.Open, () => {
                console.log(`[${this.#label}] ✅ Deepgram connection opened. Ready state:`, this.#connection?.getReadyState());
            })
            .on(LiveTranscriptionEvents.Transcript, (data: TranscriptData) => {
                if (data.is_final) {
                    const text = data.channel?.alternatives?.[0]?.transcript || "";
    
                    console.log(`[${this.#label}] 📝 Transcript:`, text);
                    this.emit('transcript', text);
                }
            })
            .on(LiveTranscriptionEvents.Close, (code, reason) => {
                this.#isConnected = false;
                console.log(`[${this.#label}] ❌ Connection closed:`, code, reason);
            })
            .on(LiveTranscriptionEvents.Error, (err) => {
                this.#isConnected = false;
                console.error(`[${this.#label}] ⚠️ Error:`, err.message);
            })



    }





    sendAudioData(audioBuffer: Buffer): void {

        if (this.#connection?.getReadyState() === 1) {

            // console.log("Sending audio data to Deepgram");
            this.#connection?.send(audioBuffer);
        }


        // console.log('🎧 Sent audio buffer to Deepgram');


    }



    start(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.#connection = this.#deepgram.listen.live({
                // model: "nova-3",
                // language: "multi",
                encoding: this.#encoding,
                sample_rate: this.#sampleRate,
                punctuate: true,
                interim_results: true,
                // endpointing: 1000,
                // smart_format: true,
            });

            if (!this.#connection) {
                return reject(new Error("Failed to create Deepgram live connection"));
            }

            // Call this to attach all event listeners (transcript, close, error, etc.)
            this.#startStream();

            this.#connection.on(LiveTranscriptionEvents.Open, () => {
                this.#isConnected = true;
                console.log("✅ Deepgram connection opened");
                resolve();
            });

            this.#connection.on(LiveTranscriptionEvents.Error, (err) => {
                this.#isConnected = false;
                console.error("❌ Deepgram error:", err.message);
                reject(err);
            });
        });
    }


    stop(): void {

        this.#isConnected = false;
    }

    isConnected(): boolean {
        return this.#isConnected;
    }

}


export default DeepgramTranscriber;


