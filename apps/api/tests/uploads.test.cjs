const assert = require('node:assert/strict');
const { once } = require('node:events');
const { test } = require('node:test');
const express = require('express');
const { createFileUploadMiddleware } = require('../dist/middleware/file-upload.js');

async function upload(t, { type = 'image/png', size = 8, field = 'image' } = {}) {
  const app = express();
  app.post('/upload', createFileUploadMiddleware({ fieldName: 'image', maxSize: 32 }), (req, res) => {
    res.json({ size: req.file?.size, buffered: Buffer.isBuffer(req.file?.buffer), type: req.file?.mimetype });
  });
  app.use(require('../dist/errors/handler.js').errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  const form = new FormData();
  form.set(field, new Blob([new Uint8Array(size)], { type }), 'fixture.png');
  const response = await fetch(`http://127.0.0.1:${server.address().port}/upload`, {
    method: 'POST', body: form, signal: AbortSignal.timeout(5000),
  });
  return { status: response.status, body: await response.json() };
}

test('multipart image uploads retain their memory buffer with Multer 2', async (t) => {
  const response = await upload(t);
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { size: 8, buffered: true, type: 'image/png' });
});

test('multipart uploads retain file-size limits', async (t) => {
  const response = await upload(t, { size: 64 });
  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'File too large');
});

test('multipart uploads retain MIME filtering', async (t) => {
  const response = await upload(t, { type: 'text/plain' });
  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'File upload error');
});

test('multipart uploads reject unexpected file fields', async (t) => {
  const response = await upload(t, { field: 'other' });
  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'File upload error');
});
