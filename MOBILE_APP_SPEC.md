# Mobile App Specification: TrialMatch Companion

## Overview

Build a React Native (Expo) mobile app that extends the TrialMatch clinical trial matching platform with smart notifications, follow-ups, and trial application automation.

**Core Features:**
1. Push notifications when new matching trials appear
2. Reminders to follow up on applications after X days
3. Alerts when trial status changes (recruiting -> closed)
4. Urgency alerts for trials with limited spots

---

## Backend Connection

### Base URL (PRODUCTION)
```
https://preview-darmthflumdy.dev.vibecode.run
```

The backend is already running and accessible. For mobile, use:
```typescript
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "https://preview-darmthflumdy.dev.vibecode.run";
```

### Test the Backend
```bash
# Health check
curl https://preview-darmthflumdy.dev.vibecode.run/health

# Get all trials
curl https://preview-darmthflumdy.dev.vibecode.run/api/trials

# Get a specific trial
curl https://preview-darmthflumdy.dev.vibecode.run/api/trials/NCT04354324
```

### Authentication
Uses Better Auth with email OTP (magic link style).

**Auth Flow:**
```typescript
// 1. Request OTP
const response = await fetch(`${BACKEND_URL}/api/auth/sign-in/email-otp`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ email: "user@example.com" }),
});

// 2. Verify OTP (user receives code via email)
const verifyResponse = await fetch(`${BACKEND_URL}/api/auth/sign-in/email-otp/verify`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ email: "user@example.com", otp: "123456" }),
});

// 3. Get session (check if logged in)
const sessionResponse = await fetch(`${BACKEND_URL}/api/auth/get-session`, {
  credentials: "include",
});

// 4. Sign out
const signOutResponse = await fetch(`${BACKEND_URL}/api/auth/sign-out`, {
  method: "POST",
  credentials: "include",
});
```

**Important:** All requests must include `credentials: 'include'` for cookies to work.

---

## Existing API Endpoints (Already Working)

### Patients
| Method | Endpoint | Description | Example |
|--------|----------|-------------|---------|
| GET | `/api/patients` | List all patients | `curl $BACKEND_URL/api/patients` |
| GET | `/api/patients/:id` | Get patient by ID | `curl $BACKEND_URL/api/patients/abc123` |
| POST | `/api/patients` | Create patient profile | See below |
| PUT | `/api/patients/:id` | Update patient profile | See below |
| POST | `/api/patients/quick-match` | Upload document & create/update patient | Multipart form |

**Create Patient Example:**
```bash
curl -X POST https://preview-darmthflumdy.dev.vibecode.run/api/patients \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "age": 45,
    "gender": "female",
    "smokingStatus": "never",
    "state": "CA",
    "conditions": ["papillary thyroid carcinoma"]
  }'
```

### Trials
| Method | Endpoint | Description | Example |
|--------|----------|-------------|---------|
| GET | `/api/trials` | List all cached trials | `curl $BACKEND_URL/api/trials` |
| GET | `/api/trials/:nctId` | Get single trial | `curl $BACKEND_URL/api/trials/NCT04354324` |
| POST | `/api/trials/ingest` | Trigger fresh trial ingestion | `curl -X POST $BACKEND_URL/api/trials/ingest` |

**Trial Response Example:**
```json
{
  "data": {
    "nctId": "NCT04354324",
    "title": "Treatment Efficacy and Safety of Low-dose Radioiodine Ablation...",
    "status": "RECRUITING",
    "conditions": ["Differentiated Thyroid Carcinoma", "Papillary Thyroid Cancer"],
    "eligibilityCriteria": "Age: 18 Years to 65 Years. Sex: ALL...",
    "url": "https://clinicaltrials.gov/study/NCT04354324",
    "ingestedAt": "2024-01-31T22:38:00.000Z"
  }
}
```

### Matches
| Method | Endpoint | Description | Example |
|--------|----------|-------------|---------|
| GET | `/api/matches/:patientId` | Get matches for patient | `curl $BACKEND_URL/api/matches/abc123` |
| POST | `/api/matches` | Run matching (non-streaming) | See below |
| POST | `/api/matches/stream` | Run matching with SSE progress | See below |

**Run Matching Example:**
```bash
curl -X POST https://preview-darmthflumdy.dev.vibecode.run/api/matches \
  -H "Content-Type: application/json" \
  -d '{"patientId": "abc123"}'
```

**Match Response Example:**
```json
{
  "data": {
    "matchCount": 5,
    "matches": [
      {
        "id": "abc123_NCT04354324_1706739480000",
        "patientId": "abc123",
        "trialId": "NCT04354324",
        "confidenceScore": 85,
        "reasoning": "* Patient's condition (papillary thyroid carcinoma) matches trial target\n* Age range (31-45) meets trial requirements\n* No gender restrictions",
        "createdAt": "2024-01-31T22:38:00.000Z"
      }
    ]
  }
}
```

### Current User
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/me` | Get logged-in user info |

---

## New Backend Endpoints to Create

Add these to the existing backend at `/home/user/workspace/backend/`

### 1. Applications Router (`/api/applications`)

**File:** `backend/src/routes/applications.ts`

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

// Application status enum
const ApplicationStatusEnum = z.enum([
  'interested',      // User marked as interested
  'applied',         // Application submitted
  'in_review',       // Under review by trial site
  'screening',       // Invited for screening
  'enrolled',        // Accepted into trial
  'rejected',        // Not accepted
  'withdrawn'        // User withdrew
]);

// Create application schema
const CreateApplicationSchema = z.object({
  patientId: z.string().min(1),
  trialId: z.string().regex(/^NCT\d{8}$/),
  status: ApplicationStatusEnum.default('interested'),
  notes: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
});

// Update application schema
const UpdateApplicationSchema = z.object({
  status: ApplicationStatusEnum.optional(),
  notes: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  nextFollowUpAt: z.string().datetime().optional(),
});

const applicationsRouter = new Hono();

// GET /api/applications/:patientId - Get all applications for patient
applicationsRouter.get("/:patientId", async (c) => {
  // Implementation
});

// POST /api/applications - Create new application
applicationsRouter.post("/", zValidator("json", CreateApplicationSchema), async (c) => {
  // Implementation
});

// PUT /api/applications/:id - Update application
applicationsRouter.put("/:id", zValidator("json", UpdateApplicationSchema), async (c) => {
  // Implementation
});

// DELETE /api/applications/:id - Remove application
applicationsRouter.delete("/:id", async (c) => {
  // Implementation
});

// POST /api/applications/:id/follow-up - Log a follow-up action
applicationsRouter.post("/:id/follow-up", async (c) => {
  // Log follow-up, set next reminder date
});

export { applicationsRouter };
```

**MongoDB Document:**
```typescript
interface ApplicationDocument {
  _id: string;
  patientId: string;
  trialId: string;           // NCT ID
  status: ApplicationStatus;
  appliedAt?: Date;
  lastFollowUpAt?: Date;
  nextFollowUpAt?: Date;     // When to remind user
  notes?: string;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. Notifications Router (`/api/notifications`)

**File:** `backend/src/routes/notifications.ts`

```typescript
const NotificationTypeEnum = z.enum([
  'new_match',           // New trial match found
  'trial_status_change', // Trial status changed (recruiting -> closed)
  'follow_up_reminder',  // Time to follow up on application
  'application_update',  // Application status changed
  'urgency_alert'        // Limited spots remaining
]);

interface NotificationDocument {
  _id: string;
  patientId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: {
    trialId?: string;
    applicationId?: string;
    matchId?: string;
    [key: string]: any;
  };
  read: boolean;
  createdAt: Date;
}
```

**Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications/:patientId` | Get notifications (newest first, limit 50) |
| PUT | `/api/notifications/:id/read` | Mark single notification as read |
| PUT | `/api/notifications/:patientId/read-all` | Mark all as read |
| DELETE | `/api/notifications/:id` | Delete notification |
| GET | `/api/notifications/:patientId/unread-count` | Get unread count for badge |

### 3. Push Tokens Router (`/api/push-tokens`)

**File:** `backend/src/routes/push-tokens.ts`

```typescript
interface PushTokenDocument {
  _id: string;
  patientId: string;
  token: string;           // Expo push token (ExponentPushToken[xxx])
  platform: 'ios' | 'android';
  createdAt: Date;
  updatedAt: Date;
}
```

**Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/push-tokens` | Register/update push token |
| DELETE | `/api/push-tokens/:patientId` | Remove token on logout |

**Register Token Example:**
```bash
curl -X POST https://preview-darmthflumdy.dev.vibecode.run/api/push-tokens \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "abc123",
    "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    "platform": "ios"
  }'
```

### 4. Watchlist Router (`/api/watchlist`)

**File:** `backend/src/routes/watchlist.ts`

Track trials user wants to monitor for status changes:

```typescript
interface WatchedTrialDocument {
  _id: string;
  patientId: string;
  trialId: string;
  lastKnownStatus: string;   // To detect changes
  addedAt: Date;
}
```

**Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/watchlist/:patientId` | Get watched trials |
| POST | `/api/watchlist` | Add trial to watchlist |
| DELETE | `/api/watchlist/:patientId/:trialId` | Remove from watchlist |

---

## MongoDB Setup

### Add to `backend/src/services/mongodb.ts`:

```typescript
import type {
  ApplicationDocument,
  NotificationDocument,
  PushTokenDocument,
  WatchedTrialDocument
} from "../types";

export async function getApplicationsCollection(): Promise<Collection<ApplicationDocument>> {
  const database = await getDatabase();
  return database.collection<ApplicationDocument>("applications");
}

export async function getNotificationsCollection(): Promise<Collection<NotificationDocument>> {
  const database = await getDatabase();
  return database.collection<NotificationDocument>("notifications");
}

export async function getPushTokensCollection(): Promise<Collection<PushTokenDocument>> {
  const database = await getDatabase();
  return database.collection<PushTokenDocument>("push_tokens");
}

export async function getWatchlistCollection(): Promise<Collection<WatchedTrialDocument>> {
  const database = await getDatabase();
  return database.collection<WatchedTrialDocument>("watchlist");
}
```

### Add indexes in `ensureIndexes()`:

```typescript
// Application indexes
const applications = await getApplicationsCollection();
await applications.createIndex({ patientId: 1 });
await applications.createIndex({ trialId: 1 });
await applications.createIndex({ patientId: 1, trialId: 1 }, { unique: true });
await applications.createIndex({ nextFollowUpAt: 1 });
await applications.createIndex({ status: 1 });

// Notification indexes
const notifications = await getNotificationsCollection();
await notifications.createIndex({ patientId: 1, createdAt: -1 });
await notifications.createIndex({ patientId: 1, read: 1 });

// Push token indexes
const pushTokens = await getPushTokensCollection();
await pushTokens.createIndex({ patientId: 1 }, { unique: true });
await pushTokens.createIndex({ token: 1 }, { unique: true });

// Watchlist indexes
const watchlist = await getWatchlistCollection();
await watchlist.createIndex({ patientId: 1 });
await watchlist.createIndex({ patientId: 1, trialId: 1 }, { unique: true });
```

---

## Push Notification Service

**File:** `backend/src/services/push.ts`

```bash
# Install in backend directory
cd /home/user/workspace/backend && bun add expo-server-sdk
```

```typescript
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { getPushTokensCollection, getNotificationsCollection } from './mongodb';

const expo = new Expo();

export async function sendPushNotification(
  patientId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<ExpoPushTicket[] | null> {
  // Get patient's push token
  const tokensCollection = await getPushTokensCollection();
  const tokenDoc = await tokensCollection.findOne({ patientId });

  if (!tokenDoc || !Expo.isExpoPushToken(tokenDoc.token)) {
    console.log(`[Push] No valid token for patient ${patientId}`);
    return null;
  }

  const message: ExpoPushMessage = {
    to: tokenDoc.token,
    sound: 'default',
    title,
    body,
    data,
    priority: 'high',
  };

  try {
    const tickets = await expo.sendPushNotificationsAsync([message]);
    console.log(`[Push] Sent to ${patientId}:`, tickets);
    return tickets;
  } catch (error) {
    console.error(`[Push] Failed for ${patientId}:`, error);
    return null;
  }
}

// Helper to create notification AND send push
export async function createAndSendNotification(
  patientId: string,
  type: string,
  title: string,
  body: string,
  data?: Record<string, any>
) {
  // 1. Store notification in DB
  const notificationsCollection = await getNotificationsCollection();
  const notification = {
    _id: `${patientId}_${Date.now()}`,
    patientId,
    type,
    title,
    body,
    data,
    read: false,
    createdAt: new Date(),
  };
  await notificationsCollection.insertOne(notification);

  // 2. Send push notification
  await sendPushNotification(patientId, title, body, {
    ...data,
    notificationId: notification._id
  });

  return notification;
}
```

---

## Background Scheduler

**File:** `backend/src/services/scheduler.ts`

```typescript
import { getApplicationsCollection, getWatchlistCollection, getTrialsCollection } from './mongodb';
import { createAndSendNotification } from './push';

const HOUR = 60 * 60 * 1000;

export function startScheduler() {
  // Check follow-up reminders every hour
  setInterval(checkFollowUpReminders, HOUR);

  // Check trial status changes every 6 hours
  setInterval(checkTrialStatusChanges, 6 * HOUR);

  // Run immediately on startup
  setTimeout(checkFollowUpReminders, 10000);

  console.log('[Scheduler] Started background jobs');
}

async function checkFollowUpReminders() {
  console.log('[Scheduler] Checking follow-up reminders...');
  const apps = await getApplicationsCollection();
  const now = new Date();

  const dueFollowUps = await apps.find({
    nextFollowUpAt: { $lte: now },
    status: { $in: ['applied', 'in_review', 'screening'] }
  }).toArray();

  console.log(`[Scheduler] Found ${dueFollowUps.length} due follow-ups`);

  for (const app of dueFollowUps) {
    // Get trial info for notification
    const trialsCollection = await getTrialsCollection();
    const trial = await trialsCollection.findOne({ nctId: app.trialId });

    const trialName = trial?.title || app.trialId;

    await createAndSendNotification(
      app.patientId,
      'follow_up_reminder',
      'Time to Follow Up',
      `It's been a while since you applied to "${trialName.substring(0, 50)}..."`,
      { trialId: app.trialId, applicationId: app._id }
    );

    // Set next follow-up to 7 days from now
    await apps.updateOne(
      { _id: app._id },
      {
        $set: {
          nextFollowUpAt: new Date(Date.now() + 7 * 24 * HOUR),
          updatedAt: new Date()
        }
      }
    );
  }
}

async function checkTrialStatusChanges() {
  console.log('[Scheduler] Checking trial status changes...');
  const watchlist = await getWatchlistCollection();
  const watched = await watchlist.find({}).toArray();

  for (const item of watched) {
    try {
      // Fetch current status from ClinicalTrials.gov
      const response = await fetch(
        `https://clinicaltrials.gov/api/v2/studies/${item.trialId}?fields=OverallStatus|BriefTitle`
      );

      if (!response.ok) continue;

      const data = await response.json();
      const currentStatus = data.protocolSection?.statusModule?.overallStatus;
      const title = data.protocolSection?.identificationModule?.briefTitle;

      if (currentStatus && currentStatus !== item.lastKnownStatus) {
        // Status changed! Notify user
        await createAndSendNotification(
          item.patientId,
          'trial_status_change',
          'Trial Status Changed',
          `"${title?.substring(0, 40)}..." is now ${currentStatus}`,
          { trialId: item.trialId, oldStatus: item.lastKnownStatus, newStatus: currentStatus }
        );

        // Update last known status
        await watchlist.updateOne(
          { _id: item._id },
          { $set: { lastKnownStatus: currentStatus } }
        );
      }
    } catch (error) {
      console.error(`[Scheduler] Failed to check ${item.trialId}:`, error);
    }
  }
}
```

### Start scheduler in `backend/src/index.ts`:

```typescript
import { startScheduler } from "./services/scheduler";

// At the end of startupTasks():
startScheduler();
```

---

## Mount New Routes in `backend/src/index.ts`

```typescript
import { applicationsRouter } from "./routes/applications";
import { notificationsRouter } from "./routes/notifications";
import { pushTokensRouter } from "./routes/push-tokens";
import { watchlistRouter } from "./routes/watchlist";

// Add after existing routes:
app.route("/api/applications", applicationsRouter);
app.route("/api/notifications", notificationsRouter);
app.route("/api/push-tokens", pushTokensRouter);
app.route("/api/watchlist", watchlistRouter);
```

---

## Mobile App API Client

**File:** `mobile/services/api.ts`

```typescript
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "https://preview-darmthflumdy.dev.vibecode.run";

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Request failed');
    }

    const data = await response.json();
    return data.data;
  }

  // Auth
  async requestOTP(email: string) {
    return this.request('/api/auth/sign-in/email-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyOTP(email: string, otp: string) {
    return this.request('/api/auth/sign-in/email-otp/verify', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  }

  async getSession() {
    return this.request('/api/auth/get-session');
  }

  // Patients
  async getPatient(id: string) {
    return this.request<PatientProfile>(`/api/patients/${id}`);
  }

  // Matches
  async getMatches(patientId: string) {
    return this.request<{ matches: MatchWithTrial[] }>(`/api/matches/${patientId}`);
  }

  async runMatching(patientId: string) {
    return this.request('/api/matches', {
      method: 'POST',
      body: JSON.stringify({ patientId }),
    });
  }

  // Applications
  async getApplications(patientId: string) {
    return this.request<Application[]>(`/api/applications/${patientId}`);
  }

  async createApplication(data: CreateApplicationInput) {
    return this.request('/api/applications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateApplication(id: string, data: UpdateApplicationInput) {
    return this.request(`/api/applications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Notifications
  async getNotifications(patientId: string) {
    return this.request<Notification[]>(`/api/notifications/${patientId}`);
  }

  async markNotificationRead(id: string) {
    return this.request(`/api/notifications/${id}/read`, { method: 'PUT' });
  }

  async getUnreadCount(patientId: string) {
    return this.request<{ count: number }>(`/api/notifications/${patientId}/unread-count`);
  }

  // Push tokens
  async registerPushToken(patientId: string, token: string, platform: 'ios' | 'android') {
    return this.request('/api/push-tokens', {
      method: 'POST',
      body: JSON.stringify({ patientId, token, platform }),
    });
  }

  // Watchlist
  async getWatchlist(patientId: string) {
    return this.request<WatchedTrial[]>(`/api/watchlist/${patientId}`);
  }

  async watchTrial(patientId: string, trialId: string) {
    return this.request('/api/watchlist', {
      method: 'POST',
      body: JSON.stringify({ patientId, trialId }),
    });
  }

  async unwatchTrial(patientId: string, trialId: string) {
    return this.request(`/api/watchlist/${patientId}/${trialId}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();
```

---

## Mobile Push Notification Setup

**File:** `mobile/utils/notifications.ts`

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from '../services/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(patientId: string) {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync();

  // Register with backend
  await api.registerPushToken(
    patientId,
    token.data,
    Platform.OS as 'ios' | 'android'
  );

  return token.data;
}

export function setupNotificationListeners(
  onNotificationReceived: (notification: Notifications.Notification) => void,
  onNotificationTapped: (response: Notifications.NotificationResponse) => void
) {
  const receivedSubscription = Notifications.addNotificationReceivedListener(onNotificationReceived);
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(onNotificationTapped);

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}
```

---

## Mobile App Structure

```
mobile/
├── app/
│   ├── (auth)/
│   │   ├── login.tsx          # Email input
│   │   └── verify.tsx         # OTP verification
│   ├── (tabs)/
│   │   ├── index.tsx          # Home - matches overview
│   │   ├── applications.tsx   # Application tracker
│   │   ├── notifications.tsx  # Notification center
│   │   └── profile.tsx        # User profile & settings
│   ├── trial/[nctId].tsx      # Trial detail page
│   ├── application/[id].tsx   # Application detail
│   └── _layout.tsx            # Root layout with auth check
├── components/
│   ├── MatchCard.tsx          # Display match with score
│   ├── ApplicationCard.tsx    # Application with status badge
│   ├── NotificationItem.tsx   # Single notification row
│   ├── TrialStatusBadge.tsx   # RECRUITING, CLOSED, etc.
│   └── EmptyState.tsx         # No data placeholders
├── hooks/
│   ├── useAuth.ts             # Auth state management
│   ├── usePushNotifications.ts
│   ├── useMatches.ts          # Fetch & cache matches
│   └── useApplications.ts
├── services/
│   └── api.ts                 # API client (above)
├── utils/
│   └── notifications.ts       # Push setup (above)
└── types/
    └── index.ts               # TypeScript interfaces
```

---

## Implementation Checklist

### Phase 1: Backend Extensions
- [ ] Add types to `backend/src/types.ts`
- [ ] Add MongoDB collections to `backend/src/services/mongodb.ts`
- [ ] Add indexes in `ensureIndexes()`
- [ ] Create `backend/src/routes/applications.ts`
- [ ] Create `backend/src/routes/notifications.ts`
- [ ] Create `backend/src/routes/push-tokens.ts`
- [ ] Create `backend/src/routes/watchlist.ts`
- [ ] Create `backend/src/services/push.ts`
- [ ] Create `backend/src/services/scheduler.ts`
- [ ] Mount routes in `backend/src/index.ts`
- [ ] Install `expo-server-sdk`: `cd backend && bun add expo-server-sdk`

### Phase 2: Mobile App
- [ ] Initialize Expo project
- [ ] Set up navigation (Expo Router)
- [ ] Implement auth screens
- [ ] Create API client
- [ ] Build home screen with matches
- [ ] Build applications screen
- [ ] Build notifications screen
- [ ] Set up push notifications
- [ ] Test end-to-end flow

---

## Testing Commands

```bash
# Test backend health
curl https://preview-darmthflumdy.dev.vibecode.run/health

# Test trials endpoint
curl https://preview-darmthflumdy.dev.vibecode.run/api/trials | head -100

# Test specific trial
curl https://preview-darmthflumdy.dev.vibecode.run/api/trials/NCT04354324

# After implementing new endpoints:

# Create application
curl -X POST https://preview-darmthflumdy.dev.vibecode.run/api/applications \
  -H "Content-Type: application/json" \
  -d '{"patientId":"test123","trialId":"NCT04354324","status":"interested"}'

# Get applications
curl https://preview-darmthflumdy.dev.vibecode.run/api/applications/test123

# Register push token
curl -X POST https://preview-darmthflumdy.dev.vibecode.run/api/push-tokens \
  -H "Content-Type: application/json" \
  -d '{"patientId":"test123","token":"ExponentPushToken[xxx]","platform":"ios"}'
```
