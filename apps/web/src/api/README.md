# API Client Layer

Type-safe HTTP client for the Dance Competition App with automatic JWT token management and error handling.

## Features

- ✅ **Type-safe requests and responses** using TypeScript
- ✅ **Automatic JWT token injection** from localStorage
- ✅ **401/403 error handling** with automatic redirect to login
- ✅ **Structured error handling** with ApiError class
- ✅ **React hooks** for common API patterns
- ✅ **Zero dependencies** (uses native fetch API)

## Configuration

Create a `.env` file in the web app root:

```env
VITE_API_URL=http://localhost:3000
```

## Basic Usage

### Authentication

```typescript
import { login, register, logout, getCurrentUser } from './api/auth';

// Register new user
const authResponse = await register({
  email: 'user@example.com',
  name: 'John Doe',
  password: 'password123'
});

// Login
const loginResponse = await login({
  email: 'user@example.com',
  password: 'password123'
});

// Get current user profile
const user = await getCurrentUser();

// Logout
logout();
```

### Direct API Client Usage

```typescript
import { apiClient } from './api/client';

// GET request
const events = await apiClient.get('/events');

// POST request
const newEvent = await apiClient.post('/events', {
  name: 'Spring Dance Competition',
  date: '2026-05-15'
});

// PUT request
const updated = await apiClient.put('/events/123', {
  name: 'Updated Event Name'
});

// DELETE request
await apiClient.delete('/events/123');
```

### With Type Safety

```typescript
import { apiClient, type AuthResponse } from './api';

interface Event {
  id: string;
  name: string;
  date: string;
}

// Type-safe GET
const events = await apiClient.get<Event[]>('/events');

// Type-safe POST with request body typing
const newEvent = await apiClient.post<Event, Partial<Event>>(
  '/events',
  { name: 'New Event', date: '2026-06-01' }
);
```

## React Hooks

### useFetch - Fetch data on component mount

```typescript
import { useFetch } from './api/hooks';
import { getCurrentUser } from './api/auth';

function UserProfile() {
  const { data: user, loading, error } = useFetch(getCurrentUser);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!user) return null;

  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

### useApiCall - For mutations and manual API calls

```typescript
import { useApiCall } from './api/hooks';
import { login } from './api/auth';
import { useState } from 'react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { loading, error, execute: doLogin } = useApiCall(login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await doLogin({ email, password });
      // Redirect to dashboard on success
      window.location.href = '/dashboard';
    } catch (err) {
      // Error is already captured in state
      console.error('Login failed:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

## Error Handling

The client throws `ApiError` instances with structured error information:

```typescript
import { ApiError } from './api/client';

try {
  const user = await getCurrentUser();
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`Error ${error.statusCode}: ${error.message}`);
    console.error('Details:', error.details);
  }
}
```

### Error Types

- **401 Unauthorized**: Automatically redirects to login and clears token
- **403 Forbidden**: Permission denied error
- **404 Not Found**: Resource not found
- **400 Bad Request**: Validation errors (with details)
- **500 Server Error**: Internal server error
- **Network Error**: Connection issues

## Token Management

```typescript
import { getToken, setToken, removeToken } from './api/client';

// Manually get token
const token = getToken();

// Manually set token (usually handled by auth methods)
setToken('your-jwt-token');

// Clear token
removeToken();
```

## Creating New API Modules

Follow the pattern in the existing modules to create organized API resources:

```typescript
// api/dancers.ts
import { apiClient } from './client';

export interface Dancer {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
}

export interface CreateDancerRequest {
  firstName: string;
  lastName: string;
  birthDate: string;
}

export const getDancers = (studioId: string): Promise<Dancer[]> => {
  return apiClient.get<Dancer[]>(`/studios/${studioId}/dancers`);
};

export const createDancer = (
  studioId: string,
  body: CreateDancerRequest
): Promise<Dancer> => {
  return apiClient.post<Dancer, CreateDancerRequest>(
    `/studios/${studioId}/dancers`,
    body
  );
};

export const updateDancer = (
  studioId: string,
  dancerId: string,
  body: Partial<CreateDancerRequest>
): Promise<Dancer> => {
  return apiClient.patch<Dancer, Partial<CreateDancerRequest>>(
    `/studios/${studioId}/dancers/${dancerId}`,
    body
  );
};

export const deleteDancer = (studioId: string, dancerId: string): Promise<void> => {
  return apiClient.delete<void>(`/studios/${studioId}/dancers/${dancerId}`);
};
```

Then export from `index.ts`:

```typescript
export * from './dancers.js';
```

## Architecture

```
apps/web/src/api/
├── client.ts         # Core HTTP client with fetch wrapper
├── auth.ts           # Authentication API methods
├── events.ts         # Events CRUD operations
├── studios.ts        # Studios management
├── dancers.ts        # Dancers management
├── performances.ts   # Performances management
├── hooks.ts          # React hooks for API calls
├── index.ts          # Main exports
└── README.md         # This file
```

## Best Practices

1. **Always use type parameters** for type-safe requests/responses
2. **Create dedicated modules** for each API resource (events, dancers, etc.)
3. **Use hooks** in React components for cleaner code
4. **Handle errors gracefully** with try/catch or error states
5. **Keep tokens secure** - never expose in logs or console
6. **Use environment variables** for API URLs
