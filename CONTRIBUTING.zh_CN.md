# 贡献指南 | [Contributing to TransCraft](CONTRIBUTING.md)

感谢你的贡献意愿！开始前请先阅读[行为准则](CODE_OF_CONDUCT.zh_CN.md)。本文档介绍开发环境搭建与贡献流程。

## 技术栈

- **后端**：Golang + [Hertz](https://github.com/cloudwego/hertz)，GORM（MySQL / PostgreSQL），go-redis
- **前端**：Vite + Vue 3 + Arco Design + Sass + TypeScript
- **依赖服务**：通过 `docker-compose.yml` 启动 MySQL / PostgreSQL 与 Redis

## 目录结构

```
├── cmd/server/        # 后端入口
├── internal/
│   ├── config/        # 配置加载与校验
│   ├── data/          # 数据库（GORM）与 Redis 连接
│   ├── httpapi/       # HTTP 路由、处理器与前端产物托管
│   └── webassets/     # go:embed 内嵌的前端构建产物
├── configs/           # 配置文件
├── web/               # 前端工程（Vite + Vue）
└── docker-compose.yml # MySQL / PostgreSQL / Redis 本地环境
```

## 开发环境搭建

启动依赖服务与后端：

```bash
docker compose up -d
go run ./cmd/server
```

默认使用 PostgreSQL；切换数据库请修改 `configs/config.yaml` 中的 `database.driver` 与 `database.dsn`。服务监听 `127.0.0.1:8080`，提供 `GET /ping`（存活探测）与 `GET /api/health`（数据库与 Redis 健康检查）。

前端开发（热更新）：

```bash
cd web
pnpm install
pnpm dev
```

开发服务器已配置 `/api` 代理到后端 `127.0.0.1:8080`。

## 提交前验证

```bash
go build ./...
go vet ./...
go test ./...
cd web && pnpm build
```

注意事项：

- `pnpm build` 会清空 `internal/webassets/dist`，其中已入库的 `.gitkeep` 占位文件会被删除，提交前请重建（`New-Item internal/webassets/dist/.gitkeep`）。
- 编码规范见 [AGENTS.md](AGENTS.md)：禁止占位代码与静默吞错，测试必须验证真实逻辑行为。
- 提交信息遵循约定式提交（Conventional Commits），使用带作用域的中文摘要，例如 `feat(i18n): 支持平铺 JSON 语言文件解析`。

## 许可证

提交贡献即表示你同意以 [GNU Affero 通用公共许可证 v3.0](LICENSE) 授权你的贡献内容。
