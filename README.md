# Parso — Developer Utility & Decoding Suite

**Parso** is a fast, privacy-first developer utility suite built with modern React, TypeScript, Tailwind CSS, and Node.js. It brings together the most essential daily engineering tools into a single, cohesive workspace with zero tracking, zero latency, and client-side execution.

---

## 🚀 Key Features & Modules

### 1. 🔑 JWT Debugger & Signature Verifier
- **Client-Side Verification**: Verify HMAC-SHA256 (HS256) signatures entirely within your browser using the native Web Crypto API. Your secret keys never leave your machine.
- **Claims Inspector**: Real-time decode of Header and Payload with human-readable Unix timestamp conversion (`exp`, `iat`, `nbf`) and expiration status indicators.
- **Token Signing**: Generate and re-sign tokens instantly when modifying claims or secrets.
- **Pre-loaded Presets**: Quick templates for active tokens, expired tokens, and RBAC authentication structures (Clerk, Auth0).
- **One-Click Export**: Easily copy the raw JWT, individual JSON claims, or ready-to-use `Authorization: Bearer <token>` headers.

### 2. 📄 JSON Studio & Diff
- **Formatter & Validator**: Instant syntax validation with customizable indentation (2 spaces, 4 spaces, tabs) and alphabetical key sorting.
- **Structural Diff Engine**: Compare two JSON payloads side-by-side with recursive structural path comparison, highlighted additions/deletions/modifications, and summary metrics.
- **Schema Validation**: Validate JSON payloads against standard JSON schemas with clear error diagnostics.
- **Minifier & Downloader**: Minify JSON payloads for production transmission or download formatted files directly.

### 3. ⏰ Cron Expression Generator & Visualizer
- **Human English Translation**: Translates 5-part Unix cron syntax (`* * * * *`) into plain English descriptions in real time.
- **Upcoming Execution Dates**: Calculates and displays the next 10 upcoming execution dates and timestamps with relative countdowns.
- **Visual Schedule Builder**: Interactive sliders and selectors for Minute, Hour, Day of Month, Month, and Day of Week.
- **Common Presets**: Quick shortcuts for hourly, daily, midnight, business hours, and weekly schedules.
- **Optional AI Assistant**: Generate cron expressions from natural language prompts using Gemini.

### 4. 🔍 Regex Tester & AST Explainer
- **Interactive Match Highlighting**: Live regex evaluation with real-time match boundaries and capture group table breakdowns.
- **Embedded AST Explainer**: Built-in AST tokenizer breaks down regex patterns into tokens, anchors, quantifiers, and character classes without requiring external network requests.
- **Flags & Presets**: Toggle global (`g`), case-insensitive (`i`), multiline (`m`), and dotAll (`s`) flags with pre-configured patterns for Emails, URLs, SemVer, UUIDs, and more.
- **AI Deep Explainer**: Optional server-side analysis explaining potential edge cases, optimization tips, and catastrophic backtracking risks.

### 5. ⚡ cURL Executor & API Client
- **Bi-Directional cURL Sync**: Paste cURL commands directly from Chrome DevTools or documentation, or build requests visually.
- **Visual Builder**: Manage Query Parameters, Headers, Request Body (JSON, Raw, Form URL-encoded), and Authentication (Bearer tokens, Basic Auth).
- **Adjustable Split View**: Interactive, draggable vertical splitter between Request and Response panels with persistent width preference in `localStorage`.
- **CORS-Bypassing Proxy**: Toggle between server-side proxy execution (bypasses CORS restrictions) and direct client fetch.
- **Response Inspector**: Detailed status badges, latency timing (`ms`), response size, formatted body viewer, and complete response headers table.
- **Multi-Language Code Export**: Export any request to JavaScript (Fetch, Axios), Python (Requests, HTTPX), Go, or formatted cURL commands.
- **Saved Collections**: Bookmark and tag frequently used requests with local browser persistence and one-click rerun.

### 6. 🔤 Quick Base64 Modal
- Global popup accessible via header or keyboard shortcuts (`⌘+K` / `Ctrl+K`).
- Instant Base64 encode and decode for strings and JSON payloads.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Motion, Lucide React
- **Backend**: Express, Node.js (with `tsx` for development and `esbuild` for production bundling)
- **AI Integration**: Google GenAI SDK (`@google/genai`) for optional Gemini-powered utilities
- **Security**: In-memory execution, client-side cryptography, zero third-party telemetry

---

## 🏁 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` or `yarn`

### Installation

1. Clone or download the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Configuration

Create a `.env` file in the root directory (optional, only needed for AI-assisted features):

```env
# Optional: Required for Gemini-powered Regex & Cron explanations
GEMINI_API_KEY=your_gemini_api_key_here
```

### Running Locally

- **Development Mode** (boots backend server and Vite middleware on port 3000):
  ```bash
  npm run dev
  ```
  Open [http://localhost:3000](http://localhost:3000) in your browser.

- **Type Checking / Linting**:
  ```bash
  npm run lint
  ```

- **Production Build**:
  ```bash
  npm run build
  ```

- **Production Start**:
  ```bash
  npm start
  ```

---

## 🔒 Privacy & Architecture

- **Zero Data Harvesting**: Tokens, secrets, regex strings, and JSON data are parsed and processed locally inside the browser.
- **Server Proxy**: The cURL API executor uses an isolated server proxy route (`/api/curl/execute`) only when requested, enabling developers to test third-party endpoints without browser CORS errors.
- **Safe Secrets Handling**: Any configured API keys (such as `GEMINI_API_KEY`) remain strictly server-side and are never exposed to the client bundle.

---

## 📄 License

MIT License. Free and open source for developers everywhere.
