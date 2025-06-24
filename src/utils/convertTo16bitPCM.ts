import alawmulaw from 'alawmulaw';
const { mulaw } = alawmulaw;
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
  

/**
 * Upsample PCM 8kHz to 16kHz by sample duplication.
 * Simple approach for real-time compatibility.
 */
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
  const pcmBuffer = Buffer.alloc(muLawBuffer.length * 2); // Each PCM sample is 2 bytes

  for (let i = 0; i < muLawBuffer.length; i++) {
    const muLawByte = muLawBuffer[i]; // get single 8-bit sample
    const pcmSample = mulaw.decode(Uint8Array.from([muLawByte]))[0];
    pcmBuffer.writeInt16LE(pcmSample, i * 2); // write 2-byte PCM sample
  }

  return pcmBuffer;
}