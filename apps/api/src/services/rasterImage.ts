import sharp from "sharp";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ValidationError } from "../errors";

export const canonicalImageName = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/;

export async function prepareRaster(file: Express.Multer.File) {
  const invalid = () => new ValidationError("Invalid or unsupported raster image", undefined, "uploadType");
  const extensions: Record<string, readonly string[]> = { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/webp": [".webp"] };
  if (!extensions[file.mimetype]?.includes(path.extname(file.originalname).toLowerCase())) throw invalid();
  // Gate signatures before invoking the decoder: SVG and other vector/document
  // loaders must never be used even when the client calls them a raster image.
  const bytes = file.buffer;
  const format = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? "png" :
    bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? "jpeg" :
    bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" ? "webp" : null;
  if (!format || file.mimetype !== `image/${format}`) throw invalid();
  if (format === "png") {
    for (let offset = 8; offset + 12 <= bytes.length;) {
      if (bytes.toString("ascii", offset + 4, offset + 8) === "acTL") throw invalid();
      offset += 12 + bytes.readUInt32BE(offset);
    }
  }
  try {
    const image = sharp(bytes, { failOn: "warning", limitInputPixels: 16000000 });
    const meta = await image.metadata();
    if (meta.format !== format || !meta.width || !meta.height || meta.width * meta.height > 16000000 || (meta.pages ?? 1) !== 1) throw invalid();
    const buffer = await image.rotate().resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true }).webp().toBuffer();
    return { buffer, mimetype: "image/webp", filename: `${randomUUID()}.webp` };
  } catch { throw invalid(); }
}
