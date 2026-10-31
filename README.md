# notification-service

Messages for the MERN shop: the "contact us" form, the order-confirmation e-mail and the real-time support chat between members and admins.

**Stack:** Node.js 22 · Express · Socket.IO · Mongoose · pino · prom-client

## Where it fits

| | |
|---|---|
| **Called by** | [api-gateway-service](https://github.com/ppmcad16a-cloud-platform/api-gateway-service) (`/api/contact`, `/socket.io`); [commerce-service](https://github.com/ppmcad16a-cloud-platform/commerce-service) (`POST /api/notification/order-confirmation`, in-cluster only) |
| **Depends on** | MongoDB (shared database `mern_ecommerce`); JWTs issued by [identity-service](https://github.com/ppmcad16a-cloud-platform/identity-service) |
| **Built by** | [core-cloud-platform](https://github.com/ppmcad16a-cloud-platform/core-cloud-platform) `node-app.yaml@v2` |
| **Deployed by** | [platform-deployments](https://github.com/ppmcad16a-cloud-platform/platform-deployments) (Helm + Jenkins) |

`/api/notification/*` is internal and unauthenticated by design: the API gateway does not expose it, and the Kubernetes NetworkPolicy only lets commerce-service and the gateway reach this service.

## Configuration

| Variable | Meaning | Default |
|---|---|---|
| `PORT` | listen port (HTTP + Socket.IO) | `3104` |
| `MONGO_URI` | MongoDB connection string including the database name | — |
| `JWT_SECRET` | shared secret, identical in every service | — |
| `BASE_API_URL` | path prefix | `api` |
| `MAIL_FROM` | sender address for e-mails (sending is simulated: messages are logged, not delivered) | empty |
| `LOG_LEVEL` | `trace` … `silent` | `info` |

## Run and test

```bash
npm ci
cp .env.example .env
npm run dev               # or: npm start
npm test                  # Jest, fails below 100 % coverage
```

Tests use `mongodb-memory-server`, supertest per router and real `socket.io-client` connections for the chat handshake and events.

## Container and operations

```bash
docker build -t notification-service:local .     # multi-stage, non-root, npm removed at runtime
```

| Endpoint | Used by | Meaning |
|---|---|---|
| `GET /health` | liveness probe | process alive |
| `GET /ready` | readiness probe | `200` only while MongoDB is connected |
| `GET /metrics` | Prometheus | `http_request_duration_seconds` by route + process metrics |

* Chat state is kept in memory, so the service runs **one replica per cluster**.
* JSON logs; `Authorization` and `Cookie` redacted. User-supplied text is HTML-escaped in e-mail templates.
* Fails fast if the first MongoDB connection fails; on `SIGTERM` closes chat sockets, finishes requests, closes MongoDB.

## CI/CD

Pull requests run tests, gitleaks and a Trivy-scanned image build; merges to `main` publish `notification-service:main-<sha>` to ECR, ACR and Artifact Registry and trigger the Jenkins rollout. See the [CI/CD chapter](https://github.com/ppmcad16a-cloud-platform/core-cloud-platform/blob/main/docs/06-ci-cd.md).
