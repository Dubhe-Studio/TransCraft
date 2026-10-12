# TODO

## 项目目标

多人协作的多项目 i18n 管理平台。用户可以在平台上创建项目、添加部件、管理语言，并基于参考语言创建其它语言的翻译。

## 当前进度

- [x] 项目脚手架：Golang + Hertz 后端、Vite + Vue 3 + Arco Design 前端、前后端同源部署、MySQL / PostgreSQL / Redis 依赖环境
- 第一阶段全部页面已由前端实现并通过模拟接口联调，后端实现完成后方可勾选第一阶段各项
- 前端已实现：全部项目页（三种排序）、翻译编辑器上下布局与五按钮操作、条目批准与建议提交、站点与项目用户组管理、项目设置分组；上述均以模拟接口验证，待后端落地
- 前端已实现：部件级 VCS 配置（创建与编辑），文件掩码与模板文件支持从项目同步或部件自定义；项目页与部件页提供语言选择与各语言完成情况；均以模拟接口验证，待后端落地
- 待实现：建议的浏览与处理界面（当前只有提交入口）

## 第一阶段

- [ ] 用户体系：注册、登录、项目成员与角色权限
- [ ] 项目管理：创建项目，在项目下添加部件（对应 `assets/<namespace>` 命名空间）
- [ ] 语言管理：内置 Minecraft 全部语种（`zh_cn`、`zh_tw`、`zh_hk`、`lzh`、`en_us`、`ru_ru`、`ja_jp` 等 Minecraft 语言代码）
- [ ] 翻译编辑：指定参考语言，基于参考语言创建与维护其它语言的翻译条目
- [ ] 文件格式：平铺 JSON，形如 `{ "group.key1": "trans1", "group.key2": "trans2" }`
- [ ] 文件掩码与翻译模板：
  - 文件掩码，如 `src/main/resources/assets/<namespace>/lang/*.json`
  - 翻译模板，如 `src/generated/resources/assets/<namespace>/lang/en_us.json`
- [ ] VCS 集成：Git 同步与 GitHub 拉取请求（Pull Request）
  - 选择仓库分支
  - 可选 fork：fork 仓库名称、fork 分支名称

## 后续规划（未排期）

- [ ] 更多文件格式（嵌套 JSON、`.lang` 等）
- [ ] 翻译记忆与术语库
- [ ] 机器翻译辅助
