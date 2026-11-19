const { test } = require('node:test');
const assert = require('node:assert/strict');
const { inspectMusic } = require('../dist/services/musicAudio.js');
function wav(samples = 8000) {
  const data = Buffer.alloc(44 + samples * 2);
  data.write('RIFF'); data.writeUInt32LE(data.length - 8, 4); data.write('WAVEfmt ', 8); data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22); data.writeUInt32LE(8000, 24); data.writeUInt32LE(16000, 28);
  data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(samples * 2, 40); return data;
}
test('audio content determines type and duration; malformed or compressed WAV cannot enter storage', () => {
  assert.deepEqual(inspectMusic(wav()), { detectedMime: 'audio/wav', durationMs: 1000 });
  for (const bytes of [Buffer.from('<html>music</html>'), Buffer.alloc(0), wav().subarray(0, 100)]) assert.throws(() => inspectMusic(bytes));
  for (const [offset, value] of [[20, 3], [22, 3], [28, 4], [32, 1], [40, 999999]]) { const bytes = wav(); bytes.writeUInt16LE(value & 65535, offset); assert.throws(() => inspectMusic(bytes)); }
  const padded = Buffer.concat([wav(), Buffer.from('<script>')]); assert.throws(() => inspectMusic(padded));
  const highBitMagic = wav(); highBitMagic[0] |= 128; assert.throws(() => inspectMusic(highBitMagic), 'Container signatures must match exact bytes, not masked ASCII');
});
test('MP3 duration follows complete layer III frames, including variable bitrates; truncation and huge tags fail', () => {
  const frame = Buffer.alloc(417); frame.writeUInt32BE(0xfffb9000); const next = Buffer.alloc(522); next.writeUInt32BE(0xfffba000);
  const mp3 = Buffer.concat([frame, next]); assert.deepEqual(inspectMusic(mp3), { detectedMime: 'audio/mpeg', durationMs: 53 });
  assert.throws(() => inspectMusic(mp3.subarray(0, -1))); assert.throws(() => inspectMusic(frame));
  const tag = Buffer.from([73,68,51,4,0,0,127,127,127,127]); assert.throws(() => inspectMusic(Buffer.concat([tag, mp3])));
});
