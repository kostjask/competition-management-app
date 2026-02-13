# File Storage Implementation Guide

This guide explains the file storage system for the dance competition app and how to migrate to AWS S3 in the future.

## Overview

The app uses an **abstraction layer** for file storage, allowing you to:
- Start with **free, self-hosted local storage**
- Easily migrate to **AWS S3** or other cloud providers **without changing business logic**

## Current Implementation: Local Storage

### Architecture

```
Storage Service Interface (abstraction)
    ↓
LocalStorageService (current implementation)
    ↓
Server filesystem (uploads/)
```

### File Structure

Uploaded files are organized by type:
```
uploads/
├── events/          # Event images
├── judges/          # Judge photos
├── dancers/         # Dancer photos
└── studios/         # Studio logos
```

### How It Works

1. **File Upload**: Client sends multipart form data
2. **Validation**: Check file type and size
3. **Storage**: Save to local filesystem with unique name
4. **Database**: Store path and public URL in database
5. **Serving**: Files accessed via `/uploads/{path}` endpoint

## API Endpoints

### Upload Event Image
```bash
POST /images/events/:eventId
Content-Type: multipart/form-data

Field: "image" (file)
```

Response:
```json
{
  "success": true,
  "imageUrl": "http://localhost:4000/uploads/events/1708007652123-abc123.png",
  "imagePath": "events/1708007652123-abc123.png"
}
```

### Upload Judge Photo
```bash
POST /images/events/:eventId/judges/:judgeId
Content-Type: multipart/form-data

Field: "photo" (file)
```

### Upload Dancer Photo
```bash
POST /images/dancers/:dancerId
Content-Type: multipart/form-data

Field: "photo" (file)
```

### Upload Studio Logo
```bash
POST /images/studios/:studioId
Content-Type: multipart/form-data

Field: "logo" (file)
```

## Configuration

### Environment Variables

```env
# Public URL for serving files (default: http://localhost:4000)
STORAGE_PUBLIC_URL=http://localhost:4000
```

### File Size Limits

Default: **10MB** per file

To change, update `DEFAULT_MAX_SIZE` in `src/middleware/file-upload.ts`:
```typescript
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
```

### Allowed File Types

Default: `image/jpeg`, `image/png`, `image/webp`

To change, update `DEFAULT_ALLOWED_TYPES` in `src/middleware/file-upload.ts`:
```typescript
const DEFAULT_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
```

## Migration to AWS S3

### Step 1: Create AWS S3 Service Implementation

Create `src/services/aws-s3-storage.ts`:

```typescript
import AWS from "aws-sdk";
import { StorageProvider } from "./storage";

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

export class AwsS3StorageService implements StorageProvider {
  private bucketName = process.env.AWS_S3_BUCKET!;

  async uploadFile(
    file: { buffer: Buffer; mimetype: string },
    directory: string,
    filename: string,
  ): Promise<string> {
    const key = `${directory}/${filename}`;
    
    const params = {
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: "public-read" as const,
    };

    const result = await s3.upload(params).promise();
    return key; // Return path (not full URL)
  }

  async deleteFile(filePath: string): Promise<void> {
    if (!filePath) return;

    const params = {
      Bucket: this.bucketName,
      Key: filePath,
    };

    await s3.deleteObject(params).promise();
  }

  getFileUrl(filePath: string): string {
    if (!filePath) return "";
    const bucketRegion = process.env.AWS_REGION || "us-east-1";
    return `https://${this.bucketName}.s3.${bucketRegion}.amazonaws.com/${filePath}`;
  }
}
```

### Step 2: Install AWS SDK

```bash
pnpm add -D @types/aws-sdk
pnpm add aws-sdk
```

### Step 3: Add Environment Variables

```env
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
```

### Step 4: Switch Provider in index.ts

Simply change one line in `src/index.ts`:

```typescript
// Before (local storage)
import { LocalStorageService } from "./services/local-storage";
setStorageProvider(new LocalStorageService());

// After (AWS S3)
import { AwsS3StorageService } from "./services/aws-s3-storage";
setStorageProvider(new AwsS3StorageService());
```

That's it! **No other code changes needed** because everything uses the `StorageProvider` interface.

## Database Schema

Images are stored as two fields per entity:

```prisma
model Event {
  imageUrl    String?  // Public URL for display
  imagePath   String?  // Path/key for storage operations
}

model Judge {
  photoUrl    String?
  photoPath   String?
}

model Dancer {
  photoUrl    String?
  photoPath   String?
}

model Studio {
  logoUrl     String?
  logoPath    String?
}
```

## Security Considerations

### Current (Local Storage)

- ✅ Files accessible only on your server
- ✅ Full control over data
- ⚠️ Must manage backups manually
- ⚠️ No automatic CDN/compression

### AWS S3

- ✅ Geographically distributed
- ✅ Automatic backups
- ✅ CDN integration possible
- ⚠️ Costs scale with usage
- ⚠️ Must configure bucket policies

### Best Practices

1. **Validate file types** - Only allow images
2. **Sanitize filenames** - Already done via `generateUniqueFilename()`
3. **Size limits** - Enforce maximum file size
4. **Access control** - Only authenticated users can upload
5. **Clean old files** - Delete when deleting entities

## Troubleshooting

### "uploads" directory not found

The directory is created automatically on first upload. If you need to pre-create it:

```bash
mkdir -p apps/api/uploads
```

### Files not serving

Check:
1. Is Express static middleware active? ✓ (configured in index.ts)
2. Is path correct? Check browser DevTools Network tab
3. Is file actually in `uploads/` folder?

### Out of disk space

Monitor your server storage and implement cleanup:

```typescript
// Delete old files after 30 days (example)
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const oldFiles = await prisma.event.findMany({
  where: {
    imagePath: { not: null },
    updatedAt: { lt: thirtyDaysAgo },
  },
});

for (const event of oldFiles) {
  if (event.imagePath) {
    await deleteFile(event.imagePath);
  }
}
```

## Cost Estimation

### AWS S3 (rough estimates, 2024)

| Usage                 | Monthly Cost |
| --------------------- | ------------ |
| 1,000 uploads/month   | $0.30        |
| 100 GB storage        | $2.30        |
| 10 GB bandwidth (out) | $0.85        |
| **Total**             | ~$3-5        |

### Local Storage

- **Hosting**: Included in your server cost
- **Bandwidth**: Included in your server cost
- **Storage**: Limited by server disk space

Local storage is free until you outgrow your server capacity.

## Next Steps

1. Test file uploads with the current local storage
2. Monitor disk usage
3. When ready to scale, follow the AWS S3 migration steps
4. Consider implementing image optimization (resizing, compression) at that time
