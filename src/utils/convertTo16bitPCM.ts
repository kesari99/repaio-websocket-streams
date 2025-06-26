import alawmulaw from 'alawmulaw';
const { mulaw } = alawmulaw;
import wavefilePkg from 'wavefile'; 
const { WaveFile } = wavefilePkg; 




/**
 * Convert base64-encoded mu-law audio to PCM 16-bit LE Buffer.
 * Assumes input is 8kHz mu-law from Twilio.
 */
// utils/convertTo16bitPCM.ts
export function decodeMuLawToPCM(base64MuLaw: string): Buffer {
    const muLawBuf = Buffer.from(base64MuLaw, 'base64');
    const pcmBuf   = Buffer.alloc(muLawBuf.length * 2);  // 2 bytes per sample
  
    for (let i = 0; i < muLawBuf.length; i++) {
      // G.711 μ‑law decode
      let u = ~muLawBuf[i];                          // invert bits
      const sign     = (u & 0x80) ? -1 : 1;
      const exponent = (u >> 4) & 0x07;
      const mantissa = u & 0x0F;
      let magnitude  = ((mantissa << 4) + 0x08) << exponent;
      if (magnitude > 0x7FFF) magnitude = 0x7FFF;    // clamp
      const sample = sign * magnitude;
  
      pcmBuf.writeInt16LE(sample, i * 2);
    }
  
    return pcmBuf;   // 16‑bit PCM @8 kHz
  }
  


export function upsampleTo16kHz(pcm8k: Buffer): Buffer {
    // Interpret incoming buffer as Int16Array
    const view8k = new Int16Array(
      pcm8k.buffer,
      pcm8k.byteOffset,
      pcm8k.byteLength / 2
    );
    const outLen = view8k.length * 2 - 1;
    const view16k = new Int16Array(outLen);
  
    // For each pair of samples, copy and insert their average
    for (let i = 0; i < view8k.length - 1; i++) {
      view16k[2 * i]     = view8k[i];
      view16k[2 * i + 1] = Math.round((view8k[i] + view8k[i + 1]) / 2);
    }
    // Copy the final sample
    view16k[outLen - 1] = view8k[view8k.length - 1];
  
    return Buffer.from(view16k.buffer);
  }


  /**
 * Converts an 8-bit Mu-Law Buffer to a 16-bit signed PCM Buffer.
 */
  export function convertMuLawToPCM(muLawBuffer: Buffer): Buffer {
    const wav = new WaveFile();
    wav.fromScratch(1, 8000, '8m', muLawBuffer);
    wav.fromMuLaw();
    return Buffer.from((wav.data as any).samples);
  }


  export const upsampleLinear16bitPCM = (buffer: Buffer) => {
    const inputSamples = buffer.length / 2;
    const outputBuffer = Buffer.alloc(buffer.length * 2); // 2x samples

    for (let i = 0; i < inputSamples - 1; i++) {
        const sample1 = buffer.readInt16LE(i * 2);
        const sample2 = buffer.readInt16LE((i + 1) * 2);

        // Write original sample
        outputBuffer.writeInt16LE(sample1, i * 4);

        // Interpolate
        const interpolated = Math.floor((sample1 + sample2) / 2);
        outputBuffer.writeInt16LE(interpolated, i * 4 + 2);
    }

    // Last sample — just repeat it
    const lastSample = buffer.readInt16LE((inputSamples - 1) * 2);
    outputBuffer.writeInt16LE(lastSample, (inputSamples - 1) * 4);
    outputBuffer.writeInt16LE(lastSample, (inputSamples - 1) * 4 + 2);

    return outputBuffer;
}
