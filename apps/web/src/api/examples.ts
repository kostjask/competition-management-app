/**
 * API Usage Examples
 * 
 * This file demonstrates how to use the typed API client endpoints
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  // Auth
  login,
  register,
  getCurrentUser,
  logout,
  // Events
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  // Studios
  getStudios,
  getStudio,
  createStudio,
  updateStudio,
  updateStudioRegistration,
  deleteStudio,
  // Dancers
  getDancers,
  getDancer,
  createDancer,
  updateDancer,
  deleteDancer,
  // Performances
  getPerformances,
  getPerformance,
  createPerformance,
  updatePerformance,
  deletePerformance,
} from './index';

// ============================================================================
// AUTHENTICATION EXAMPLES
// ============================================================================

async function authExamples() {
  // Register a new user
  const authResponse = await register({
    email: 'user@example.com',
    name: 'John Doe',
    password: 'securepassword123'
  });
  console.log('Registered user:', authResponse.user);

  // Login
  const loginResponse = await login({
    email: 'user@example.com',
    password: 'securepassword123'
  });
  console.log('Logged in, token:', loginResponse.token);

  // Get current user profile
  const user = await getCurrentUser();
  console.log('Current user:', user);

  // Logout
  logout();
}

// ============================================================================
// EVENTS EXAMPLES
// ============================================================================

async function eventsExamples() {
  // Get all events
  const events = await getEvents();
  console.log('All events:', events);

  // Get single event
  const event = await getEvent('event-id');
  console.log('Event details:', event);

  // Create new event (Admin only)
  const newEvent = await createEvent({
    name: 'Spring Dance Competition 2026',
    startsAt: '2026-05-15',
    endsAt: '2026-05-17',
    stage: 'PRE_REGISTRATION'
  });
  console.log('Created event:', newEvent);

  // Update event (Admin only)
  const updatedEvent = await updateEvent('event-id', {
    stage: 'REGISTRATION_OPEN'
  });
  console.log('Updated event:', updatedEvent);
}

// ============================================================================
// STUDIOS EXAMPLES
// ============================================================================

async function studiosExamples() {
  const eventId = 'event-id';

  // Get all studios for an event
  const studios = await getStudios(eventId);
  console.log('Studios:', studios);

  // Get single studio with registration details
  const studio = await getStudio(eventId, 'studio-id');
  console.log('Studio details:', studio);

  // Create new studio registration
  const newStudio = await createStudio(eventId, {
    name: 'Dance Academy Elite',
    country: 'USA',
    city: 'New York',
    directorName: 'Jane Smith',
    directorPhone: '+1-555-0123',
    representativeName: 'John Smith',
    representativeEmail: 'john@danceacademy.com'
  });
  console.log('Created studio:', newStudio);

  // Update studio details
  const updatedStudio = await updateStudio(eventId, 'studio-id', {
    city: 'Los Angeles',
    directorPhone: '+1-555-9999'
  });
  console.log('Updated studio:', updatedStudio);

  // Update registration status (Admin only)
  const registration = await updateStudioRegistration(eventId, 'studio-id', {
    status: 'APPROVED',
    canEditDuringReview: true
  });
  console.log('Updated registration:', registration);

  // Delete studio
  await deleteStudio(eventId, 'studio-id');
}

// ============================================================================
// DANCERS EXAMPLES
// ============================================================================

async function dancersExamples() {
  const studioId = 'studio-id';

  // Get all dancers for a studio
  const dancers = await getDancers(studioId);
  console.log('Dancers:', dancers);

  // Get single dancer
  const dancer = await getDancer(studioId, 'dancer-id');
  console.log('Dancer details:', dancer);

  // Create new dancer
  const newDancer = await createDancer(studioId, {
    firstName: 'Emma',
    lastName: 'Johnson',
    birthDate: '2010-05-15'
  });
  console.log('Created dancer:', newDancer);

  // Update dancer
  const updatedDancer = await updateDancer(studioId, 'dancer-id', {
    firstName: 'Emily'
  });
  console.log('Updated dancer:', updatedDancer);

  // Delete dancer
  await deleteDancer(studioId, 'dancer-id');
}

// ============================================================================
// PERFORMANCES EXAMPLES
// ============================================================================

async function performancesExamples() {
  const studioId = 'studio-id';

  // Get all performances for a studio
  const performances = await getPerformances(studioId);
  console.log('Performances:', performances);

  // Get single performance with details
  const performance = await getPerformance(studioId, 'performance-id');
  console.log('Performance details:', performance);

  // Create new performance
  const newPerformance = await createPerformance(studioId, {
    title: 'Swan Lake - Contemporary Interpretation',
    durationSec: 180,
    orderOnStage: 5,
    categoryId: 'category-id',
    ageGroupId: 'age-group-id',
    formatId: 'format-id',
    dancerIds: ['dancer-1', 'dancer-2', 'dancer-3']
  });
  console.log('Created performance:', newPerformance);

  // Update performance
  const updatedPerformance = await updatePerformance(studioId, 'performance-id', {
    title: 'Swan Lake - Modern Contemporary',
    durationSec: 185,
    dancerIds: ['dancer-1', 'dancer-2', 'dancer-3', 'dancer-4']
  });
  console.log('Updated performance:', updatedPerformance);

  // Delete performance
  await deletePerformance(studioId, 'performance-id');
}

// ============================================================================
// REACT COMPONENT EXAMPLES
// ============================================================================

/** Example: Login Form Component
import { useState } from 'react';
import { useApiCall } from './api';
import { login } from './api/auth';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { loading, error, execute: doLogin } = useApiCall(login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await doLogin({ email, password });
      window.location.href = '/dashboard';
    } catch (err) {
      // Error is captured in state
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
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
*/

/** Example: Events List Component
import { useFetch } from './api';
import { getEvents } from './api/events';

function EventsList() {
  const { data: events, loading, error } = useFetch(getEvents);

  if (loading) return <div>Loading events...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!events || events.length === 0) return <div>No events found</div>;

  return (
    <div className="events-list">
      {events.map((event) => (
        <div key={event.id} className="event-card">
          <h3>{event.name}</h3>
          <p>Stage: {event.stage}</p>
          <p>
            {new Date(event.startsAt).toLocaleDateString()} - 
            {new Date(event.endsAt).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}
*/

/** Example: Create Dancer Form
import { useState } from 'react';
import { useApiCall } from './api';
import { createDancer } from './api/dancers';

function CreateDancerForm({ studioId }: { studioId: string }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const { loading, error, execute: doCreate } = useApiCall(createDancer);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dancer = await doCreate(studioId, {
        firstName,
        lastName,
        birthDate
      });
      console.log('Created dancer:', dancer);
      // Reset form
      setFirstName('');
      setLastName('');
      setBirthDate('');
    } catch (err) {
      // Error is captured in state
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      <input
        type="text"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        placeholder="First Name"
        required
      />
      <input
        type="text"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        placeholder="Last Name"
        required
      />
      <input
        type="date"
        value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Dancer'}
      </button>
    </form>
  );
}
*/

// ============================================================================
// ERROR HANDLING EXAMPLE
// ============================================================================

/** Example: Comprehensive Error Handling
import { ApiError } from './api/client';
import { createStudio } from './api/studios';

async function handleStudioCreation() {
  try {
    const studio = await createStudio('event-id', {
      name: 'My Dance Studio',
      representativeName: 'John Doe',
      representativeEmail: 'john@example.com'
    });
    console.log('Success:', studio);
  } catch (error) {
    if (error instanceof ApiError) {
      switch (error.statusCode) {
        case 400:
          console.error('Validation error:', error.details);
          break;
        case 401:
          console.error('Not authenticated - redirecting to login');
          break;
        case 403:
          console.error('Permission denied:', error.message);
          break;
        case 404:
          console.error('Event not found');
          break;
        case 409:
          console.error('Studio already exists');
          break;
        default:
          console.error('API Error:', error.message);
      }
    } else {
      console.error('Unknown error:', error);
    }
  }
}
*/
