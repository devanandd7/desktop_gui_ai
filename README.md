# Relay

Relay is a Windows-first desktop agent workspace: a transparent command center
for asking an AI to operate a computer with explicit approval at risky steps.

## Run the workspace

```bash
npm install
npm run dev
```

The first screen is a UI prototype with a task composer, execution plan, live
activity preview, safety state, and approval flow.

## Run the local core

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
RELAY_TOKEN=local-dev-token uvicorn core.main:app --host 127.0.0.1 --port 8765
```

See [docs/PROTOCOL.md](docs/PROTOCOL.md) for the versioned WebSocket event
contract. The desktop-control executor is intentionally not enabled yet.

For step-by-step usage and Hinglish examples, see [HOW_TO_USE.md](HOW_TO_USE.md).