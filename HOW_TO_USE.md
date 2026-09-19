# Relay kaise use karein

Relay ek local desktop-agent workspace hai. Aap task natural language mein
likhte ho, Relay plan banata hai, activity dikhata hai, aur risky action se
pehle approval maangta hai.

## 1. Frontend start karein

Node.js installed hona chahiye.

```bash
npm install
npm run dev
```

Browser mein `http://127.0.0.1:5173/` open karein.

### UI mein example

Composer mein likhein:

```text
Mere project ko inspect karo aur batao ki next implementation step kya hona chahiye.
```

Phir arrow button press karein. Workspace mein aap dekh sakte hain:

- execution plan aur current step;
- Relay ki live activity aur reasoning;
- estimated cost aur token count;
- safety status;
- external action se pehle approval request.

`Pause run` se run pause/resume hota hai. `Review & approve` tab use karein
jab aap proposed action ko check kar chuke hon.

## 2. Local agent core start karein

Python 3.11+ recommended hai.

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
RELAY_TOKEN=local-dev-token uvicorn core.main:app --host 127.0.0.1 --port 8765
```

Health check:

```bash
curl http://127.0.0.1:8765/health
```

Expected response:

```json
{"status":"ok","service":"relay-core"}
```

Settings token ke saath hi milengi:

```bash
curl "http://127.0.0.1:8765/settings?token=local-dev-token"
```

## 3. WebSocket event example

Core WebSocket `127.0.0.1` par token ke saath connect hota hai. Python example:

```python
import asyncio
import json
import websockets


async def main():
    url = "ws://127.0.0.1:8765/ws?token=local-dev-token"
    async with websockets.connect(url) as socket:
        print(await socket.recv())
        await socket.send(json.dumps({
            "type": "task.submit",
            "payload": {"task_text": "Project folder inspect karo"},
        }))
        print(await socket.recv())
        print(await socket.recv())


asyncio.run(main())
```

Task submit karne par pehle `plan.created`, phir `step.started` event milega.
Full event list [docs/PROTOCOL.md](docs/PROTOCOL.md) mein hai.

## 4. Useful task examples

```text
Downloads folder mein latest PDF dhoondo aur uska naam batao. Kuch delete mat karna.
```

```text
Is project ka README summarize karo aur missing setup steps identify karo.
```

```text
Browser mein local test page kholo, form fields fill karo, lekin submit se pehle approval maango.
```

Sensitive ya irreversible kaam ke liye task mein boundary clearly likhein:

```text
Files read-only mode mein inspect karo. Koi file modify, delete, ya upload mat karo.
```

## 5. Common problems

**Port already busy hai:** Vite ya Uvicorn ko kisi doosre port par start karein.

```bash
npm run dev -- --host 127.0.0.1 --port 5174
RELAY_TOKEN=local-dev-token uvicorn core.main:app --host 127.0.0.1 --port 8766
```

**Token invalid aa raha hai:** frontend/client aur core ke token same hone chahiye.

**UI update nahi ho rahi:** browser refresh karein aur check karein ki `npm run dev`
process abhi chal raha hai.

## Current scope

Current build mein workspace UI aur protocol transport ready hain. Real Gemini
calls, Windows desktop actions, Electron packaging, recording, aur persistent
SQLite memory abhi next implementation layers hain. Approval bypass karke
desktop action auto-run nahi hota.