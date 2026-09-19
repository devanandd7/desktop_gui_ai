# Relay protocol

The desktop client and local agent core communicate over a token-protected
WebSocket bound to `127.0.0.1`. Every event has a protocol `version`, event
`type`, ISO-8601 timestamp, and `payload` object.

## Client to core

- `task.submit` with `{ "task_text": string }`
- `task.pause`, `task.resume`, `task.stop`
- `approval.respond` with `{ "approved": boolean }`
- `user.interject` with `{ "text": string }`

## Core to client

- `core.ready`
- `plan.created`, `plan.updated`
- `step.started`, `step.screenshot`, `step.verified`
- `action.proposed`, `approval.required`
- `task.completed`, `task.failed`
- `cost.update`, `alert.injection_detected`

The initial server implements transport and acknowledgement paths. Desktop
control belongs behind the executor and platform adapter boundary; it must not
be added directly to the WebSocket handler.