# Plan: Assisted Medical Triage Frontend MVP

Build a single-page Angular 20 triage UI that creates a session via `http://localhost:8080/sessions`, streams audio/video via WebRTC to `http://localhost:8000`, collects clinical form data (severity dropdown, textareas for arrays), submits to `http://localhost:8080/forms/{correlationId}`, and displays the AI-assisted triage result with always-visible camera preview.

## Steps

1. **Update `src/app/app.config.ts`** — add `provideHttpClient()` to providers array for API and signaling calls.

2. **Create `src/app/models/api.models.ts`** — define interfaces: `SessionCreatedResponse`, `PatientComplaintDto`, `VitalSignsDto`, `MedicalHistoryDto`, `ClinicalFormRequest`, and `TriageResultResponse` (with `triageLevel`, `riskFactors`, `inconsistencies`, `notesForPhysician`, `confidence`).

3. **Create `src/app/services/api.service.ts`** — implement `createSession(): Observable<SessionCreatedResponse>` (POST `http://localhost:8080/sessions`) and `submitForm(correlationId: string, formData: ClinicalFormRequest): Observable<TriageResultResponse>` (POST `http://localhost:8080/forms/{correlationId}`).

4. **Create `src/app/services/media.service.ts`** — implement WebRTC streaming:
   - `startStreaming(correlationId: string): Promise<MediaStream>` — call `getUserMedia({ video: true, audio: true })`, create `RTCPeerConnection({ iceServers: [] })`, add tracks, create offer, set local description, POST `{ correlationId, sdp: offer.sdp, type: offer.type }` to `http://localhost:8000/offer`, receive answer, set remote description, return local `MediaStream`.
   - `stopStreaming()` — close `RTCPeerConnection`, stop all tracks on local stream.
   - Expose `localStream` as a signal for template binding.

5. **Create `src/app/triage/triage.ts`** — standalone component importing `ReactiveFormsModule`, `CommonModule`. Define signals: `correlationId`, `status: UiStatus` (`'INIT' | 'STREAMING' | 'SUBMITTED' | 'DONE'`), `triageResult`, `errorMessage`, `localStream`. On `ngOnInit()`: call `createSession()` → store `correlationId` → call `startStreaming(correlationId)` → set status `STREAMING`. Build reactive `FormGroup` with nested groups: `complaint` (description, duration required; severity as dropdown ['mild','moderate','severe'] required), `vitalSigns` (heartRate, systolicBp, diastolicBp, temperature, oxygenSaturation—all optional numbers), `medicalHistory` (conditions, medications, allergies—textareas, split on comma at submit). On submit: disable button, call `stopStreaming()`, set status `SUBMITTED`, call `submitForm()`, on success set `triageResult` and status `DONE`, on error set `errorMessage`.

6. **Create `src/app/triage/triage.html`** — layout with:
   - Inline error banner at top (red, shows `errorMessage()`, includes reload button)
   - Always-visible `<video autoplay muted playsinline>` bound via `srcObject` to `localStream()`
   - Status indicator label (e.g., "Recording audio and video" when `STREAMING`)
   - Reactive form: Patient Complaint section (description input, duration input, severity dropdown), Vital Signs section (5 number inputs), Medical History section (3 textareas for comma-separated values)
   - Submit button (disabled when form invalid or status is `SUBMITTED`/`DONE`)
   - Result section (visible when `status() === 'DONE'`): triage level badge (color-coded), risk factors list, inconsistencies list, notes for physician, confidence percentage, disclaimer text

7. **Create `src/app/triage/triage.css`** — styles for: video preview (16:9 aspect, max-width 480px), form layout (sections with borders/spacing, labels), status badges, triage level colors (LOW=green, MEDIUM=amber, HIGH=red), error banner (red bg, white text), submit button states, result card styling.

8. **Update `src/app/app.routes.ts`** — import `TriageComponent` and add `{ path: '', component: TriageComponent }`.

9. **Update `src/app/app.html`** — replace placeholder content with `<router-outlet />`.

## File Structure Summary

```
src/app/
├── app.config.ts           (update: add provideHttpClient)
├── app.routes.ts           (update: add triage route)
├── app.html                (update: router-outlet only)
├── models/
│   └── api.models.ts       (new)
├── services/
│   ├── api.service.ts      (new)
│   └── media.service.ts    (new)
└── triage/
    ├── triage.ts           (new)
    ├── triage.html         (new)
    └── triage.css          (new)
```

## API Contract Summary

| Endpoint | Method | Host | Request | Response |
|----------|--------|------|---------|----------|
| `/sessions` | POST | localhost:8080 | — | `{ correlationId }` |
| `/forms/{correlationId}` | POST | localhost:8080 | `ClinicalFormRequest` | `TriageResultResponse` |
| `/offer` | POST | localhost:8000 | `{ correlationId, sdp, type }` | `{ sdp, type }` (answer) |

## Interfaces (from OpenAPI)

```typescript
// Session
interface SessionCreatedResponse {
  correlationId: string;
}

// Clinical Form Request
interface PatientComplaintDto {
  description: string;  // required, min 1 char
  duration: string;     // required, min 1 char
  severity: string;     // required, "mild" | "moderate" | "severe"
}

interface VitalSignsDto {
  heartRate?: number;        // int32
  systolicBp?: number;       // int32
  diastolicBp?: number;      // int32
  temperature?: number;      // double
  oxygenSaturation?: number; // int32
}

interface MedicalHistoryDto {
  conditions?: string[];
  medications?: string[];
  allergies?: string[];
}

interface ClinicalFormRequest {
  complaint: PatientComplaintDto;
  vitalSigns: VitalSignsDto;
  medicalHistory: MedicalHistoryDto;
}

// Triage Result Response
interface TriageResultResponse {
  triageLevel: string;       // "LOW" | "MEDIUM" | "HIGH"
  riskFactors: string[];
  inconsistencies: string[];
  notesForPhysician: string;
  confidence: number;        // 0.0 to 1.0
}
```

## WebRTC Signaling Flow

1. Frontend calls `getUserMedia({ video: true, audio: true })` to acquire local stream
2. Create `RTCPeerConnection({ iceServers: [] })` (localhost, no STUN/TURN needed)
3. Add audio and video tracks to peer connection
4. Create SDP offer and set as local description
5. POST to `http://localhost:8000/offer`:
   ```json
   {
     "correlationId": "abc-123",
     "sdp": "v=0\r\no=...",
     "type": "offer"
   }
   ```
6. Receive SDP answer from server
7. Set remote description with answer
8. WebRTC connection established, streaming begins

## UI Status Labels

| Status | Label |
|--------|-------|
| `INIT` | "Starting session..." |
| `STREAMING` | "Recording audio and video" |
| `SUBMITTED` | "Submitting information..." |
| `DONE` | "Analysis complete" |

## Error Handling

- Display inline red banner at top of page
- Show generic message: "An unexpected error occurred. Please restart the session."
- Include "Reload" button that calls `window.location.reload()`
- No complex recovery logic

## Result Display Requirements

- Triage level badge with color coding:
  - LOW: green (#22c55e)
  - MEDIUM: amber (#f59e0b)
  - HIGH: red (#ef4444)
- Risk factors as bulleted list
- Inconsistencies as bulleted list (if any)
- Notes for physician as paragraph text
- Confidence as percentage (e.g., "85% confidence")
- Disclaimer: "This is an AI-assisted triage summary. A trained medical professional will review this information."
