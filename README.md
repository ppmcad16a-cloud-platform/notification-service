# MERN Ecommerce — Notification microservice

Express + MongoDB + Socket.IO microservice: the "contact us" form, order-confirmation email, and the real-time member<->admin support chat. Split out of the original `server/` monolith. Deployed/run independently of `identity_server`, `catalog_server`, `commerce_server`, and `api_gateway` — shares the MongoDB database and `JWT_SECRET` with them.

`commerce_server` calls this service's `POST /api/notification/order-confirmation` (internal, unauthenticated — trusted service-to-service call, not client-facing) right after placing an order, instead of sending mail in-process the way the original monolith did.

## Setup

```
cd notification_server
npm install
cp .env.example .env
```

Fill in `.env` the same way as `identity_server/README.md` describes (`PORT` defaults to `3104`), plus `MAIL_FROM` (optional — see `server/README.md`'s original description; email sending is mocked, logs instead of delivering).

## Run

```
npm run dev
npm run start
```

Routes: `/api/contact/*`, `/api/notification/order-confirmation` (internal), plus a Socket.IO server on the same port. Normally reached through `api_gateway`, not directly, in local dev.

## Testing

```
npm test           # jest --coverage
npm run test:watch
```

`jest.config.js` fails the run below **100% statements/branches/functions/lines** coverage — the same bar every other service in this project holds. An HTML report is written to `coverage/index.html`. Tests use `mongodb-memory-server` (no real Mongo needed), supertest against each router in isolation, and real `socket.io-client` connections for the support-chat handshake/events — see `tests/` for the shared setup.

Node's coverage tooling has no JaCoCo-style complexity counter; `npm run analyze:complexity` reports per-function cyclomatic complexity informationally (via a one-off `eslint` rule, not a committed ESLint config) instead of gating on it.

## Operations (Kubernetes / Docker)

| Endpoint | Used by | Meaning |
|---|---|---|
| `GET /health` | Liveness probe | Process is alive (does not touch the DB) |
| `GET /ready` | Readiness probe | `200` only while MongoDB is connected, else `503` |
| `GET /metrics` | Prometheus | `http_request_duration_seconds` by route template + Node.js process metrics |

- `/api/notification/*` is internal (called by commerce-service inside the cluster); the API gateway does **not** expose it.
- Support chat state is in memory, so run **one replica** per cluster (a Redis adapter would be needed to scale out).
- Logs: JSON lines on stdout (pino), `Authorization`/`Cookie` redacted. `LOG_LEVEL` controls verbosity.
- Startup: if the first MongoDB connection fails the process exits with code 1 (Kubernetes restarts it).
- Shutdown: on `SIGTERM` all chat sockets are closed, in-flight requests finish, MongoDB is closed, then exit.
- Image: `docker build -t notification-service:local .` (multi-stage, non-root, npm removed at runtime).