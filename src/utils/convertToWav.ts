import fs from 'fs';
import wav from 'wav';
import wavefilePkg from 'wavefile'; 
const { WaveFile } = wavefilePkg;   



export function writeMuLawToWav(mulawBase64Array: string[], outputPath: string) {
  const mulawBuffers = mulawBase64Array.map(base64 => Buffer.from(base64, 'base64'));
  const combinedBuffer = Buffer.concat(mulawBuffers);

  const wav = new WaveFile();
  wav.fromScratch(1, 8000, '8m', combinedBuffer); // '8m' = 8-bit Mu-Law
  fs.writeFileSync(outputPath, wav.toBuffer());
  console.log('✅ Wrote proper Mu-Law WAV to', outputPath);
}

export function writePCMToWav(pcmBase64Array :string[], outputFilePath:string) {
    const writer = new wav.FileWriter(outputFilePath, {
      channels: 1,
      sampleRate: 8000,
      bitDepth: 16
    });
  
    for (const base64 of pcmBase64Array) {
      const buffer = Buffer.from(base64, 'base64');
      writer.write(buffer);
    }
  
    writer.end(() => {
      console.log('✅ PCM WAV file written to', outputFilePath);
    });
  }
  
