<div align="center">

# TransCraft

**全栈单仓项目脚手架：Vite + Vue 3 + Arco Design 前端内嵌进 Golang + Hertz 后端，数据库 MySQL / PostgreSQL，缓存 Redis。**

[English](README.md) | 简体中文

</div>

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

## 快速开始

### 1. 启动依赖服务

```bash
docker compose up -d
```

### 2. 启动后端

默认使用 PostgreSQL；切换数据库请修改 `configs/config.yaml` 中的 `database.driver` 与 `database.dsn`。

```bash
go run ./cmd/server
```

服务监听 `127.0.0.1:8080`，可用端点：

- `GET /ping` — 存活探测
- `GET /api/health` — 数据库与 Redis 健康检查

### 3. 启动前端（开发模式）

```bash
cd web
pnpm install
pnpm dev
```

开发服务器已配置 `/api` 代理到后端 `127.0.0.1:8080`。

## 同源部署（生产模式）

前端产物经 `go:embed` 打进后端二进制，由 Hertz 同源托管，类似把 Vue 应用放进 Spring Boot 的 `public`：

```bash
cd web && pnpm build        # 产物输出到 internal/webassets/dist
cd .. && go build -o transcraft-server.exe ./cmd/server
./transcraft-server.exe     # 浏览器直接访问 http://127.0.0.1:8080
```

API 路由（`/ping`、`/api/*`）优先匹配；其余请求返回静态文件，未命中的路径回退到 `index.html` 以支持前端 history 路由。部署时只需携带二进制与 `configs/config.yaml`。

## 许可证

TransCraft 基于 [GNU Affero 通用公共许可证 v3.0](LICENSE) 发布。
