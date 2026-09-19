"""Local Relay protocol server and transport boundary."""
import asyncio
import os
import secrets
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect

app = FastAPI(title="Relay Agent Core", version="0.1.0")
LAUNCH_TOKEN = os.getenv("RELAY_TOKEN") or secrets.token_urlsafe(24)


def event(event_type: str, payload: dict[str, Any]) -> dict[str, Any]:
    return {"version": 1, "type": event_type, "ts": datetime.now(timezone.utc).isoformat(), "payload": payload}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "relay-core"}


@app.get("/settings")
async def settings(token: str = Query(...)) -> dict[str, str]:
    if not secrets.compare_digest(token, LAUNCH_TOKEN):
        raise HTTPException(status_code=401, detail="Invalid launch token")
    return {"planner_model": "gemini-balanced", "executor_model": "gemini-balanced", "mode": "safe"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query("")) -> None:
    if not secrets.compare_digest(token, LAUNCH_TOKEN):
        await websocket.close(code=1008, reason="Invalid launch token")
        return
    await websocket.accept()
    await websocket.send_json(event("core.ready", {"message": "Relay core connected", "mode": "safe"}))
    try:
        while True:
            message = await websocket.receive_json()
            message_type = message.get("type")
            if message_type == "task.submit":
                task_text = str(message.get("payload", {}).get("task_text", "")).strip()
                if not task_text:
                    await websocket.send_json(event("task.failed", {"reason": "Task text is required"}))
                    continue
                await websocket.send_json(event("plan.created", {"task_text": task_text, "steps": ["Inspect workspace", "Draft a response", "Request confirmation"]}))
                await asyncio.sleep(0)
                await websocket.send_json(event("step.started", {"idx": 0, "intent": "Inspect the workspace"}))
            elif message_type in {"task.pause", "task.resume", "task.stop", "approval.respond"}:
                await websocket.send_json(event("ack", {"for": message_type}))
            else:
                await websocket.send_json(event("alert.unknown_event", {"type": message_type}))
    except WebSocketDisconnect:
        return