# Contributing to TransCraft | [贡献指南](CONTRIBUTING.zh_CN.md)

Thanks for your interest in contributing! Please read the [Code of Conduct](CODE_OF_CONDUCT.md) first. This document covers the development environment and workflow.

## Tech Stack

- **Backend**: Golang + [Hertz](https://github.com/cloudwego/hertz), GORM (MySQL / PostgreSQL), go-redis
- **Frontend**: Vite + Vue 3 + Arco Design + Sass + TypeScript
- **Dependencies**: MySQL / PostgreSQL and Redis via `docker-compose.yml`

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

## Development Setup

Start the dependencies, then the backend:

```bash
docker compose up -d
go run ./cmd/server
```

PostgreSQL is the default; to switch databases, edit `database.driver` and `database.dsn` in `configs/config.yaml`. The server listens on `127.0.0.1:8080` and exposes `GET /ping` (liveness) and `GET /api/health` (database and Redis health).

For frontend development with hot reload:

```bash
cd web
pnpm install
pnpm dev
```

By default `pnpm dev` serves mock API responses (see `web/mock/`), so the frontend works without a running backend. To develop against the real backend instead, disable the mock and the dev server will proxy `/api` to `127.0.0.1:8080`:

```bash
# Windows PowerShell
$env:MOCK_API='false'; pnpm dev

# macOS / Linux
MOCK_API=false pnpm dev
```

## Verification

Run these before submitting changes:

```bash
go build ./...
go vet ./...
go test ./...
cd web && pnpm build
```

Notes:

- `pnpm build` empties `internal/webassets/dist`, which deletes the committed `.gitkeep` placeholder; re-create it (`New-Item internal/webassets/dist/.gitkeep`) before committing.
- Follow the coding conventions in [AGENTS.md](AGENTS.md): no placeholder code, no silent error swallowing, and tests must verify real behavior.
- Commit messages follow Conventional Commits with a scoped Chinese subject, e.g. `feat(i18n): 支持平铺 JSON 语言文件解析`.

## License

By contributing, you agree that your contributions are licensed under the [GNU Affero General Public License v3.0](LICENSE).
