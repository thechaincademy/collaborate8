# Calm check: pending suggestions when Vertex is busy

For Jian. This is the contract for the Collabor8 calm check (`chat-rewrite`, `mode: "send"`) when Google Vertex in London is too busy to answer inside the app's first wait.

The parent can always send the original message while waiting. The pending state must never block sending.

## First request

`POST /functions/v1/chat-rewrite`

Body:

```json
{ "mode": "send", "draft": "<the parent draft>" }
```

The function always answers within about 3.3 seconds (the app waits about 4 seconds). The body is one of the following.

### Ready in time

```json
{ "status": "done", "needs_rewrite": true, "rewrite": "<calmer version>" }
```

or, if the draft is already fine or no valid calmer version could be written:

```json
{ "status": "done", "needs_rewrite": false, "rewrite": null }
```

`needs_rewrite` and `rewrite` are still present on a done response, so older clients that ignore `status` keep working.

### Vertex is busy

```json
{ "status": "pending", "job_id": "<uuid>", "eta_seconds": 12 }
```

The Vertex call keeps running in the background, with backoff, for up to about 30 seconds from the start of the first request. The original draft is held only in memory for that work. It is not written to a table and it is not logged.

## Poll for the result

`POST /functions/v1/chat-rewrite`

Use the same signed-in parent token as the first request. `mode` or `action` may be `"result"`.

```json
{ "mode": "result", "job_id": "<uuid from the pending response>" }
```

Responses:

```json
{ "status": "pending", "job_id": "<uuid>", "eta_seconds": 8 }
```

```json
{ "status": "done", "job_id": "<uuid>", "needs_rewrite": true, "rewrite": "<calmer version>" }
```

```json
{ "status": "done", "job_id": "<uuid>", "needs_rewrite": false, "rewrite": null }
```

```json
{ "status": "failed", "job_id": "<uuid>" }
```

```json
{ "status": "unknown", "error": "not_found" }
```

`unknown` is a 404: the job id is missing, expired (about 3 minutes), or belongs to another user. `failed` means Vertex still could not finish within about 30 seconds. In both cases, do not block sending. Hide the waiting message and leave the draft as the parent wrote it.

Poll every 1 second, or a little slower. Stop when the status is `done`, `failed`, or `unknown`, or when 30 seconds have passed since the first request.

`eta_seconds` is a fresh countdown from this response. If the job is still pending when the countdown reaches 0, poll again: the next pending response may include a new `eta_seconds` (about 8 more seconds).

## Suggested app copy

When the first response is `pending`, show:

> Our servers are busy. Your suggestion will be ready in about X seconds.

`X` starts at `eta_seconds` and counts down once a second. If a later poll returns a new `eta_seconds` while still pending, restart the countdown from that value.

When a poll returns `status: "done"` and `needs_rewrite: true`, replace the waiting message with the rewrite, the same way you do when the first response is already done.

When a poll returns `status: "done"` and `needs_rewrite: false`, hide the waiting message and leave the draft unchanged (the same as a done pass on the first response).

When the status is `failed` or `unknown`, hide the waiting message and leave the draft unchanged. Do not block send.

The parent can send the original message at any time while this is on screen. Sending must stay enabled. If they send before the suggestion arrives, discard the pending job and do not apply the rewrite to a message that has already gone.

## Notes for the implementation

- Do not log the draft, the rewrite, or any other message text.
- On the London test project, pending and done results are stored in `calm_check_jobs` for 10 minutes. The row holds only the suggested rewrite, never the original draft, and is readable only by that parent. After 10 minutes the row is deleted by an every-minute cleanup job (and also on the next write).
- If a poll returns `unknown`, the job is missing, expired, or belongs to another user. Treat that like `failed` and do not block send.
- Auth and Premium are checked in parallel with the Vertex call. A 401 or a Premium denial still wins, and the model reply is discarded.
- The Vertex OAuth token is cached in the isolate until shortly before it expires.
- Write "Collabor8". Do not use em dashes in user-facing copy.
