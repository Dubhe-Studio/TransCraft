<div align="center">

# TransCraft

**A collaborative i18n management platform for Minecraft-style translations: create projects, organize components, manage languages, and translate from a reference language.**

English | [简体中文](README.zh_CN.md)

</div>

## Overview

TransCraft is a multi-user, multi-project translation management platform. It targets Minecraft-style resource translations: flat JSON language files (`{ "group.key1": "trans1", "group.key2": "trans2" }`), the full set of Minecraft language codes (`zh_cn`, `zh_tw`, `zh_hk`, `lzh`, `en_us`, `ru_ru`, `ja_jp`, and every other language Minecraft supports), file masks such as `src/main/resources/assets/<namespace>/lang/*.json`, and translation templates such as `src/generated/resources/assets/<namespace>/lang/en_us.json`. Translations can be synchronized through Git and submitted as GitHub pull requests, with support for choosing the repository branch or working from a fork.

The platform is under active development; see [TODO.md](TODO.md) for the roadmap and current progress.

## Deployment

Prerequisites: Docker (or a local MySQL/PostgreSQL and Redis), Go 1.27+, Node.js 24+ with pnpm.

```bash
docker compose up -d                     # start MySQL / PostgreSQL / Redis

cd web && pnpm install && pnpm build     # build the frontend into the backend module
cd .. && go build -o transcraft-server.exe ./cmd/server

./transcraft-server.exe                  # open http://127.0.0.1:8080 in your browser
```

The frontend is embedded into the backend binary and served on the same origin, so deployment requires only the executable and `configs/config.yaml` (database and Redis connection settings).

## Community

- [Code of Conduct](CODE_OF_CONDUCT.md) — participation guidelines for everyone
- [Contributing](CONTRIBUTING.md) — development environment setup and contribution workflow
- [TODO](TODO.md) — roadmap and progress

## License

TransCraft is licensed under the [GNU Affero General Public License v3.0](LICENSE).
