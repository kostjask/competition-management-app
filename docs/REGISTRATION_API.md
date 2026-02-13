# Registration & Invitation System - API Guide

## Overview

The system supports two registration flows:
1. **Self-Registration** - User registers themselves, then creates a studio
2. **Invitation-Based** - Admin invites users with pre-assigned roles

---

## Environment Setup

### Required Environment Variables

```env
JWT_SECRET=your-secret-key
APP_BASE_URL=http://localhost:5173
NODE_ENV=development
```

### Seed Database

Run the seed script to create test users and data:

```bash
cd apps/api
npx prisma db seed
```

This creates:
- **Admin**: `admin@test.com` / `password123`
- **Representative**: `rep@test.com` / `password123`
- **Judge**: `judge@test.com` / `password123`

---

## Flow 1: Self-Registration (User → Studio → Approval)

### Step 1.1: Register New User

**POST** `/auth/register`

```json
{
  "email": "newuser@example.com",
  "password": "SecurePass123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "message": "Registration successful. Please check your email to verify your account.",
  "userId": "clx..."
}
```

📧 **Email sent** with verification token (check console logs in dev mode)

---

### Step 1.2: Verify Email

**POST** `/auth/verify-email`

```json
{
  "token": "abc123..." 
}
```

**Response:**
```json
{
  "message": "Email verified successfully",
  "token": "eyJhbGc...",
  "tokenType": "Bearer",
  "user": {
    "id": "clx...",
    "email": "newuser@example.com",
    "name": "John Doe"
  }
}
```

✅ **User is now logged in automatically**

---

### Step 1.3: Create Studio (Requires Auth)

**POST** `/events/{eventId}/studios`

**Headers:**
```
Authorization: Bearer eyJhbGc...
```

**Body:**
```json
{
  "name": "Elite Dance Studio",
  "country": "Estonia",
  "city": "Tallinn",
  "directorName": "Anna Smith",
  "directorPhone": "+372 5555 1234",
  "representativeName": "John Doe",
  "representativeEmail": "newuser@example.com"
}
```

**Response:**
```json
{
  "id": "studio-id",
  "name": "Elite Dance Studio",
  "registrations": [{
    "status": "PENDING",
    "eventId": "test-event-2026"
  }],
  "representatives": [{
    "userId": "user-id",
    "name": "John Doe",
    "email": "newuser@example.com"
  }]
}
```

⚠️ **Studio status**: `PENDING` (awaiting admin approval)
⚠️ **User role**: None yet (will be assigned on approval)

---

### Step 1.4: Admin Approves Studio

**PATCH** `/events/{eventId}/studios/{studioId}/registration`

**Headers:**
```
Authorization: Bearer {admin-token}
```

**Body:**
```json
{
  "status": "APPROVED"
}
```

**Response:**
```json
{
  "id": "registration-id",
  "studioId": "studio-id",
  "eventId": "event-id",
  "status": "APPROVED",
  "canEditDuringReview": false
}
```

✅ **Automatic**: User is assigned `representative` role for this event

---

## Flow 2: Invitation-Based Registration

### Step 2.1: Admin Creates Invitation

**POST** `/invitations/invitations`

**Headers:**
```
Authorization: Bearer {admin-token}
```

**Body:**
```json
{
  "email": "judge@example.com",
  "roleKey": "judge",
  "eventId": "test-event-2026"
}
```

**Possible roleKey values**: `representative`, `judge`, `moderator`

**Response:**
```json
{
  "message": "Invitation sent",
  "invitationId": "inv-id",
  "token": "xyz789..."
}
```

📧 **Email sent** with invitation link (check console logs)

---

### Step 2.2: Check Invitation Validity (Optional)

**GET** `/invitations/{token}`

**No authentication required**

**Response:**
```json
{
  "email": "judge@example.com",
  "roleKey": "judge",
  "event": {
    "id": "test-event-2026",
    "name": "Winter Championship 2026"
  },
  "expiresAt": "2026-02-19T10:00:00.000Z"
}
```

---

### Step 2.3: Accept Invitation

**POST** `/invitations/accept`

**No authentication required**

**Body:**
```json
{
  "token": "xyz789...",
  "name": "Jane Smith",
  "password": "SecurePass456"
}
```

**Response:**
```json
{
  "message": "Account created successfully",
  "token": "eyJhbGc...",
  "tokenType": "Bearer",
  "user": {
    "id": "user-id",
    "email": "judge@example.com",
    "name": "Jane Smith"
  }
}
```

✅ **User created** with email pre-verified
✅ **Role assigned** automatically (judge for this event)
✅ **Auto-logged in** with JWT token

---

## Flow 3: Pre-created User Account (for Judges)

### Step 3.1: Admin Creates User (Future Feature)

This would require a new endpoint like:

**POST** `/admin/users` (not implemented yet)

```json
{
  "email": "judge2@example.com",
  "name": "Mike Johnson"
}
```

User created **without password**.

---

### Step 3.2: Admin Sends Invitation

**POST** `/invitations/invitations`

```json
{
  "email": "judge2@example.com",
  "roleKey": "judge",
  "eventId": "test-event-2026"
}
```

---

### Step 3.3: User Sets Password

**POST** `/invitations/accept`

```json
{
  "token": "invitation-token",
  "name": "Mike Johnson",
  "password": "NewPassword789"
}
```

✅ **Password added** to existing user
✅ **Role assigned**
✅ **Auto-logged in**

---

## Authentication Endpoints

### Login

**POST** `/auth/login`

```json
{
  "email": "admin@test.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "tokenType": "Bearer",
  "user": {
    "id": "user-id",
    "email": "admin@test.com",
    "name": "Admin User"
  }
}
```

---

### Get Current User

**GET** `/auth/profile`

**Headers:**
```
Authorization: Bearer eyJhbGc...
```

**Response:**
```json
{
  "id": "user-id",
  "email": "admin@test.com",
  "name": "Admin User",
  "createdAt": "2026-02-10T10:00:00.000Z",
  "roles": [
    {
      "id": "role-id",
      "userId": "user-id",
      "roleId": "admin-role-id",
      "eventId": null,
      "role": {
        "key": "admin",
        "name": "Administrator"
      },
      "event": null
    }
  ],
  "isAdmin": true
}
```

---

## Admin Endpoints

### List All Invitations

**GET** `/invitations/invitations`

**Headers:**
```
Authorization: Bearer {admin-token}
```

**Response:**
```json
[
  {
    "id": "inv-id",
    "email": "judge@example.com",
    "roleKey": "judge",
    "eventId": "event-id",
    "token": "xyz...",
    "expiresAt": "2026-02-19T10:00:00.000Z",
    "usedAt": null,
    "event": {
      "id": "test-event-2026",
      "name": "Winter Championship 2026"
    },
    "creator": {
      "id": "admin-id",
      "name": "Admin User",
      "email": "admin@test.com"
    }
  }
]
```

---

### List Studios for Event

**GET** `/events/{eventId}/studios`

**Headers:**
```
Authorization: Bearer {token}
```

- **Admin**: Sees all studios
- **Representative**: Only sees their own studios

---

## Testing with cURL

### Example: Complete Self-Registration Flow

```bash
# 1. Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'

# 2. Verify email (get token from console logs)
curl -X POST http://localhost:3000/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token": "TOKEN_FROM_EMAIL"}'

# Save the returned token
TOKEN="eyJhbGc..."

# 3. Create studio
curl -X POST http://localhost:3000/events/test-event-2026/studios \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "My Dance Studio",
    "representativeName": "Test User",
    "representativeEmail": "test@example.com"
  }'

# 4. Admin approves (use admin token from seed)
ADMIN_TOKEN="TOKEN_FROM_SEED_OUTPUT"
curl -X PATCH http://localhost:3000/events/test-event-2026/studios/STUDIO_ID/registration \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"status": "APPROVED"}'
```

---

## Error Handling

All errors follow this format:

```json
{
  "error": "Error message",
  "statusCode": 400,
  "details": {
    "issues": [...]
  }
}
```

### Common Error Codes

- `400` - Validation error or bad request
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Resource not found
- `409` - Conflict (duplicate email, etc.)

---

## Next Steps

1. **Email Service**: Integrate real email provider (SendGrid, AWS SES, etc.)
2. **Frontend Integration**: Build UI for registration and invitation flows
3. **Admin User Creation**: Add endpoint for admins to pre-create user accounts
4. **Invitation Resend**: Allow admins to resend expired invitations
5. **Password Reset**: Implement forgot password flow

---

## Security Notes

- JWT tokens expire in 7 days
- Verification tokens are single-use
- Invitation tokens expire in 7 days
- All passwords are hashed with bcrypt (10 rounds)
- Email verification required for self-registration
- Invitation-based registration bypasses email verification
