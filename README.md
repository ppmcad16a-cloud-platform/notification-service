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
