# File Storage Implementation - Quick Start

## What Was Added

### 1. **Schema Changes** ✅
Updated Prisma schema to support images for:
- **Event**: `imageUrl`, `imagePath`
- **Judge**: `photoUrl`, `photoPath`
- **Dancer**: `photoUrl`, `photoPath`
- **Studio**: `logoUrl`, `logoPath`

Migration applied: `20260213220653_add_image_fields`

### 2. **Storage Abstraction Layer** ✅
- `src/services/storage.ts` - Interface for pluggable storage providers
- `src/services/local-storage.ts` - Free, self-hosted implementation
- Easy to swap to AWS S3 or Cloudinary later (just change one line in `index.ts`)

### 3. **File Upload Endpoints** ✅
New routes available at:
- `POST /images/events/:eventId` - Upload event image
- `POST /images/events/:eventId/judges/:judgeId` - Upload judge photo
- `POST /images/dancers/:dancerId` - Upload dancer photo
- `POST /images/studios/:studioId` - Upload studio logo

### 4. **File Serving** ✅
- Files accessible at: `http://localhost:4000/uploads/{path}`
- Automatically served by Express static middleware
- Organized in subdirectories: `events/`, `judges/`, `dancers/`, `studios/`

### 5. **Multer Integration** ✅
- Automatic file validation (type, size)
- In-memory processing (fast)
- Unique filename generation with timestamps
- Error handling for oversized files

## How to Use

### Upload Event Image via API

```bash
curl -X POST http://localhost:4000/images/events/event-123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@photo.jpg"
```

Response:
```json
{
  "success": true,
  "imageUrl": "http://localhost:4000/uploads/events/1708007652123-abc123.jpg",
  "imagePath": "events/1708007652123-abc123.jpg"
}
```

### Display Image in Frontend

```jsx
// The imageUrl is already stored in the database
<img src={event.imageUrl} alt={event.name} />
```

### Delete Image

When deleting an entity, the old image is automatically cleaned up:
```typescript
// This happens automatically in the upload endpoint
if (event.imagePath) {
  await deleteFile(event.imagePath);
}
```

## Configuration

### File Size Limit
Edit `src/middleware/file-upload.ts`:
```typescript
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // Change this (currently 10MB)
```

### Allowed File Types
Edit `src/middleware/file-upload.ts`:
```typescript
const DEFAULT_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
```

### Public URL
Set in `.env`:
```env
STORAGE_PUBLIC_URL=http://localhost:4000
# or for production
STORAGE_PUBLIC_URL=https://yourdomain.com
```

## Current Folder Structure

```
uploads/
├── events/
│   ├── 1708007652123-abc123.jpg
│   └── 1708007652124-def456.png
├── judges/
├── dancers/
└── studios/
```

## Migration to AWS S3

See [STORAGE_SETUP.md](./STORAGE_SETUP.md) for detailed instructions on migrating to AWS S3 when ready.

## Features

✅ **Free** - No cloud costs initially
✅ **Full Control** - Data on your server
✅ **Type-Safe** - Full TypeScript support
✅ **Scalable** - Easy migration to AWS S3
✅ **Error Handling** - Comprehensive validation
✅ **Automatic Cleanup** - Old files deleted when updated
✅ **Security** - Filename sanitization, access control

## Known Issues

- The project's tsconfig has a pre-existing configuration issue not related to the storage implementation
- All new storage code compiles without errors

## Testing

To test locally:

1. Start the API server: `pnpm -C apps/api dev`
2. Upload a file:
   ```bash
   curl -X POST http://localhost:4000/images/events/test-id \
     -H "Authorization: Bearer test-token" \
     -F "image=@test.jpg"
   ```
3. Check if file exists in `apps/api/uploads/events/`
4. The imageUrl will be stored in the database
