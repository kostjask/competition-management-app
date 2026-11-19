import { ValidationError } from "../errors";

const invalid = () => new ValidationError("Invalid or unsupported audio content", undefined, "uploadType");
/** Bounded, linear parsers. No codecs, subprocesses, metadata evaluation or network access. */
export function inspectMusic(bytes: Buffer): { detectedMime: "audio/wav" | "audio/mpeg"; durationMs: number } {
  // latin1 preserves every byte; Node's ASCII decoder masks high bits.
  if (bytes.length >= 44 && bytes.toString("latin1", 0, 4) === "RIFF" && bytes.toString("latin1", 8, 12) === "WAVE") {
    if (bytes.readUInt32LE(4) + 8 !== bytes.length) throw invalid();
    let offset = 12; let rate = 0; let align = 0; let size = 0; let format = false; let data = false;
    while (offset < bytes.length) {
      if (offset + 8 > bytes.length) throw invalid();
      const kind = bytes.toString("latin1", offset, offset + 4); const length = bytes.readUInt32LE(offset + 4); offset += 8;
      if (offset + length > bytes.length) throw invalid();
      if (kind === "fmt ") {
        if (format || length !== 16 || bytes.readUInt16LE(offset) !== 1) throw invalid();
        format = true; const channels = bytes.readUInt16LE(offset + 2); const sampleRate = bytes.readUInt32LE(offset + 4); const bits = bytes.readUInt16LE(offset + 14);
        align = channels * bits / 8; rate = bytes.readUInt32LE(offset + 8);
        if (![1, 2].includes(channels) || ![16, 24, 32].includes(bits) || sampleRate < 8000 || sampleRate > 192000 || rate !== sampleRate * align || bytes.readUInt16LE(offset + 12) !== align) throw invalid();
      }
      if (kind === "data") { if (data || !format || !length || length % align) throw invalid(); data = true; size = length; }
      offset += length + length % 2;
    }
    if (!format || !data || offset !== bytes.length) throw invalid();
    return { detectedMime: "audio/wav", durationMs: Math.ceil(size / rate * 1000) };
  }
  let offset = 0;
  if (bytes.toString("latin1", 0, 3) === "ID3") {
    if (bytes.length < 10 || ![3, 4].includes(bytes.readUInt8(3)) || (bytes.readUInt8(5) & 0x1f) || [6, 7, 8, 9].some(i => bytes.readUInt8(i) > 127)) throw invalid();
    const length = bytes.readUInt8(6) * 2097152 + bytes.readUInt8(7) * 16384 + bytes.readUInt8(8) * 128 + bytes.readUInt8(9);
    if (length > 1048576) throw invalid(); offset = 10 + length + ((bytes.readUInt8(5) & 0x10) ? 10 : 0);
  }
  let duration = 0; let frames = 0; let identity = "";
  while (offset < bytes.length) {
    if (bytes.length - offset === 128 && bytes.toString("latin1", offset, offset + 3) === "TAG") { offset += 128; break; }
    if (offset + 4 > bytes.length) throw invalid();
    const header = bytes.readUInt32BE(offset); const version = (header >>> 19) & 3; const layer = (header >>> 17) & 3;
    const bitrateIndex = (header >>> 12) & 15; const sampleIndex = (header >>> 10) & 3;
    if ((header >>> 21) !== 2047 || version === 1 || layer !== 1 || bitrateIndex === 0 || bitrateIndex === 15 || sampleIndex === 3) throw invalid();
    const sampleRate = ([44100, 48000, 32000][sampleIndex] ?? 0) / (version === 3 ? 1 : version === 2 ? 2 : 4);
    const bitrate = ((version === 3 ? [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320] : [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160])[bitrateIndex] ?? 0) * 1000;
    const nextIdentity = `${version}:${sampleRate}`;
    if (identity && identity !== nextIdentity) throw invalid(); identity = nextIdentity;
    const length = Math.floor((version === 3 ? 144 : 72) * bitrate / sampleRate) + ((header >>> 9) & 1);
    if (length < 24 || offset + length > bytes.length) throw invalid();
    duration += (version === 3 ? 1152 : 576) / sampleRate * 1000; frames++; offset += length;
  }
  if (frames < 2 || offset !== bytes.length) throw invalid();
  return { detectedMime: "audio/mpeg", durationMs: Math.ceil(duration) };
}
