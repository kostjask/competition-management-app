const assert = require('node:assert/strict');
const { test } = require('node:test');
const sharp = require('sharp');
const { prepareRaster, canonicalImageName } = require('../dist/services/rasterImage.js');

const file = (buffer, mimetype = 'image/png', originalname = 'fixture.png') => ({ buffer, mimetype, originalname });
test('raster validation decodes supported formats, bounds output and strips private metadata', async () => {
  for (const format of ['png', 'jpeg', 'webp']) {
    const input = await sharp({ create: { width: 2200, height: 2, channels: 3, background: 'red' } })
      .withExif({ IFD0: { Artist: 'Synthetic private metadata' } }).toFormat(format).toBuffer();
    const image = await prepareRaster(file(input, 'image/' + format, 'fixture.' + format));
    assert.match(image.filename, canonicalImageName); assert.equal(image.mimetype, 'image/webp');
    const metadata = await sharp(image.buffer).metadata();
    assert.equal(metadata.format, 'webp'); assert.ok(metadata.width <= 2048);
    assert.equal(metadata.exif, undefined); assert.equal(metadata.icc, undefined);
    assert.equal(image.buffer.includes(Buffer.from('Synthetic private metadata')), false);
  }
});
test('raster validation rejects active content, mismatches, corruption, animation and pixel bombs', async () => {
  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: 'red' } }).png().toBuffer();
  const huge = await sharp({ create: { width: 4001, height: 4000, channels: 3, background: 'red' } }).png().toBuffer();
  const animated = await sharp({ create: { width: 2, height: 4, channels: 3, background: 'red' } }).raw().toBuffer();
  animated.fill(0, 12);
  const webp = await sharp(animated, { raw: { width: 2, height: 4, channels: 3, pageHeight: 2 } }).webp({ delay: [100, 100] }).toBuffer();
  assert.equal((await sharp(webp).metadata()).pages, 2);
  const apng = Buffer.concat([png.subarray(0, 8), Buffer.from([0,0,0,0,97,99,84,76,0,0,0,0]), png.subarray(8)]);
  for (const bad of [
    file(Buffer.from('<html><script>active()</script></html>')),
    file(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>active()</script></svg>')),
    file(Buffer.from('RIFF')), file(png, 'image/jpeg', 'fixture.jpg'),
    file(png, 'image/png', 'fixture.html'), file(png.subarray(0, 35)),
    file(huge), file(apng), file(webp, 'image/webp', 'animation.webp'),
  ]) await assert.rejects(prepareRaster(bad), error => error.reason === 'uploadType');
});
