<div align="center">

# TransCraft

**A full-stack monorepo starter: a Vite + Vue 3 + Arco Design frontend embedded into a Golang + Hertz backend, backed by MySQL/PostgreSQL and Redis.**

English | [简体中文](README.zh_CN.md)

</div>

## Directory Structure

```
├── cmd/server/        # Backend entrypoint
├── internal/
│   ├── config/        # Configuration loading and validation
│   ├── data/          # Database (GORM) and Redis connections
│   ├── httpapi/       # HTTP routes, handlers, and frontend asset hosting
│   └── webassets/     # Frontend build artifacts embedded via go:embed
├── configs/           # Configuration files
├── web/               # Frontend project (Vite + Vue)
└── docker-compose.yml # Local MySQL / PostgreSQL / Redis environment
```

## Quick Start

### 1. Start dependencies

```bash
docker compose up -d
```

### 2. Start the backend

PostgreSQL is the default; to switch databases, edit `database.driver` and `database.dsn` in `configs/config.yaml`.

```bash
go run ./cmd/server
```

The server listens on `127.0.0.1:8080` and exposes:

- `GET /ping` — liveness probe
- `GET /api/health` — database and Redis health check

### 3. Start the frontend (development mode)

```bash
cd web
pnpm install
pnpm dev
```

The dev server proxies `/api` to the backend at `127.0.0.1:8080`.

## Same-Origin Deployment (Production)

The frontend build artifacts are embedded into the backend binary via `go:embed` and served by Hertz on the same origin — similar to dropping a Vue app into Spring Boot's `public` folder:

```bash
cd web && pnpm build        # outputs to internal/webassets/dist
cd .. && go build -o transcraft-server.exe ./cmd/server
./transcraft-server.exe     # open http://127.0.0.1:8080 in your browser
```

API routes (`/ping`, `/api/*`) take precedence; all other requests are served as static files, and unmatched paths fall back to `index.html` to support frontend history routing. Deployment requires only the binary and `configs/config.yaml`.

## License

TransCraft is licensed under the [GNU Affero General Public License v3.0](LICENSE).
