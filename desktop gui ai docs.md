# DETAILED TECH STACK (add this to the master prompt; it replaces the short stack list in section 2)

Rule for the AI builder: always install the LATEST STABLE version of each package and check its current docs. Pin exact versions in `requirements.txt` / `package-lock.json` after the first successful build. Do not invent APIs; read the docs.

---

## 1. Architecture at a glance

```
┌────────────────────────── Electron App (UI) ──────────────────────────┐
│ React + TypeScript + Tailwind + shadcn/ui + Zustand                   │
│ Chat | Activity panel | Skill library | Recorder | History | Settings │
└───────────────▲──────────────────────────────────┬────────────────────┘
      WebSocket (JSON events) + REST, 127.0.0.1 only, per-launch token
┌───────────────┴──────────────────────────────────▼────────────────────┐
│ Python Agent Core (FastAPI, asyncio), launched by Electron as sidecar │
│ Orchestrator → Planner → Executor → Verifier → Replanner              │
│ Perception | Actions | Safety | Memory | Learning | Observability     │
└──────┬───────────────┬────────────────┬───────────────┬───────────────┘
       │               │                │               │
   Gemini API      OS control       SQLite + vectors   OS keychain
 (google-genai)  (Windows APIs)     + files on disk    (secrets)
```

Why two languages: Python has the best libraries for screen capture, input control, Windows UI Automation, video and AI. Electron/React gives the best ChatGPT-style UI. They talk over a local WebSocket, so each side stays simple.

---

## 2. AI / LLM layer

| Item | Choice | Notes |
|---|---|---|
| SDK | `google-genai` (official Google Gen AI SDK, Python) | Not the old `google-generativeai`. Confirm current package name in docs. |
| Computer control model | Current recommended Computer Use model from Gemini docs (Gemini 3.x Flash line, e.g. `gemini-3.8-flash`; verify) | Enable via the `computer_use` tool with the desktop/browser environment setting. Confirm exact enum and action names in docs. |
| Planner / verifier model | Configurable; default same model, optionally a stronger "Pro" model for planning and final verification | Store model IDs in settings, never hardcode. |
| Video analysis (Learn Mode) | Gemini video understanding + Files API | Upload recording, ask for strict JSON skill schema. |
| Embeddings (skill and memory search) | Gemini embedding model (verify current ID in docs) | Fallback: local `sentence-transformers` for offline mode. |
| Structured output | Pydantic models to JSON Schema, passed as response schema | Validate every model response; auto-repair once, then fail safely. |
| Resilience | `tenacity` for retries, exponential backoff, quota-aware | Track tokens and cost per run. |
| Safety hooks | Handle the API's `safety_decision` / confirmation flow | Route to the approval UI. |

---

## 3. Python backend (Agent Core)

**Runtime:** Python 3.11 or 3.12, `uv` (or `poetry`) for dependency management, virtual env.

**Core**
- `fastapi`, `uvicorn[standard]`: local API + WebSocket server
- `pydantic` v2, `pydantic-settings`: schemas, config
- `asyncio`, `anyio`: concurrency (agent loop must never block the UI)
- `orjson`: fast JSON
- `structlog`: structured logging
- `tenacity`: retries
- `typer`: dev CLI (run agent without UI, run benchmarks)

**Perception (seeing the screen)**
- `mss`: fast multi-monitor screenshots
- `Pillow`: resize, crop, annotate, redact regions
- `opencv-python` (or `opencv-python-headless`) + `numpy`: screen-diff to detect "UI settled", loop detection via image hashing
- `imagehash`: perceptual hash for repeated-state detection
- `rapidocr-onnxruntime` (or `pytesseract`): OCR fallback and text hints
- `pywinauto` + `uiautomation`: Windows UI Automation tree (button names, fields, window structure)
- `pygetwindow`, `psutil`: active window, process info

**Action (controlling the computer)**
- `pyautogui`: mouse, keyboard, scroll, drag (with failsafe on)
- `pynput`: global input listeners (Learn Mode) and hotkeys
- `pywin32` (`win32api`, `win32gui`, `win32con`): reliable focus, window control, SendInput
- `pyperclip`: clipboard-based typing for non-ASCII text (Hindi/Unicode typing is unreliable with key events)
- Windows DPI awareness: call `SetProcessDpiAwareness` at startup; centralize coordinate mapping in one module

**Browser tasks (more reliable than pure vision)**
- `playwright` (Python) with Chromium: DOM-aware actions, screenshots, persistent profile
- Decision rule: web page → Playwright + vision; native app → vision + UI Automation

**Recording (Learn Mode)**
- `ffmpeg` binary (bundled) driven via `subprocess` or `imageio-ffmpeg`, for screen video (`gdigrab` on Windows)
- `pynput` for timestamped mouse and keyboard event log
- `sounddevice` (optional) for narration audio; Gemini can transcribe, so no local speech model is required

**Storage and memory**
- `sqlite3` via `SQLAlchemy 2.x` + `alembic` for migrations
- `sqlite-vec` for vector search inside SQLite (or `chromadb` if you prefer a separate store)
- Files on disk: `runs/<run_id>/step_<n>.png`, `recordings/<id>.mp4`, JSON skill exports
- `cryptography` (Fernet/AES) for encrypting personal data stored in memory
- `keyring`: OS credential store for the Gemini API key and saved credentials

**Security**
- `secrets` module for per-launch WebSocket token
- `presidio-analyzer` (optional): detect PII before logs or uploads
- Custom `injection.py`: patterns + a small LLM classifier for "on-screen text trying to give instructions"

**Quality tooling**
- `pytest`, `pytest-asyncio`, `pytest-cov`, `hypothesis` (coordinate mapping fuzz tests)
- `ruff` (lint + format), `mypy` (strict typing), `pre-commit`
- `vcrpy` or custom fixtures to replay recorded Gemini responses in tests (no API cost in CI)

---

## 4. Frontend (Electron + React)

- `electron` (latest stable) + `electron-vite` or `vite` + `vite-plugin-electron`
- `react` 18/19 + `typescript` (strict)
- `tailwindcss` + `shadcn/ui` + `lucide-react`: ChatGPT-like clean UI
- `zustand`: state; `@tanstack/react-query`: REST caching
- `react-markdown` + `remark-gfm` + `rehype-highlight`: message rendering
- `framer-motion`: subtle animations for step status
- `react-virtuoso`: long chat/log lists
- `zod`: validate every incoming WebSocket event
- `i18next`: English/Hindi UI strings
- `electron-store` (non-sensitive settings only)
- Electron security: `contextIsolation: true`, `nodeIntegration: false`, strict CSP, preload script with a minimal API surface, `sandbox: true`
- Tray icon, global shortcuts (Electron `globalShortcut`), window that can shrink to a small floating "agent status" bar while the agent works
- Testing: `vitest`, `@testing-library/react`, Playwright for Electron E2E

---

## 5. Backend to UI protocol (define in `docs/PROTOCOL.md`)

WebSocket JSON events, versioned. Example event types:
- UI → core: `task.submit`, `task.pause`, `task.resume`, `task.stop`, `approval.respond`, `user.interject`, `learn.start`, `learn.stop`, `skill.run`
- core → UI: `plan.created`, `plan.updated`, `step.started`, `step.screenshot`, `action.proposed`, `approval.required`, `step.verified`, `task.completed`, `task.failed`, `cost.update`, `alert.injection_detected`

REST endpoints for CRUD: `/skills`, `/runs`, `/memory`, `/settings`. All require the launch token; bind to `127.0.0.1` only.

---

## 6. Database schema (SQLite), starting point

- `runs(id, task_text, status, started_at, ended_at, cost_usd, tokens_in, tokens_out, summary)`
- `steps(id, run_id, idx, intent, expected_outcome, status, screenshot_before, screenshot_after, verifier_result_json)`
- `actions(id, step_id, type, params_json, risk_level, approved_by, executed_at, result)`
- `skills(id, name, description, version, schema_json, embedding, created_from_recording_id, success_rate, last_used_at)`
- `skill_versions(id, skill_id, version, schema_json, changelog)`
- `memories(id, kind, key, value_encrypted, embedding, created_at, source_run_id)`
- `recordings(id, video_path, events_path, transcript, status)`
- `audit_log(id, ts, event_type, payload_json)` (append-only)
- `settings(key, value)` (no secrets here)

---

## 7. Gemini integration details the builder must implement

1. Client wrapper `model_client.py` with: retries, timeouts, streaming, cost tracking, model routing (planner vs executor).
2. The agent loop from Google's docs: send screenshot + prompt + Computer Use tool → receive `function_call` → your code executes it → send back the new screenshot as the function response → repeat.
3. Handle Gemini 3.x reasoning "intent" text returned with each action; show it in the UI activity panel.
4. Handle confirmation-required actions from the API safety system → show approval modal.
5. Keep conversation history compact: keep the last few screenshots, summarize older steps as text.
6. Files API for video upload in Learn Mode, poll until processed, then request the skill JSON.
7. Log every request/response (screenshots redacted) to the audit log.

---

## 8. Packaging, distribution, CI

- Backend to single exe: `PyInstaller` (or `Nuitka`) producing `agent-core.exe`
- Electron installer: `electron-builder` (NSIS installer for Windows), bundle `agent-core.exe`, `ffmpeg.exe`, and Playwright's Chromium
- Auto-update later: `electron-updater`
- Code signing: plan for a Windows code-signing certificate (avoids SmartScreen warnings)
- CI: GitHub Actions (`windows-latest`): lint, type-check, unit tests, build installer artifact
- Crash and diagnostics: local diagnostics export zip (logs + config, no secrets)

---

## 9. Suggested repository layout

```
gui-agent/
  apps/
    desktop/            Electron + React app
  core/                 Python agent core (package: agent_core)
    agent_core/
      orchestrator/ planner/ executor/ verifier/ perception/
      actions/ safety/ memory/ learning/ observability/ api/
    tests/
    pyproject.toml
  benchmarks/           golden tasks + local HTML test forms
  docs/                 ARCHITECTURE, RESEARCH, DECISIONS, SECURITY, PROTOCOL, SKILL_SCHEMA
  scripts/              dev, build, package
  .github/workflows/
```

---

## 10. Platform notes

- **Windows first:** UI Automation, `pywin32`, `gdigrab`. Put all OS-specific code behind a `PlatformAdapter` interface (`capture()`, `click()`, `type()`, `list_windows()`, `focus()`, `record()`), so macOS (`pyobjc`, Accessibility API, `screencapture`) and Linux (`xdotool`/`ydotool`, AT-SPI) can be added later.
- **Do not auto-approve** Windows UAC or secure-desktop prompts; hand control to the user.
- **Multi-monitor and DPI:** test at 100%, 125%, 150%, 200% scaling.
- **Unicode typing (Hindi):** use clipboard paste, restore the user's clipboard afterwards.

---

## 11. Optional upgrades (after v1)

- Voice control (Gemini Live API) for "talk to your computer"
- Mobile companion to trigger tasks remotely (only with strong auth)
- Cloud sync for skills (end-to-end encrypted)
- Local small model as a fast pre-filter for safety checks
- Skill marketplace (import/export signed skill packs)