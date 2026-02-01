# Logic Problems Report

## Critical Security Issues

### 1. **Missing Authorization Checks**
**Location:** `backend/src/routes/patients.ts`, `backend/src/routes/matches.ts`

**Problem:** 
- No authorization checks verify that the authenticated user owns the patient data they're accessing
- Any authenticated user can access/modify any patient's data by guessing a `patientId`
- No link between authenticated users (Prisma/SQLite) and patients (MongoDB)

**Impact:** 
- Users can access other users' medical data
- Users can modify other users' patient profiles
- Users can run matching for other users' patients

**Example:**
```typescript
// backend/src/routes/patients.ts:258
patientsRouter.get("/:id", async (c) => {
  const patientId = c.req.param("id");
  // ❌ No check: Does this patient belong to the authenticated user?
  const patientDoc = await collection.findOne({ _id: patientId });
  // ...
});
```

**Fix:** Add authorization middleware that:
1. Links patients to users via email (or add `userId` field to PatientDocument)
2. Verifies `patient.email === user.email` before allowing access
3. Requires authentication for all patient/match routes

---

### 2. **Email Mismatch Vulnerability**
**Location:** `backend/src/routes/patients.ts:17-253`

**Problem:**
- Patient creation accepts any email address
- No validation that the email matches the authenticated user's email
- Users can create patient profiles with other users' emails

**Impact:**
- Email hijacking - users can create profiles for other people's emails
- Data corruption - multiple users could overwrite the same patient profile

**Fix:**
```typescript
// Require authentication and validate email matches
const user = c.get("user");
if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
if (patientData.email !== user.email) {
  return c.json({ error: { message: "Email must match authenticated user" } }, 403);
}
```

---

## Data Consistency Issues

### 3. **Incorrect "isNew" Detection Logic**
**Location:** `backend/src/routes/patients.ts:241`

**Problem:**
```typescript
const isNew = patient.createdAt?.getTime() === patient.updatedAt?.getTime();
```

**Issue:**
- `updatedAt` is optional in the schema (`updatedAt: z.date().optional()`)
- For new patients created via `$setOnInsert`, `updatedAt` might not exist
- Comparison with `undefined` will always be `false`, incorrectly marking new patients as updates

**Impact:**
- New patients return HTTP 200 instead of 201
- Incorrect logging ("Updated" instead of "Created")

**Fix:**
```typescript
// Better approach: check if updatedAt exists and equals createdAt
const isNew = !patient.updatedAt || 
  patient.createdAt?.getTime() === patient.updatedAt?.getTime();
```

---

### 4. **Schema Mismatch - Missing Fields**
**Location:** `backend/src/types.ts:91-126` vs actual usage

**Problem:**
- `PatientDocumentSchema` doesn't include fields used in code:
  - `ageRange` (used in matches.ts:47, patients.ts:467)
  - `extractedData` (used throughout)
  - `aiParsedConditions` (used in matches.ts:57)
  - `biomarkers`, `priorTreatments` (used in quick-match)

**Impact:**
- Type safety violations
- Runtime errors possible
- Schema validation doesn't match reality

**Fix:** Update `PatientDocumentSchema` to include all fields:
```typescript
export const PatientDocumentSchema = z.object({
  // ... existing fields ...
  ageRange: z.string().optional(),
  extractedData: ExtractedPatientDataSchema.optional(),
  aiParsedConditions: z.array(z.string()).optional(),
  biomarkers: z.array(z.object({ name: z.string(), status: z.string() })).optional(),
  priorTreatments: z.array(z.string()).optional(),
  // ...
});
```

---

### 5. **Inconsistent Trial Data Between Endpoints**
**Location:** `backend/src/routes/matches.ts:156-282` vs `matches.ts:23-150`

**Problem:**
- **Streaming endpoint** (`/api/matches/stream`): Always scrapes fresh trials based on patient conditions (line 82)
- **Non-streaming endpoint** (`/api/matches`): Uses cached trials from MongoDB, only ingests if empty (line 195-199)

**Impact:**
- Different results for the same patient depending on which endpoint is used
- Non-streaming endpoint may use stale trial data
- Inconsistent user experience

**Fix:** Make both endpoints use the same logic - always scrape fresh trials based on patient conditions.

---

### 6. **Age/AgeRange Inconsistency in Quick-Match**
**Location:** `backend/src/routes/patients.ts:465-517`

**Problem:**
- Quick-match stores `ageRange` but doesn't clear the `age` field
- Patient document can have both `age` and `ageRange` set, causing confusion
- Matching logic uses `ageRange` if available, but schema requires `age` for some operations

**Impact:**
- Data inconsistency
- Matching may use wrong age value

**Fix:** In quick-match, explicitly unset `age` when using `ageRange`:
```typescript
$unset: {
  age: "", // Clear age when using ageRange
  // ... other fields
}
```

---

## Type Safety Issues

### 7. **Excessive `as any` Type Casts**
**Location:** Multiple files

**Problem:**
- `backend/src/routes/patients.ts:263`: `{ _id: patientId as any }`
- `backend/src/routes/matches.ts:47`: `ageRange: (patientDoc as any).ageRange`
- Multiple places use `(patientDoc as any).fieldName`

**Impact:**
- Loss of type safety
- Runtime errors not caught at compile time
- Makes refactoring dangerous

**Fix:** 
1. Update `PatientDocumentSchema` to include all fields (see issue #4)
2. Remove all `as any` casts
3. Use proper type guards or optional chaining

---

## Logic Errors

### 8. **Missing Error Handling for MongoDB Operations**
**Location:** `backend/src/routes/patients.ts:193-231`

**Problem:**
- `findOneAndUpdate` with `upsert: true` can fail silently
- No check if `result` is null before accessing properties
- Error handling catches all errors but doesn't distinguish between types

**Impact:**
- Unclear error messages
- Potential null reference errors

**Fix:** Add explicit null checks and better error messages:
```typescript
const result = await collection.findOneAndUpdate(/* ... */);
if (!result || !result.value) {
  return c.json({ error: { message: "Failed to create patient" } }, 500);
}
const patient = result.value;
```

---

### 9. **Race Condition in Match Storage**
**Location:** `backend/src/routes/matches.ts:117, 233`

**Problem:**
```typescript
await matchesCollection.deleteMany({ patientId });
await matchesCollection.insertMany(documents);
```

**Issue:**
- Between `deleteMany` and `insertMany`, another request could read empty matches
- No transaction wrapping these operations
- If `insertMany` fails, matches are deleted but not replaced

**Impact:**
- Temporary data loss
- Inconsistent state

**Fix:** Use MongoDB transactions or combine operations:
```typescript
// Option 1: Use replaceMany with upsert
// Option 2: Wrap in transaction
// Option 3: Delete only after successful insert
```

---

### 10. **Missing Validation for Patient ID Format**
**Location:** `backend/src/routes/patients.ts:260`, `backend/src/routes/matches.ts:24`

**Problem:**
- Patient IDs are UUIDs but no format validation
- Invalid IDs could cause MongoDB errors
- No sanitization of user input

**Impact:**
- Potential injection attacks
- Unclear error messages

**Fix:** Add Zod validation:
```typescript
const patientIdSchema = z.string().uuid("Invalid patient ID format");
```

---

## Missing Features

### 11. **No Rate Limiting**
**Location:** All routes

**Problem:**
- No rate limiting on expensive operations:
  - Trial ingestion (`/api/trials/ingest`)
  - Matching (`/api/matches`, `/api/matches/stream`)
  - Patient creation with document processing

**Impact:**
- API abuse possible
- Server resource exhaustion
- Cost overruns (OpenAI API calls)

**Fix:** Add rate limiting middleware for expensive endpoints.

---

### 12. **No Input Sanitization**
**Location:** `backend/src/routes/patients.ts`

**Problem:**
- Free-text fields (`conditionDescription`, `primaryDiagnosis`, etc.) are stored without sanitization
- Could contain malicious content
- No length limits

**Impact:**
- XSS vulnerabilities (if displayed without sanitization)
- Database bloat
- Performance issues

**Fix:** Add input sanitization and length limits.

---

## Summary

**Critical (Fix Immediately):**
1. Missing authorization checks (#1)
2. Email mismatch vulnerability (#2)

**High Priority:**
3. Incorrect isNew detection (#3)
4. Schema mismatch (#4)
5. Inconsistent trial data (#5)

**Medium Priority:**
6. Age/ageRange inconsistency (#6)
7. Type safety issues (#7)
8. Error handling (#8)
9. Race conditions (#9)

**Low Priority:**
10. Missing validation (#10)
11. Rate limiting (#11)
12. Input sanitization (#12)
