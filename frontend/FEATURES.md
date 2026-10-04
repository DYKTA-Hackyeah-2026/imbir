# Acme AI — Web App Features Guide

Everything the app does, how to use each feature, how to reach it, and where it lives in the code.

---

## 1. What this app is

**Acme AI** is a React 19 + TypeScript single-page app (Vite) for an LLM chat/caching product. It provides:

- A full **authentication flow** — sign in, create account, forgot password, reset password.
- A **Chat** screen that talks to the backend LLM with optional token streaming, model selection, cache-space selection, and cache/token telemetry.
- An **Admin** console to manage the backend's response cache: overview stats, cache spaces (create/pause/resume/default/rename/move/delete), cache settings, and cache entries (list/purge/delete).
- Shared **auth/session** handling: JWT access token in memory, refresh token persisted, automatic refresh, protected routes.

The backend is `https://hackathon-backend.makonew.com`, called through same-origin paths (`/auth`, `/llm`, `/health`).

---

## 2. How to run it

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Start the Vite dev server (default `http://localhost:5173`) |
| `npm run build` | Type-check (`tsc -b`) then production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run Oxlint |

Open the URL Vite prints. The dev/preview server **proxies** `/auth`, `/llm`, and `/health` to the backend so browser requests are same-origin (see `vite.config.ts:12`). To call a different backend directly, set `VITE_API_URL` (see `src/lib/api.ts:10`).

---

## 3. Route map (how to get to every screen)

| Route | Screen | Access | Component |
| --- | --- | --- | --- |
| `/` | Sign in (with an inline reset view) | Public | `src/LoginPage.tsx` |
| `/sign-in` | Standalone sign in | Public | `src/SignInPage.tsx` |
| `/register` | Create account | Public | `src/RegisterPage.tsx` |
| `/forgot-password` | Request reset link | Public | `src/ForgotPasswordPage.tsx` |
| `/reset-password?token=…` | Choose new password | Public (needs email link) | `src/ResetPasswordPage.tsx` |
| `/chat` | Chat | **Signed in** | `src/ChatPage.tsx` |
| `/admin` | Admin console | **Signed in** | `src/AdminPage.tsx` |
| anything else | Redirect to `/` | — | `src/App.tsx:36` |

Routes are defined in `src/App.tsx:14`. `/chat` and `/admin` are wrapped in `RequireAuth` (`src/App.tsx:20`, `src/lib/auth.tsx:86`); if you are not signed in you are redirected to `/`.

> **Note:** `/sign-in` is registered but **not linked anywhere in the UI** — reach it by typing the URL. Likewise, `LoginPage` contains an inline "forgot password" view, but the visible link navigates to the dedicated `/forgot-password` route, so the inline view is currently unreachable.

---

## 4. Authentication & account features

### 4.1 Sign in — `/` (and `/sign-in`)

**What it does:** Authenticates an email + password against `/auth/login` and starts a session. On success it takes you to `/chat`.

**How to use:**
1. Open the app — the login card is the landing page.
2. Enter your **Email address** (validated: required, must look like `name@example.com`).
3. Enter your **Password** (required).
4. Click **Sign in** (or press Enter). The button shows a spinner and "Signing in…" while the request runs.
5. On failure, a red alert shows the server error message.

**How to get to it:** It is the app's default page. The login page's footer links to **Sign up** (`/register`). From `/chat` or `/admin`, signing out returns here.

**Where:** `src/LoginPage.tsx` (submit `:90`, validation `:36`), `src/SignInPage.tsx` (submit `:58`).

### 4.2 Password show / hide

**What it does:** Toggles the password field between masked and plain text.

**How to use:** Click the **eye icon** at the right of the Password field. It switches to a crossed-out eye when visible, with correct `aria-label`/`aria-pressed`.

**How to get to it:** On any password field (sign in, register, reset). In register/reset it toggles both password fields together.

**Where:** `src/LoginPage.tsx:249`, `src/SignInPage.tsx:187`, `src/RegisterPage.tsx:220`, `src/ResetPasswordPage.tsx:216`.

### 4.3 "Remember me" checkbox

**What it does:** A visual checkbox labelled **Remember me** next to the password.

> Currently **visual only** — its state is neither stored nor submitted. Session persistence actually comes from the refresh token (see 4.9), independent of this box.

**How to use:** Tick it before signing in.

**Where:** `src/LoginPage.tsx:278`, `src/SignInPage.tsx:214`.

### 4.4 Forgot password — `/forgot-password`

**What it does:** Requests a password-reset link by email (`POST /auth/forgot-password`). Always shows a neutral success panel so it doesn't leak whether an account exists.

**How to use:**
1. From the sign-in page, click **Forgot password?**.
2. Enter your **Email address** and click **Send reset link**.
3. A "Check your inbox" panel appears saying a link was sent and expires in 30 minutes. Click **Use a different email** to try again.

**How to get to it:** Link labelled **Forgot password?** right of the Password label on `/` and `/sign-in`, or the URL directly.

**Where:** `src/ForgotPasswordPage.tsx` (submit `:34`).

### 4.5 Create account — `/register`

**What it does:** Registers a new user (`POST /auth/register`) and signs them in, then goes to `/chat`.

**Password rules (enforced client-side):** 8–64 characters, at least one lowercase letter, one uppercase letter, and one digit. The confirm field must match.

**How to use:**
1. From the sign-in page click **Sign up**, or open `/register`.
2. Enter **Email address**, **Password**, and **Confirm password**.
3. Click **Create account**. Inline field errors appear per rule; a server-side conflict (HTTP 409) is shown as "That email is already registered."

**How to get to it:** **Sign up** link on `/` and `/sign-in`, or the URL.

**Where:** `src/RegisterPage.tsx` (validation `:27`, server-error mapping `:58`, submit `:89`).

### 4.6 Reset password — `/reset-password?token=…`

**What it does:** Lets a user set a new password using the token from the reset email (`POST /auth/reset-password`).

**How to use:**
1. Open the link from the password-reset email (it includes `?token=…`).
2. Enter a **New password** (same rules as registration) and **Confirm new password**.
3. Click **Update password**. On success you see "Password updated" (all other sessions are signed out) and a **Go to sign in** button.
4. If the link is invalid/expired (HTTP 400) you'll see an error asking for a new link.

**How to get to it:** Only via the emailed reset link. Opening the page **without** a token shows a "Missing reset token" alert.

**Where:** `src/ResetPasswordPage.tsx` (token read `:54`, submit `:71`, missing-token state `:159`).

### 4.7 Sign out

**What it does:** Calls `/auth/logout`, clears the stored session, and returns to the login page.

**How to use:** Click **Sign out** in the header (top-right).

**How to get to it:** Present on every signed-in screen (Chat, Admin).

**Where:** `src/components/AppHeader.tsx:39`.

### 4.8 Header & navigation

**What it does:** Sticky top bar shown on signed-in pages with the **Acme AI** brand (links to `/chat`), nav items **Chat** and **Admin** (active item highlighted), your email, and **Sign out**.

**How to use:** Click a nav item to switch screens.

**Where:** `src/components/AppHeader.tsx:35`.

### 4.9 Session handling, refresh & route protection

**What it does:**
- Stores the **refresh token** in `localStorage` (key `acme.refreshToken`); the access token is kept in memory only.
- On page load, restores the session by exchanging the refresh token (`POST /auth/refresh`).
- Automatically retries a request **once** after refreshing when it gets a `401`.
- Guards `/chat` and `/admin`: while restoring it shows a spinner; if anonymous it redirects to `/`.

**How to use:** Automatic. Just return later — if a valid refresh token exists you stay signed in; otherwise you're sent to sign in.

**Where:** `src/lib/api.ts:113`–`:202`, `src/lib/auth.tsx:27` (provider) and `:86` (guard).

---

## 5. Chat — `/chat` (signed in)

**What it does:** A conversational LLM client with caching controls and telemetry.

**How to get to it:** Sign in or register (lands here automatically), click **Chat** in the header, or open `/chat`.

**Where:** `src/ChatPage.tsx`.

### 5.1 Model selection
Type a model id, or pick from the suggestions loaded from `/llm/models` (the label shows how many are available). Leave it blank to use the server default. Default value is `inclusionai/ling-3.1-flash` (`src/ChatPage.tsx:47`).

### 5.2 Cache space
A text field (default `default`) sent as the `x-cache-space` header, so responses are cached in a named space. **Where:** `src/ChatPage.tsx:281`.

### 5.3 Streaming toggle
A **Stream** checkbox (on by default). On: replies stream token-by-token via SSE. Off: a single non-streamed response is requested. **Where:** `src/ChatPage.tsx:292`, streaming logic `:165`.

### 5.4 Backend status indicator
Shows **Checking backend…**, **Backend online** (green), or **Backend unavailable** (red) based on `/llm/health`. **Where:** `src/ChatPage.tsx:306`.

### 5.5 Sending messages
Type in the box and click **Send** (or press **Enter**). Use **Shift+Enter** for a new line. Send is disabled while the input is empty. The full conversation is sent as history each time. **Where:** `src/ChatPage.tsx:132`, `:229`.

### 5.6 Stop generating
While a reply is in progress the Send button becomes **Stop**, which aborts the request (shown as "Generation stopped."). **Where:** `src/ChatPage.tsx:236`.

### 5.7 Clear conversation
When at least one message exists, a **Clear** button empties the conversation. **Where:** `src/ChatPage.tsx:240`.

### 5.8 Message rendering & telemetry
- User messages appear right-aligned in the primary colour; assistant messages left-aligned in a muted bubble.
- **Reasoning:** if the model returns reasoning, it's shown in a collapsible "Reasoning" section.
- **Cache badge:** `cache hit`, `cache miss`, `not cached (stream)`, `cache paused`, `no cache space`, etc.
- **Tokens badge:** total tokens for the reply.
- A "Thinking…" spinner shows while waiting; auto-scroll keeps the newest message in view.

**Where:** `src/ChatPage.tsx:351`–`:405`.

---

## 6. Admin console — `/admin` (signed in)

**What it does:** Manages the LLM response cache. Four tabs plus a **Refresh** button.

**How to get to it:** Sign in and click **Admin** in the header, or open `/admin`.

**Where:** `src/AdminPage.tsx` (tabs `:38`).

### 6.1 Overview tab
Stat cards for **Cache entries**, **Cache hits**, and **Tokens**; a "Last 24 hours" row of event counts; and an **Effective configuration** panel (model, forced model, TTL in seconds, upstream base URL). **Where:** `src/AdminPage.tsx:291`.

### 6.2 Spaces tab
- **Create a space:** name, optional description, and a "Make this the default space" checkbox.
- **Space list:** each card shows name, status badge (`active`/`paused`), a ★ **default** marker, description, and entry/hit counts.
- **Actions per space:**
  - **Pause** / **Resume** — toggle caching for the space.
  - **Set default** — make it the default space.
  - **Rename** — prompts for a new name.
  - **Move entries** — prompts for a target space name and moves this space's entries there.
  - **Delete** — confirms, then deletes (disabled when fewer than two spaces exist).

**Where:** `src/AdminPage.tsx:344` (create `:143`, move `:172`, delete `:183`).

### 6.3 Settings tab
Edit and save backend cache settings: **Default model**, **Forced model** (when set, every chat request uses it regardless of client input), **Cache TTL (seconds)** (0 = no expiry), and **Upstream base URL**. **Where:** `src/AdminPage.tsx:511`, submit `:158`.

### 6.4 Entries tab
- Filter by **Space** (or All spaces) and click **Load** to list cache entries.
- Each entry shows its id, a few key fields, and a collapsible **Raw JSON** view.
- Delete a single entry with the trash button.
- **Purge space** removes all entries in the selected space; **Purge expired** removes expired entries everywhere (both ask for confirmation).

**Where:** `src/AdminPage.tsx:590`, purge `:210`.

---

## 7. Cross-cutting features

### 7.1 Light / dark theme
Design tokens define a light palette (`:root`) and a dark palette (`.dark`) via CSS variables mapped through `@theme inline`. Add the `dark` class to `<html>`/`<body>` to switch. No on-screen toggle is provided. **Where:** `src/index.css:29`–`:69`.

### 7.2 Accessibility (a11y)
- Page headings get focus on mount; topic changes move focus.
- Forms use `<Label>`, `aria-required`, `aria-invalid`, `aria-describedby`, and `role="alert"` for errors.
- Submit buttons expose `aria-busy`; the password toggle exposes `aria-pressed`; decorative icons are `aria-hidden`.
- Status panels use `role="status"` + `aria-live="polite"`.
- Visible focus rings throughout.

### 7.3 Reusable UI components (shadcn/ui on Base UI)
| Component | Variants / options | Where |
| --- | --- | --- |
| `Button` | variants: `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`; sizes: `default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg` | `src/components/ui/button.tsx` |
| `Card` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`; `size` = `default` \| `sm` | `src/components/ui/card.tsx` |
| `Input` | Text/email/etc. with focus, invalid, disabled states | `src/components/ui/input.tsx` |
| `Label` | Accessible form label | `src/components/ui/label.tsx` |

Icons come from `lucide-react`. Class merging uses `cn()` (`src/lib/utils.ts`).

### 7.4 API client & error handling
`src/lib/api.ts` is the single API client. Notable behaviours:
- `ApiError` with `status`, `code`, and structured `details`.
- `errorMessage()` maps known cases (rate limits, 502/unavailable) to friendly text.
- `validationDetails()` extracts per-field validation errors for forms.
- Streaming decoder handles SSE, a JSON-string-wrapped SSE stream, and plain JSON errors defensively (`chatStream`, `src/lib/api.ts:446`).

**Endpoints used:** `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/refresh`, `/auth/me`, `/auth/forgot-password`, `/auth/reset-password`; `/health`, `/health/ready`; `/llm/health`, `/llm/models`, `/llm/chat/completions`; and the `/llm/admin/*` cache-management endpoints.

### 7.5 Configuration
- `VITE_API_URL` — optional absolute backend base URL (defaults to same-origin).
- Dev/preview proxy for `/auth`, `/llm`, `/health` (`vite.config.ts:12`).
- Path alias `@` → `src` (`vite.config.ts:22`).

---

## 8. Project structure

```
src/
├── main.tsx                    # Entry: BrowserRouter > AuthProvider > App
├── App.tsx                     # All routes + route guards
├── LoginPage.tsx               # Sign in (+ inline reset view)
├── SignInPage.tsx              # Standalone sign in
├── RegisterPage.tsx            # Create account
├── ForgotPasswordPage.tsx      # Request reset link
├── ResetPasswordPage.tsx       # Choose new password (?token=)
├── ChatPage.tsx                # Chat with streaming/cache controls
├── AdminPage.tsx               # Cache admin (Overview/Spaces/Settings/Entries)
├── App.css                     # Unused Vite starter styles
├── index.css                   # Tailwind import + light/dark theme tokens
├── components/
│   ├── AppHeader.tsx           # Sticky header: nav + user + sign out
│   └── ui/                     # button, card, input, label
├── lib/
│   ├── api.ts                  # API client, session storage, streaming
│   ├── auth.tsx                # AuthProvider, useAuth, RequireAuth
│   └── utils.ts                # cn() class-merge helper
└── assets/                     # hero.png, react.svg, vite.svg
public/                         # favicon.svg, icons.svg, vite.svg
```

> `src/App.tsx` also references an unused Vite starter demo via `src/App.css` and `src/assets/`; that demo is not rendered.

## 9. Tech stack

- **React 19** + **TypeScript**
- **Vite 8** (dev server, build, proxy)
- **Tailwind CSS v4** (`@tailwindcss/vite`)
- **shadcn/ui** components on **Base UI** (`@base-ui/react`), styled with `class-variance-authority`, `clsx`, `tailwind-merge`
- **lucide-react** icons
- **react-router-dom v7** for routing
- **Oxlint** for linting
