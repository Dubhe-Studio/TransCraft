<div align="center">

# TransCraft

**面向 Minecraft 风格翻译的协作式 i18n 管理平台：创建项目、组织部件、管理语言，基于参考语言完成翻译。**

[English](README.md) | 简体中文

</div>

## 项目简介

TransCraft 是一个多人协作的多项目翻译管理平台，面向 Minecraft 风格的资源翻译场景：平铺 JSON 语言文件（`{ "group.key1": "trans1", "group.key2": "trans2" }`）、Minecraft 全部语种的语言代码（`zh_cn`、`zh_tw`、`zh_hk`、`lzh`、`en_us`、`ru_ru`、`ja_jp` 等）、`src/main/resources/assets/<namespace>/lang/*.json` 文件掩码与 `src/generated/resources/assets/<namespace>/lang/en_us.json` 翻译模板。翻译可通过 Git 同步并以 GitHub 拉取请求提交，支持选择仓库分支或基于 fork 协作。

平台正在积极开发中，路线图与进度见 [TODO.md](TODO.md)。

## 部署

前置条件：Docker（或本机 MySQL / PostgreSQL 与 Redis）、Go 1.27+、Node.js 24+ 与 pnpm。

```bash
docker compose up -d                     # 启动 MySQL / PostgreSQL / Redis

cd web && pnpm install && pnpm build     # 构建前端到后端模块内
cd .. && go build -o transcraft-server.exe ./cmd/server

./transcraft-server.exe                  # 浏览器访问 http://127.0.0.1:8080
```

前端产物内嵌进后端二进制并同源托管，部署时只需携带可执行文件与 `configs/config.yaml`（数据库与 Redis 连接配置）。

## 社区

- [行为准则](CODE_OF_CONDUCT.zh_CN.md) — 所有参与者应遵守的社区规范
- [参与贡献](CONTRIBUTING.zh_CN.md) — 开发环境搭建与贡献流程
- [TODO](TODO.md) — 路线图与进度

## 许可证

TransCraft 基于 [GNU Affero 通用公共许可证 v3.0](LICENSE) 发布。
