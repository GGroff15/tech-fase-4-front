Project-specific Copilot instructions

Summary
- This is a small Angular 20 application using the standalone component API and `bootstrapApplication` (no NgModule). Key entry points and patterns are documented below so AI agents can be productive immediately.

Quick start commands
- Development server: `npm start` (delegates to `ng serve`) — see [package.json](package.json#L1-L20).
- Build: `npm run build` (`ng build`) — configured in [angular.json](angular.json#L1-L40).
- Tests: `npm test` (`ng test`, Karma) — see [package.json](package.json#L1-L20) and [angular.json test config](angular.json#L60-L110).

Architecture & patterns (what to know)
- Bootstrapping: application is bootstrapped with `bootstrapApplication(App, appConfig)` in [src/main.ts](src/main.ts#L1-L6). Work from there for global providers or app-level changes.
- App config & providers: global providers (router, error listeners, zone change detection) are in [src/app/app.config.ts](src/app/app.config.ts#L1-L40). Prefer adding app-wide providers here.
- Routing: routes are provided via `provideRouter(routes)` and declared in [src/app/app.routes.ts](src/app/app.routes.ts#L1-L5). The file is currently an empty array — add routes here.
- Components: components are standalone (see `App` in [src/app/app.ts](src/app/app.ts#L1-L30)). The code uses signals (`signal(...)`) for local reactive state — follow this pattern when adding small local state.
- Templates and styling: component template is at [src/app/app.html](src/app/app.html) and styles referenced in the component file. Large static assets live in the `public/` folder (configured in [angular.json assets](angular.json#L1-L40)).

Conventions & gotchas observed
- No `NgModule` usage — prefer standalone components + `provideRouter` and `bootstrapApplication` for new features.
- Routing is centralized in `src/app/app.routes.ts`; don't scatter route arrays across many files.
- Global app-wide providers live in `app.config.ts` — inject there rather than in component constructors when the scope should be application-wide.
- Tests use Karma and the Angular test builder; run `npm test` locally to validate.

Integration points
- Static assets and public files served from the `public/` directory (referenced in [angular.json](angular.json#L1-L40)).
- No backend client or API service files found in `src/` — if integrating APIs, add a clear `src/app/services/` folder and register providers in `app.config.ts`.

How to modify safely (examples)
- Add a route: update [src/app/app.routes.ts](src/app/app.routes.ts#L1-L5) and add a standalone component, then register its path in the routes array.
- Add a global provider: update [src/app/app.config.ts](src/app/app.config.ts#L1-L40) and restart `ng serve`.
- Local state: create signals inside components (see `signal` usage in [src/app/app.ts](src/app/app.ts#L1-L20)).

When in doubt
- Look at [src/main.ts](src/main.ts#L1-L6) and [src/app/app.config.ts](src/app/app.config.ts#L1-L40) first — they define app startup and global behavior.

Notes for the developer (editable)
- If you want more detailed suggestions (tests, lint rules, CI), tell me which areas to expand and I will update this file.

---
Frontend MVP: Assisted Medical Triage UI

Purpose
- This project will implement a minimal single-screen SPA for assisted medical triage. The frontend is intentionally thin: it orchestrates user actions and forwards data to the backend. All intelligence and triage decisions live on the server.

Required implementation checklist for AI agents
- Single page: keep UI inside one route/component (suggest `src/app/triage.ts` as a standalone component).
- On load: call `POST /session`, store returned `correlationId` in-memory on the component (do not persist to storage).
- WebRTC: request camera+mic, start streaming and pass `correlationId` to the signaling layer. Provide simple start/stop controls.
- Form: implement a reactive form (Angular `FormGroup`) with basic validation (required where appropriate). Submit to `POST /form` with `correlationId` in payload.
- Stop streaming when the form is submitted.
- Show statuses: `INIT`, `STREAMING`, `SUBMITTED`, `DONE` (map to UI labels like "Recording audio and video", "Submitting information", "Analyzing data").
- Display result: show backend response unmodified and mark it clearly as "AI-assisted".

Files & patterns to follow in this repo
- Entry: `src/main.ts` uses `bootstrapApplication(App, appConfig)`; add your component and route and register in `src/app/app.routes.ts`.
- Global providers: update `src/app/app.config.ts` only if you need app-scoped services (router, error listeners are already provided).
- New components: create standalone components (exported class with `@Component({ standalone: true, imports: [...] })`) rather than adding NgModules.
- Services: add API + WebRTC helpers under `src/app/services/` and register providers in `app.config.ts` if they need to be singletons.
- Assets: use `public/` for static images or placeholder media referenced by the UI.

API & network expectations (MVP)
- POST /session → { correlationId: string }
- POST /form with body { correlationId, formData } → { triageResult }
- No websockets are expected for the MVP; if using signaling for WebRTC, a minimal HTTP-based signaling exchange is acceptable.

State model example (implement inside component)
```ts
type UiStatus = 'INIT' | 'STREAMING' | 'SUBMITTED' | 'DONE';

interface FrontendState {
	correlationId: string;
	status: UiStatus;
	triageResult?: any;
}
```

Implementation notes and examples
- Reactive form: use `import { FormBuilder, ReactiveFormsModule } from '@angular/forms'` and add `ReactiveFormsModule` to the component `imports`.
- Camera preview: use `<video autoplay muted playsinline></video>` bound to the local `MediaStream` via `HTMLVideoElement.srcObject`.
- WebRTC: keep the client-side implementation simple — only acquire MediaStream and create a PeerConnection if required by your signaling flow; no client-side media processing.
- UX: disable the submit button after click, show a spinner, and surface a simple error message on failure.

Testing & verification
- Run `npm start` to test locally and `npm test` for unit tests.
- Add unit tests for the component's form validation and the API service (Karma + Jasmine are available in devDependencies).

Non-goals
- Do not add authentication, session persistence across reloads, complex error recovery, or client-side AI processing.

Feedback
- If any backend contract details differ (endpoints, response shapes, signaling method), update the API section accordingly and notify reviewers.

