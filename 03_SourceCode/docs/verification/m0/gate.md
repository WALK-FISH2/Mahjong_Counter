# M0 Gate 验证记录

## 1. 结论

- Milestone：M0 — Foundation
- 验证范围：T001～T013
- 执行日期：2026-08-11
- 执行人：Codex（本地验证）；GitHub Actions（托管 CI）
- 最终结论：**PASS**
- 后续判断：M0 Gate 已满足，可以在项目方确认后进入 Batch 03 / M1；本次未开始 M1。

## 2. 版本与环境

| 项目 | 值 |
| --- | --- |
| Active Requirements Baseline | `docs/product/requirements-baseline-v1.2.md` |
| App Version | `0.0.0` |
| Engine Version | `0.0.0` |
| Rule Version | N/A（M0 不实现或加载 RulePackage） |
| Database Schema Version | `1` |
| Backup Format Version | `1` |
| Share Format Version | `1` |
| Single Example Format Version | `1` |
| 本地操作系统 | Windows 10 `10.0.19045.0` |
| 本地 Node.js / npm | Node.js `v24.12.0`；npm `11.6.2` |
| 本地 Playwright | `1.62.1`；Chromium 与 WebKit projects |
| 托管 CI | GitHub Actions；`ubuntu-latest`；Node.js `24` |

## 3. T001～T013 最终状态

| Task | 状态 | 验证结论 |
| --- | --- | --- |
| T001 | DONE | React + TypeScript + Vite 骨架存在；开发服务器返回 HTTP 200；生产构建通过。 |
| T002 | DONE | `strict`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes` 已启用；独立 typecheck 通过。 |
| T003 | DONE | ESLint 与 Prettier 脚本可用；format check 与 lint 均通过，lint 配置为零 warning。 |
| T004 | DONE | Presentation / Application / Domain / Infrastructure 目录存在；Domain Import Boundary 检查通过。 |
| T005 | DONE | Vitest 可运行并已进入 CI；本地 7 个测试文件、12 个测试全部通过。 |
| T006 | DONE | React Testing Library 测试环境与组件交互 smoke test 通过。 |
| T007 | DONE | Playwright 可启动生产构建；Chromium 与 WebKit smoke 全部通过。 |
| T008 | DONE | App、Engine 与四类数据格式版本常量独立存在；Rule Version 所有权保留给未来 RulePackage。 |
| T009 | DONE | Calculator、Encyclopedia、Saved Examples、Settings 四个页面可通过 Hash Router 访问；移动端和桌面端导航通过。 |
| T010 | DONE | 根目录 GitHub Actions 工作流由测试分支 push 实际触发；Quality gate 及全部质量步骤均为 `success`。 |
| T011 | DONE | 类型化 Zustand vanilla Store 可读、可执行 Action、可订阅；Domain 不依赖 Zustand。 |
| T012 | DONE | 根级 Error Boundary 正常渲染与异常降级测试通过；错误仅写入本地 console，不上传。 |
| T013 | DONE | PWA 插件、最小 Manifest、Service Worker 注册/构建扩展点与产物检查通过；未提前实现 M11 正式能力。 |

## 4. 本地验证结果

| 命令或检查 | 结果 | 结果记录 |
| --- | --- | --- |
| `npm run format:check` | PASS | 所有匹配文件符合 Prettier 格式。 |
| `npm run lint` | PASS | ESLint 退出码 0，且配置为 `--max-warnings 0`。 |
| `npm run typecheck` | PASS | TypeScript build/typecheck 退出码 0。 |
| `npm test` | PASS | Vitest：7 个测试文件通过，12 个测试通过。 |
| `npm run test:architecture` | PASS | 输出 `Architecture import boundaries verified.`。 |
| `npm run build` | PASS | Vite 生产构建成功；生成 App Shell、注册脚本和最小 Service Worker。 |
| `npm run test:pwa:artifacts` | PASS | `dist/` 中的 M0 PWA 脚手架产物验证通过。 |
| `npm run test:e2e` | PASS | 生产构建后运行 6 个 E2E，全部通过。 |
| Vite 开发服务器 HTTP smoke | PASS | `http://127.0.0.1:4174/` 返回 HTTP 200，HTML 包含根挂载节点。 |
| M0 业务规则硬编码扫描 | PASS | `src/` 与 `e2e/` 未发现麻将规则实现；唯一命中是版本测试中对未来 RulePackage 所有权的说明。 |

## 5. Chromium / WebKit E2E

| 浏览器项目 | 结果 | 覆盖范围 |
| --- | --- | --- |
| Chromium | PASS（3/3） | 四主页面、Hash Router、移动/桌面导航、PWA 注册工程钩子。 |
| WebKit | PASS（3/3） | 四主页面、Hash Router、移动/桌面导航、PWA 注册工程钩子。 |

两组浏览器测试均显式收集页面 `console.error` 与 `console.warning`；断言结果为空。PWA 用例只验证 Service Worker 工程接入，不宣称正式离线能力。

## 6. GitHub Actions 托管 CI 证据

- Repository：`WALK-FISH2/Mahjong_Counter`
- Workflow：`CI`
- Event：`push`
- Branch：`m0-ci-validation`
- Commit：[`7d7250137847220e93d57cb44efad73c2308c3f8`](https://github.com/WALK-FISH2/Mahjong_Counter/commit/7d7250137847220e93d57cb44efad73c2308c3f8)
- Run：[`31472962885` / CI #1](https://github.com/WALK-FISH2/Mahjong_Counter/actions/runs/31472962885)
- Run status：`completed`
- Run conclusion：`success`
- Run 时间：2026-08-11 08:23:13Z ～ 08:23:52Z
- Job：[`Quality gate`](https://github.com/WALK-FISH2/Mahjong_Counter/actions/runs/31472962885/job/93720173318) — `success`
- 成功步骤：Install dependencies、Lint、Typecheck、Unit and component tests、Architecture boundary test、Build、Verify PWA build artifacts。

工作流位于仓库根目录 `.github/workflows/ci.yml`，Node/npm 命令以 `03_SourceCode` 为工作目录，npm cache dependency path 指向 `03_SourceCode/package-lock.json`。任何质量步骤返回非零退出码都会使同一 `Quality gate` job 失败。

## 7. 已知非阻断提示

- Vite PWA 构建输出 `inlineDynamicImports` 已弃用提示，来自当前插件构建链；构建和脚手架产物验证均成功，不影响 M0 Gate。
- Playwright 子进程提示同时设置 `NO_COLOR` 与 `FORCE_COLOR`；6 个 E2E 均通过，页面 console error/warning 断言仍为空。
- M0 Service Worker 的 precache 为 0 项，且 Manifest 为明确标识的工程脚手架；这是 T013 的预期边界。正式图标、生产 Manifest、离线缓存、安装/更新 UI、App Update 与 Rule Update 仍属于 M11。
- 本次没有未实际执行的 M0 Gate 验证项。

## 8. Gate 判定

T001～T013 全部为 `DONE`；本地质量命令、生产构建、架构边界、Chromium/WebKit E2E、PWA 脚手架检查及 GitHub Actions 托管 CI 均为 `PASS`。未发现 M0 范围内的业务规则硬编码，也未提前实现 M1 或 M11 产品能力。

**M0 Gate：PASS**
