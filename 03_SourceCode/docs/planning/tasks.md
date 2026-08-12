# 麻将番数计算器开发任务清单

> **Implementation Tasks — Mahjong Fan Calculator**

## 文档元数据

- 文档名称：Implementation Tasks
- 文档版本：`Tasks 1.0.0`
- 文档状态：已批准 / Active
- 制定日期：2026-08-07
- 项目方确认日期：2026-08-10
- 主要适用版本：`v0.1.0`
- 上游需求基线：[`requirements-baseline-v1.2.md`](../product/requirements-baseline-v1.2.md) — `Baseline 1.2`
- 上游一致性审查：[`requirements-audit.md`](../product/requirements-audit.md) — `PASS`
- 上游项目宪章：[`constitution.md`](../governance/constitution.md) — `Constitution 1.0.0`
- 上游产品规格：[`spec.md`](../product/spec.md) — `Spec 1.0.0`
- 上游技术架构：[`architecture.md`](../architecture/architecture.md) — `Architecture 1.0.0`
- 上游实施计划：[`plan.md`](./plan.md) — `Plan 1.0.0`
- v0.1.0 规则事实规范：[`rule-spec-v1.0.md`](../rules/common-simple/rule-spec-v1.0.md) — `common-simple@1.0.0`
- 下游执行约束：`docs/AGENTS.md`

---

# 1. 文档目的

本文件把 `plan.md` 的 M0～M12 进一步拆成可执行、可 Review、可测试、可由 Codex/人工开发者逐项完成的任务。

每个 Task 必须具有明确目标和可判断的完成条件。Task 可以采用紧凑格式，不要求机械重复完全相同的字段标题；目标、实现、验收和测试可以在不产生歧义时合并表达。

所有 Task 至少必须能够确定：

- Task ID 与状态；
- 明确目标；
- 依赖关系；
- 可判断的完成条件；
- 上游追踪。

以下 Task 不得只依赖目标描述或 Gate 勾选，必须显式写出“验收”“测试/验证”和“证据”：

- Milestone Gate 的关键证明 Task；
- Alpha、Beta、RC、正式发布验收 Task；
- 人工验收 Task；
- Migration、兼容、数据完整性、安全、隐私等高风险 Task。

“证据”至少说明结果记录保存位置或形式。默认使用 `docs/verification/<version-or-milestone>/<task-id>.md`；也可以引用不可变 CI Artifact、测试报告或人工验收表，但对应 Markdown 记录必须包含执行日期、App/Engine/Rule/Data 版本、环境、执行人、用例范围、逐项 `PASS`/`FAIL` 和证据链接。人工测试是正式验证手段，不要求所有验收自动化。

本文件不得改变上游需求、Spec 或 Architecture。

若执行过程中发现任务无法满足上游文档，必须先报告冲突，不得直接改产品行为。

---

# 2. 任务状态

统一使用：

```text
TODO
IN_PROGRESS
BLOCKED
REVIEW
DONE
CANCELLED
```

默认状态：

```text
TODO
```

只有满足该任务明确的实现、验收和测试/验证要求，并按任务风险级别保留必要证据后，才可以标记 `DONE`。

---

# 3. 任务执行原则

1. 原则上按 Task ID 和依赖顺序执行。
2. 可以并行的任务必须不共享尚未稳定的数据结构。
3. 不允许因为“后面会补”而跳过规则测试。
4. 不允许一个任务同时重构大量无关模块。
5. 规则算法任务必须有固定牌例。
6. 数据 Schema 任务必须考虑迁移。
7. UI 任务不得复制 Domain 规则。
8. 任何需求变化先修改 Baseline，不直接改 Tasks。
9. 每次进入新 Milestone 前，前一个 Milestone 的 Gate 必须通过。
10. Codex 每轮应优先完成一个清晰任务组，而不是一次修改整个项目。

---

# 4. M0 — Foundation

## T001 初始化前端工程

- 状态：DONE
- 目标：建立 React + TypeScript + Vite 项目骨架。
- 依赖：无
- 涉及：项目根目录、`src/app/`
- 实现：
  - 初始化 Vite React TypeScript。
  - 建立 `src/`、`public/`、`docs/` 基础目录。
  - 配置开发、构建、预览脚本。
- 验收：
  - 本地开发服务器可运行。
  - 生产构建成功。
  - 空白首页无控制台错误。
- 测试：`npm run build`
- 追踪：Plan M0；Architecture §2～4

## T002 启用严格 TypeScript

- 状态：DONE
- 目标：建立严格类型基础。
- 依赖：T001
- 涉及：`tsconfig*.json`
- 实现：
  - `strict = true`
  - `noUncheckedIndexedAccess = true`
  - `exactOptionalPropertyTypes = true`
- 验收：
  - 项目无隐式 any。
  - 类型检查独立命令可运行。
- 测试：`npm run typecheck`
- 追踪：Architecture §96

## T003 配置 ESLint 与格式化

- 状态：DONE
- 目标：统一代码质量。
- 依赖：T001
- 涉及：Lint/Formatter 配置
- 实现：
  - TypeScript/React lint。
  - Import 基础规则。
  - 格式化脚本。
- 验收：lint 可在 CI 阻断错误。
- 测试：`npm run lint`
- 追踪：Architecture §83

## T004 建立架构目录与 Import Boundary

- 状态：DONE
- 目标：落实 Presentation/Application/Domain/Infrastructure 边界。
- 依赖：T001～T003
- 涉及：`src/domain/`、`src/application/`、`src/infrastructure/`
- 实现：
  - 创建正式目录。
  - 配置 Domain 禁止引用 React/Zustand/Dexie/页面层。
- 验收：
  - 人为在 Domain 引入 React 时 lint/检查失败。
- 测试：架构边界测试。
- 追踪：Architecture §3、§95

## T005 配置 Vitest

- 状态：DONE
- 目标：建立 Domain/规则单元测试基础。
- 依赖：T001
- 涉及：Vitest 配置、`src/test/`
- 验收：示例单测可运行并进入 CI。
- 测试：`npm test`
- 追踪：Architecture §77、§83

## T006 配置 React Testing Library

- 状态：DONE
- 目标：建立组件行为测试能力。
- 依赖：T005
- 涉及：组件测试环境
- 验收：能渲染并交互一个示例按钮。
- 测试：组件 smoke test
- 追踪：Architecture §77

## T007 配置 Playwright

- 状态：DONE
- 目标：建立浏览器 E2E 基础。
- 依赖：T001
- 涉及：`playwright.config.*`
- 验收：
  - 可启动构建并访问首页。
  - 至少 Chromium/WebKit smoke 通过。
- 测试：`npm run test:e2e`
- 追踪：Architecture §77、§83

## T008 建立版本常量

- 状态：DONE
- 目标：独立管理所有正式应用、引擎和数据格式版本。
- 依赖：T001
- 涉及：`src/app/version/`
- 实现：
  - `APP_VERSION`
  - `ENGINE_VERSION`
  - `DATABASE_SCHEMA_VERSION`
  - `BACKUP_FORMAT_VERSION`
  - `SHARE_FORMAT_VERSION`
  - `SINGLE_EXAMPLE_FORMAT_VERSION`
  - RulePackage 自身的 `RULE_VERSION`
- 验收：业务代码不直接散落读取 package 版本。
- 测试：版本常量存在性、独立性和 Rule Version 引用单测
- 追踪：Architecture §42、§96

## T009 建立基础 Router 与四主页面 Shell

- 状态：DONE
- 目标：创建 Calculator、Encyclopedia、Saved、Settings 页面壳。
- 依赖：T001
- 涉及：`src/app/routes/`、`src/pages/`
- 验收：
  - 四页面可访问。
  - 无业务空按钮冒充完成。
- 测试：路由 smoke
- 追踪：REQ-NAV-003～006；Spec §5

## T010 建立基础 CI

- 状态：DONE
- 目标：自动执行 lint/typecheck/test/build。
- 依赖：T002～T007
- 涉及：CI 配置
- 验收：任一阶段失败即 CI 失败。
- 测试：提交测试分支验证
- 追踪：Architecture §83

## T011 建立 Zustand 基础状态容器

- 状态：DONE
- 目标：建立符合 Application 边界的类型化 Zustand Store 基础。
- 依赖：T004
- 涉及：`src/application/state/`
- 实现：
  - 提供类型化 Store 创建入口。
  - 不提前定义 Calculator、Rule 或持久化业务状态。
- 验收：
  - Store 可读取状态、执行 Action 并订阅变化。
  - Domain 不依赖 Zustand。
- 测试：Zustand Store smoke
- 追踪：Plan M0；Architecture §2、§31、§95

## T012 建立应用级 Error Boundary

- 状态：DONE
- 目标：避免未捕获的渲染错误造成无说明白屏。
- 依赖：T006
- 涉及：`src/app/errors/`、应用根入口
- 实现：
  - 根级 Error Boundary。
  - 展示安全、可操作且不暴露内部 Stack 的降级信息。
  - 只写入本地 console，不上传错误。
- 验收：
  - 正常渲染不受影响。
  - 子树抛错时展示应用级降级页面。
- 测试：Error Boundary 组件测试
- 追踪：Plan M0；Architecture §62、§64、§101

## T013 建立 PWA 最小工程骨架

- 状态：DONE
- 目标：只建立后续 PWA/Offline/Update 任务可扩展的工程脚手架，不宣称正式安装或离线能力完成。
- 依赖：T007
- 涉及：Vite PWA 配置、构建产物、App Shell smoke
- 实现：
  - 接入 Vite PWA / Workbox 的配置、注册和构建扩展点。
  - 允许构建产生仅供脚手架验证的临时 Manifest/Service Worker，但不配置正式产品 metadata、图标、缓存清单或更新 UI。
  - 预留 prompt 更新策略接口，不静默接管当前页面。
- 验收：
  - PWA 配置和注册扩展点可由生产构建引用。
  - 不以 M0 产物通过正式 Install/Offline/Update 验收。
  - 不提前实现正式 Manifest、图标、生产 Service Worker、规则/百科缓存、安装提示或更新 UI。
- 测试：PWA scaffold/config/build-hook smoke
- 追踪：Plan M0、M11；Architecture §54～55、§83、§101、§110；T1101～T1105

### M0 Gate

- [x] T001～T013 完成
- [x] `lint/typecheck/test/build` 全通过
- [x] 项目可静态运行
- [x] 尚未加入业务规则硬编码

> 2026-08-10 文档一致性修订说明：T013 的职责已收窄为 PWA 工程脚手架，正式 PWA/Offline/Update 仍由 M11 承担。既有代码和 T001～T012 状态不因此改写；T013 当时维持 `REVIEW`，须按修订后的验收标准复核后再重新判定 M0 Gate。
>
> 2026-08-11 M0 Gate 最终收口：测试分支 `m0-ci-validation` 的 GitHub Actions `CI` 已在提交 `7d7250137847220e93d57cb44efad73c2308c3f8` 实际执行并通过，T010 更新为 `DONE`。T001～T013 已全部复核为 `DONE`，完整证据见 `docs/verification/m0/gate.md`；M0 Gate 结论为 `PASS`。

---

# 5. M1 — Mahjong Domain Model

## T101 定义 TileCode 与 Tile Metadata

- 状态：DONE
- 目标：建立 42 种稳定牌编码。
- 依赖：M0
- 涉及：`src/domain/mahjong/tile.ts`
- 实现：
  - 万筒条 27
  - 字牌 7
  - 花牌 8
  - 中文名、排序信息
- 验收：42 个 ID 唯一稳定。
- 测试：编码唯一性、排序、中文名
- 追踪：REQ-INPUT-002、019；Architecture §5

## T102 定义 Meld 模型

- 状态：DONE
- 目标：建模吃、碰、明杠、暗杠。
- 依赖：T101
- 涉及：`meld.ts`
- 验收：
  - Chow/Pung/Kong 可区分。
  - 明杠支持 direct/added。
  - 不包含来源玩家字段。
- 测试：类型和构造验证
- 追踪：REQ-INPUT-008～011、REQ-OOS-006

## T103 定义 HandSnapshot

- 状态：DONE
- 目标：严格分离 concealed/melds/flowers/winningTile。
- 依赖：T101～T102
- 涉及：`hand.ts`
- 验收：统一展示不会导致数据拍平。
- 测试：序列化 roundtrip
- 追踪：REQ-INPUT-004～007、017、019

## T104 定义 TransientInputSession

- 状态：DONE
- 目标：副露临时录入与正式牌面分离。
- 依赖：T102～T103
- 涉及：`meld-input-state.ts`
- 验收：
  - 未完成吃牌不进入 melds。
  - 可表达前 1～2 张临时选择。
- 测试：临时状态转换
- 追踪：REQ-INPUT-004、012～014

## T105 定义 WinContext

- 状态：DONE
- 目标：建立点炮/自摸与动态上下文字段。
- 依赖：T101
- 涉及：`context.ts`
- 验收：unknown 与 false 可区分。
- 测试：序列化与状态验证
- 追踪：REQ-CONTEXT-*；Architecture §9

## T106 定义 CalculatorDocument

- 状态：DONE
- 目标：建立当前计算唯一事实对象。
- 依赖：T103～T105
- 涉及：`calculator-document.ts`
- 实现：ruleRef、hand、context、temporary adjustment、fan adjustments、source、revision。
- 验收：所有正式计算输入可由该对象表达。
- 测试：roundtrip
- 追踪：Architecture §8

## T107 实现全局牌数统计

- 状态：DONE
- 目标：跨 concealed/melds/winningTile 正确统计普通牌。
- 依赖：T103
- 涉及：`validation.ts`
- 验收：杠四张正确计数，胡牌张计入全局。
- 测试：多区域计数牌例
- 追踪：REQ-INPUT-015～016

## T108 实现结构张数计算

- 状态：DONE
- 目标：支持杠按结构 3、花牌不计结构。
- 依赖：T103
- 涉及：`hand-count.ts`
- 验收：返回结构张数与实际录入张数。
- 测试：普通手牌、杠、花牌组合
- 追踪：REQ-INPUT-021、REQ-ENGINE-005

## T109 建立 Domain 硬校验

- 状态：DONE
- 目标：统一检查第五张、非法牌、副露基本结构。
- 依赖：T107～T108
- 涉及：`validation.ts`
- 验收：所有明确输入错误有稳定 error code。
- 测试：正反例
- 追踪：REQ-INPUT-015、025；Architecture §99

## T110 建立 CalculatorDocument revision 工具

- 状态：DONE
- 目标：任何计算语义变化都生成新 revision。
- 依赖：T106
- 涉及：Application/Domain helper
- 验收：同 revision 只对应一组语义输入。
- 测试：修改不同字段 revision 变化
- 追踪：Architecture §8、§30

### M1 Gate

- [x] T101～T110 完成
- [x] Domain 无 React/Storage 依赖
- [x] 牌数、结构张数与临时副露测试通过

> 2026-08-11 M1 Gate 收口：T101～T110 已全部复核为 `DONE`；Domain Model、全局牌数、结构/实体张数、硬校验、临时副露隔离与 revision 测试均通过。完整命令、结果与范围说明见 `docs/verification/m1/gate.md`；M1 Gate 结论为 `PASS`。

---

# 6. M2 — Rule System

## T201 定义 RulePackage Schema

- 状态：DONE
- 目标：建立规则包顶级组合结构，并明确组合所有子 Schema；不得以 `unknown` 或空对象代替尚未定义的正式模块。
- 依赖：M1
- 涉及：`src/domain/rules/`、`src/schemas/rule-package/`
- 验收：RulePackage 必须组合 TileSet、HandModel、Structure、Context、Pattern、Relation、Scoring、Legality、TemporaryAdjustment、Encyclopedia 和 RuleSource，并经 Zod 校验后才能使用。
- 测试：合法/非法 Schema
- 追踪：REQ-RULE-*；Architecture §10

## T202 定义 RuleManifest 与规则状态

- 状态：DONE
- 目标：支持 development/test/full。
- 依赖：T201
- 验收：开发中规则不可进入 Calculator。
- 测试：状态行为
- 追踪：REQ-RULE-002～005

## T203 定义 TileSetDefinition

- 状态：DONE
- 目标：规则动态声明牌种和最大副本数。
- 依赖：T201
- 验收：可表达 27/34/42。
- 测试：三种典型集合
- 追踪：REQ-INPUT-002、015、016

## T204 定义 HandModelDefinition

- 状态：DONE
- 目标：规则化 13/14 与副露组数。
- 依赖：T201
- 验收：Engine/UI 不需写死目标张数。
- 测试：普通 14 张配置
- 追踪：REQ-INPUT-020～021、REQ-ENGINE-005

## T205 定义 ContextDefinition

- 状态：DONE
- 目标：规则声明上下文动态字段。
- 依赖：T201、T105
- 验收：可表达门风、圈风、杠上花等。
- 测试：必填、显示条件、互斥
- 追踪：REQ-CONTEXT-002～008

## T206 定义 PatternDefinition 与 RuleSource

- 状态：DONE
- 目标：番型值、Recognizer Key、来源可追溯。
- 依赖：T201
- 验收：每个 Pattern 可引用来源。
- 测试：source ref 校验
- 追踪：REQ-RULE-007、REQ-ENC-002

## T207 定义 PatternRelation Schema

- 状态：DONE
- 目标：支持 covers/mutex/non-repeat。
- 依赖：T206
- 验收：关系成员必须存在且无非法环。
- 测试：关系图正反例
- 追踪：REQ-RESULT-005、007；Architecture §18

## T208 建立 Capability Registry

- 状态：DONE
- 目标：规则包只能引用可信 Engine 能力。
- 依赖：T201
- 验收：未知 capability 阻止计算。
- 测试：缺失 capability
- 追踪：Architecture §11

## T209 建立 Rule Repository 最小实现

- 状态：DONE
- 目标：统一加载内置规则。
- 依赖：T201～T208、T212～T214
- 涉及：`src/infrastructure/rule-repository/`
- 验收：Application 不直接 fetch/读取 JSON。
- 测试：加载内置 Rule
- 追踪：Architecture §49

## T210 建立大众麻将·通用简化版 RulePackage 骨架

- 状态：DONE
- 目标：将已批准的 `common-simple@1.0.0` Rule Spec 转录为正式 RulePackage Pipeline。
- 依赖：T201～T209
- 验收：
  - 独立 Rule ID。
  - 与国标无混称。
  - Rule status/source/version 完整。
  - 144 张牌、普通结构/七对/十三幺、3 个禁用特殊结构与 Rule Spec 一致。
  - 81 个参考番型中 78 个启用、3 个禁用。
  - minimumFan 0、自摸 +1、花牌每张 +1、默认不封顶。
  - 不含庄家翻倍、房间加倍、胡后翻牌等平台奖励。
- 测试：Schema/Capability/Source/Rule Spec 一致性校验
- 追踪：REQ-REL-001～002、REQ-RULE-009～011；Rule Spec §3～§12、§19、§31

## T211 建立 Build-time Rule Validator

- 状态：DONE
- 目标：构建时阻止损坏规则进入产物。
- 依赖：T206～T210
- 验收：ID/关系/source/capability/Rule Spec 数量和版本漂移均阻断。
- 测试：故意制造非法规则、78/3 数量漂移和 Rule Version 漂移
- 证据：在 `docs/verification/m2/T211.md` 记录各非法 fixture 的预期阻断结果，并链接构建日志。
- 追踪：Architecture §84；Rule Spec §24～§25、§29

## T212 定义 StructureDefinition

- 状态：DONE
- 目标：显式声明可信结构能力与当前规则启用状态。
- 依赖：T201、T204
- 验收：
  - 可表达 standard/seven-pairs/thirteen-orphans。
  - 可将七星不靠、全不靠、组合龙标记为 `NOT_SUPPORTED_IN_V0_1`。
  - RulePackage 只能引用 Capability Registry 已实现的结构键。
- 测试：启用结构、未知 capability、unsupported structure 语义
- 追踪：REQ-ENGINE-001；Architecture §14；Rule Spec §6

## T213 定义 Scoring / Legality / TemporaryAdjustment Schema

- 状态：DONE
- 目标：分别定义 ScoringDefinition、LegalityDefinition、TemporaryAdjustmentDefinition。
- 依赖：T201、T206
- 验收：
  - Scoring 可表达原生单位、additive、cap 与 extras。
  - Legality 可表达 minimumFan 与上下文不足。
  - TemporaryAdjustment 只允许规则声明字段。
  - `common-simple@1.0.0` 可表达 minimumFan 0、自摸 +1、花牌每张 +1、默认无封顶。
- 测试：合法配置、非法数值、未知调整项、Rule Spec fixture
- 追踪：REQ-RESULT-001、003、010～012；Architecture §19～§24；Rule Spec §7～§10、§22

## T214 建立 RuleSource 与 Content Integrity 基础

- 状态：DONE
- 目标：让规则来源、内容 hash 和不可变版本具备统一事实来源。
- 依赖：T206
- 验收：
  - RuleSource ID、Pattern sourceRefs 和 manifest contentHash 可校验。
  - 同一 canonical payload 产生稳定 hash。
  - hash 只用于完整性，不宣传为来源签名。
- 测试：canonical hash 稳定性、source 引用、内容变更检测
- 证据：在 `docs/verification/m2/T214.md` 记录 canonical fixture、稳定 hash、篡改检测结果和测试报告链接。
- 追踪：REQ-RULE-006～007；Architecture §48、§50、§84；Rule Spec §26～§27

### M2 Gate

- [x] T201～T214 完成
- [x] 大众麻将规则包可由 RuleRepository 加载
- [x] UI/Engine 可读取动态牌种、结构张数和状态
- [x] 规则包完全是数据，不执行脚本
- [x] `common-simple@1.0.0` 的 81/78/3 数量、结构、计分与来源通过 Rule Spec 一致性校验

> 2026-08-11 M2 Gate 收口：T201～T214 已全部复核为 `DONE`；内置 `common-simple@1.0.0` 可通过 RuleRepository 加载，RulePackage 保持纯数据，构建期 Rule Validator 会阻断 Schema、ID、relation、source、capability、内容完整性、81/78/3 数量和版本漂移。完整命令、非法 fixture 与 Gate 结果见 `docs/verification/m2/T211.md` 和 `docs/verification/m2/gate.md`；M2 Gate 结论为 `PASS`。

---

# 7. M3 — Structure Engine

## T301 建立 TileCount 内部表示

- 状态：DONE
- 目标：为拆分算法提供高效计数数组。
- 依赖：M2
- 验收：稳定 TileCode 可映射到内部索引并无损返回。
- 测试：全牌 roundtrip
- 追踪：Architecture §15

## T302 实现普通结构 DFS

- 状态：DONE
- 目标：枚举面子+将所有合法拆分。
- 依赖：T301、T204
- 验收：不在第一解停止。
- 测试：单解、多解、无解
- 追踪：REQ-ENGINE-001～003

## T303 为 DFS 增加 Memoization

- 状态：DONE
- 目标：降低重复搜索。
- 依赖：T302
- 验收：结果与无缓存版本完全一致。
- 测试：一致性 + 性能对比
- 追踪：REQ-ENGINE-012

## T304 实现拆分 Canonical Dedup

- 状态：DONE
- 目标：去掉等价重复拆分。
- 依赖：T302
- 验收：同逻辑组合只保留一次。
- 测试：重复路径牌例
- 追踪：REQ-ENGINE-003

## T305 集成固定副露

- 状态：DONE
- 目标：副露不参与暗手牌重新拆分。
- 依赖：T302、T102
- 验收：declared melds 固定进入结果。
- 测试：吃/碰/杠牌例
- 追踪：REQ-INPUT-004、REQ-ENGINE-003

## T306 实现七对结构

- 状态：DONE
- 目标：独立识别七对。
- 依赖：T301
- 测试：正例、反例、副露非法
- 追踪：REQ-ENGINE-001

## T307 实现十三幺结构

- 状态：DONE
- 目标：独立识别十三幺。
- 依赖：T301
- 测试：正例、反例
- 追踪：REQ-ENGINE-001

## T308 实现多结构并行枚举

- 状态：DONE
- 目标：同时返回普通/七对/十三幺候选。
- 依赖：T302、T306、T307
- 验收：不按结构优先级提前停止。
- 测试：同时符合多个结构的牌例
- 追踪：REQ-ENGINE-002

## T309 实现 Winning Tile Placement

- 状态：DONE
- 目标：枚举胡牌张在拆分中的所有有效落点。
- 依赖：T302～T308
- 验收：可区分将、顺子、刻子落点。
- 测试：多落点牌例
- 追踪：REQ-INPUT-017～018；Architecture §16

## T310 建立 Structure Rule Test Corpus

- 状态：DONE
- 目标：建立首批规则标准牌例。
- 依赖：T302～T309
- 验收：普通/七对/十三幺/多拆分均有正反例。
- 测试：CI 批量执行
- 追踪：REQ-QUAL-004

### M3 Gate

- [x] 所有结构测试通过
- [x] 多拆分不会漏解
- [x] Winning Tile Placement 可供番型识别使用

---

# 8. M4 — Pattern / Score Engine

## T401 实现 DerivedFacts

- 状态：DONE
- 目标：统一派生花色、字牌、门清、面子等事实。
- 依赖：M3
- 验收：Recognizer 不重复计算公共事实。
- 测试：各种拆分
- 追踪：Architecture §17

## T402 建立 PatternRecognizer Registry

- 状态：DONE
- 目标：按 recognizerKey 调用可信识别器。
- 依赖：T206、T401
- 验收：未知 key 阻止规则加载。
- 测试：registry lookup
- 追踪：Architecture §17

## T403 实现大众麻将首批基础番型 Recognizer

- 状态：DONE
- 目标：以 `docs/rules/common-simple/rule-spec-v1.0.md` 为唯一规则事实依据，逐项实现 `common-simple@1.0.0` 的 78 个启用番型。
- 依赖：T402
- 验收：
  - 每个启用番型都有 Evidence。
  - 七星不靠、全不靠、组合龙不注册为可用 Recognizer，并返回当前结构能力未支持语义。
  - 不实现 Rule Spec 已排除的平台奖励番型。
- 测试：78 个启用番型各至少正例 + 关键反例；3 个禁用结构番型专项回归
- 追踪：REQ-RULE-005、011、REQ-QUAL-004；Rule Spec §11、§19、§24～§25

## T404 实现 Pattern Relation Resolver

- 状态：DONE
- 目标：处理 covers/mutex/non-repeat。
- 依赖：T207、T403
- 验收：被排除番型保留原因。
- 测试：关系牌例
- 追踪：REQ-RESULT-004～007

## T405 实现 Scoring Strategy 基础框架

- 状态：DONE
- 目标：支持规则原生单位和大众麻将首版计分。
- 依赖：T404
- 验收：不强制所有规则统一单位。
- 测试：基本计分
- 追踪：REQ-RESULT-001

## T406 实现封顶与封顶外项目框架

- 状态：DONE
- 目标：支持 cap 前后展示与 extras。
- 依赖：T405
- 测试：达到/未达到封顶
- 追踪：REQ-RESULT-003

## T407 实现 Legality Engine

- 状态：DONE
- 目标：区分 legal/illegal/incomplete-context。
- 依赖：T205、T405
- 验收：分值与合法性完全分离。
- 测试：门槛不足、缺上下文
- 追踪：REQ-ENGINE-008、REQ-CONTEXT-008

## T408 实现 CalculationExplanation

- 状态：DONE
- 目标：生成结构化计算解释。
- 依赖：T403～T407
- 验收：结构/番型/关系/计分/合法性均可追踪。
- 测试：Explanation snapshot
- 追踪：REQ-PROD-001、REQ-RESULT-004～006

## T409 实现 Candidate Comparison

- 状态：DONE
- 目标：选择最高合法结果并保留并列最高。
- 依赖：T408
- 验收：不混合拆分番型。
- 测试：高低结果、并列
- 追踪：REQ-ENGINE-002～004、REQ-RESULT-002

## T410 实现 evaluateHand Domain API

- 状态：DONE
- 目标：形成完整正式计算入口。
- 依赖：T409
- 验收：输出 legal/structural-illegal/not-winning/incomplete-context。
- 测试：端到端 Domain 牌例
- 追踪：Architecture §21～22

## T411 扩充大众麻将 Rule Case Corpus

- 状态：DONE
- 目标：为 `common-simple@1.0.0` 的全部启用番型、关系和禁用结构建立可发布测试矩阵。
- 依赖：T403～T410
- 验收：
  - 78 个启用番型均有正例和关键反例。
  - Rule Spec §12 的高风险关系全部覆盖。
  - 3 个禁用特殊结构返回 unsupported structure。
  - 测试 fixture 记录 Rule ID、Rule Version 和 sourceRefs。
- 测试：CI Rule Cases
- 追踪：REQ-QUAL-004；Rule Spec §12、§24～§25

### M4 Gate

- [x] 固定牌例无需 UI 即可输出正确结果
- [x] 结果可解释
- [x] 多拆分/并列最高通过
- [x] 正式进入完整 UI 前 Engine 已稳定
- [x] `common-simple@1.0.0` 的 78 个启用番型、关键关系和 3 个禁用结构全部通过 Rule Corpus

> 2026-08-12 M4 Gate 收口：T401～T411 已全部复核为 `DONE`；完整 Domain Pipeline、Explanation、合法候选比较，以及 `common-simple@1.0.0` 的 78 个启用番型正反例、Rule Spec §12 高风险关系和 3 个禁用结构测试均通过。完整命令、结果与范围说明见 `docs/verification/m4/gate.md`；M4 Gate 结论为 `PASS`。

---

# 9. M5 — Calculator Input UI

## T501 建立 Calculator 响应式页面骨架

- 状态：DONE
- 目标：实现移动单页与桌面左右布局。
- 依赖：M4
- 验收：
  - 移动顺序符合 Spec。
  - 桌面左右布局共享状态。
- 测试：响应式组件/E2E
- 追踪：REQ-NAV-007～012

## T502 实现顶部规则栏

- 状态：DONE
- 目标：持续显示当前规则与切换入口。
- 依赖：T501
- 验收：测试版/临时调整状态可显示。
- 测试：组件测试
- 追踪：REQ-NAV-008、REQ-RULE-001

## T503 实现动态 TilePalette

- 状态：DONE
- 目标：按 TileSet 展示当前全部牌种。
- 依赖：T203、T501
- 验收：27/34/42 动态正确。
- 测试：不同 Rule fixture
- 追踪：REQ-INPUT-002～003

## T504 实现数量角标与禁用

- 状态：DONE
- 目标：全局计数达到上限后原位禁用。
- 依赖：T503、T107
- 测试：跨 hand/meld/winningTile
- 追踪：REQ-INPUT-015～016

## T505 实现暗手牌录入

- 状态：DONE
- 目标：点击添加、点击撤回、保持录入顺序。
- 依赖：T503
- 测试：重复牌、一张删除
- 追踪：REQ-INPUT-006～007

## T506 实现一键整理

- 状态：DONE
- 目标：只改变展示排序。
- 依赖：T505
- 验收：原始 HandSnapshot 顺序不被覆盖。
- 测试：Domain/UI 对比
- 追踪：REQ-INPUT-006

## T507 实现胡牌张固定区域

- 状态：TODO
- 目标：独立单选、替换、撤销。
- 依赖：T505
- 测试：替换和四张上限
- 追踪：REQ-INPUT-017

## T508 实现 14 张已和时胡牌张确认

- 状态：TODO
- 目标：推荐最后录入牌但不自动认定。
- 依赖：T507、T410
- 测试：确认/取消
- 追踪：REQ-INPUT-018

## T509 实现吃牌临时录入

- 状态：TODO
- 目标：三牌位、撤回、连续校验。
- 依赖：T104、T503
- 验收：
  - 非法第三张拒绝但前两张保留。
  - 未完成时关闭、切换其他副露或操作胡牌张，提供继续、放弃、留在当前流程。
  - 未完成临时牌不进入正式 Hand、不计结构张数。
  - 完成后提交正式 Meld 并自动回到手牌录入。
- 测试：合法/非法 chow、退出三分支、跨副露切换、胡牌张操作、完成自动复位、正式 Hand 隔离
- 追踪：REQ-INPUT-012～013

## T510 实现碰牌临时录入

- 状态：TODO
- 目标：选择一种牌自动生成三张。
- 依赖：T104、T503
- 验收：成功提交后自动回到手牌录入，临时状态不残留。
- 测试：牌数上限、完成自动复位、正式 Hand 隔离
- 追踪：REQ-INPUT-008

## T511 实现明杠/暗杠录入

- 状态：TODO
- 目标：自动四张，支持 direct/added。
- 依赖：T104、T503
- 验收：成功提交后自动回到手牌录入，规则不要求区分时不强迫选择 direct/added。
- 测试：杠类型和数量、完成自动复位、正式 Hand 隔离
- 追踪：REQ-INPUT-009～011

## T512 实现花牌临时录入

- 状态：TODO
- 目标：仅规则支持时显示，并记录具体花牌。
- 依赖：T203、T503
- 验收：成功记录具体花牌后自动回到手牌录入，花牌不进入普通结构。
- 测试：无花规则隐藏、完成自动复位、结构隔离
- 追踪：REQ-INPUT-019

## T513 实现已录入牌面统一展示

- 状态：TODO
- 目标：视觉集中，语义分组。
- 依赖：T505、T509～T512
- 验收：吃/碰/杠/花明显分组。
- 测试：组件快照/交互
- 追踪：REQ-INPUT-004～005

## T514 实现副露整组编辑/删除

- 状态：TODO
- 目标：避免残缺副露。
- 依赖：T513
- 测试：删除/修改/撤销
- 追踪：REQ-INPUT-007

## T515 实现 WinContextPanel

- 状态：TODO
- 目标：点炮默认、自摸切换、动态条件。
- 依赖：T205、T105
- 测试：条件显示/互斥/清除
- 追踪：REQ-CONTEXT-001～007

## T516 实现缺失上下文提示

- 状态：TODO
- 目标：门风/圈风等缺失时不输出正式结果。
- 依赖：T515、T407
- 测试：incomplete context
- 追踪：REQ-CONTEXT-004、008

## T517 实现结构张数状态

- 状态：TODO
- 目标：显示结构张数与实际录入数。
- 依赖：T108
- 测试：杠/花牌
- 追踪：REQ-INPUT-021

## T518 实现悬浮操作条

- 状态：TODO
- 目标：不足/可分析/分析中/结果四状态。
- 依赖：T517
- 测试：状态机 UI
- 追踪：REQ-NAV-009、REQ-ENGINE-010

## T519 实现待修正状态 UI

- 状态：TODO
- 目标：标红、定位、解释、禁止正式操作。
- 依赖：T109
- 测试：correction issue
- 追踪：REQ-INPUT-025

## T520 建立统一 Replace Guard

- 状态：TODO
- 目标：建立所有 Calculator 替换动作共享的 Application Guard 与 Draft Port。
- 依赖：T106、T501
- 涉及：`src/application/calculator/`、导航协调层
- 实现：统一处理 New Hand、Rule Switch、Share、Import、Encyclopedia Example、Saved Example。
- 验收：
  - 未确认替换前不修改当前 CalculatorDocument。
  - 先请求 Draft 保护，再执行替换。
  - 不同入口不能各自复制一套丢数据逻辑。
- 测试：六类 reason、确认/取消、Draft Port 失败
- 追踪：REQ-NAV-010～011、REQ-DRAFT-004～005；Architecture §58

## T521 实现 Navigation State、返回键与滚动保持

- 状态：TODO
- 目标：统一主模块状态、Modal Stack、详情返回和 Calculator 滚动恢复。
- 依赖：T009、T520
- 验收：
  - 主模块切换不销毁 Calculator Store。
  - 返回键按 Modal → 详情 → 模块历史 → 浏览器自然返回处理。
  - 返回 Calculator 时恢复合理滚动位置。
- 测试：Router/Modal/scroll E2E
- 追踪：REQ-NAV-010～012；Architecture §59

## T522 实现 New Hand 与 Rule Switch 流程

- 状态：TODO
- 目标：落实新建清理规则和规则切换兼容三选项。
- 依赖：T520、T203、T106
- 验收：
  - New Hand 保留全局偏好和当前规则，清除本次计算状态。
  - Rule Switch 提供移除不兼容、保留并待修正、清空三种路径。
  - 规则切换支持撤销，临时规则调整不跨规则继承。
- 测试：New Hand、三种 Rule Switch、Undo、Draft Guard
- 追踪：REQ-INPUT-022～023；Spec §31～32

## T523 实现 Rule Picker

- 状态：TODO
- 目标：提供规则分组、搜索、最近使用和状态控制。
- 依赖：T202、T502、T520
- 验收：
  - 默认 `common-simple@1.0.0`。
  - development 只能查看，test/full 才可计算。
  - 最近使用优先且可按名称/别名搜索，读写统一 Preferences Port。
- 测试：默认规则、分组搜索、最近使用、状态权限、Preferences Port fake
- 追踪：REQ-NAV-001～002、REQ-RULE-001～005

## T524 实现首次引导与 TESTING 规则确认

- 状态：TODO
- 目标：实现首次轻提示、操作引导及按结果影响版本记录的测试规则确认。
- 依赖：T523
- 验收：
  - 首次规则提示和引导只自动出现一次，可在 Settings 重播。
  - TESTING 规则首次计算前确认。
  - 可能改变结果的新 Rule Version 再次确认；纯文案/视觉更新不重复确认。
  - 保存、复制、分享持续保留 TESTING 标识和 Rule Version。
  - 确认状态通过 Preferences Port 读写，M9 再接入 localStorage Repository。
- 测试：首次/再次访问、版本变化、非结果更新、输出标识、Preferences Port fake
- 追踪：REQ-UI-006、REQ-RULE-003～004

## T525 建立 Tile Asset Manifest 与小尺寸验收

- 状态：TODO
- 目标：记录麻将牌资产版权事实并验证小屏辨识度。
- 依赖：T503
- 验收：
  - 每套资产记录 author、source、license、modified。
  - TileCode 是业务身份，文件名/图片不是。
  - 手机目标尺寸下牌面清晰可辨。
- 测试：Asset Manifest 完整性、缺失资产构建检查、小尺寸视觉清单
- 证据：在 `docs/verification/m5/T525.md` 保留 Manifest 检查结果、目标尺寸、人工视觉清单及截图。
- 追踪：REQ-UI-002～003；Architecture §70

### M5 Gate

- [ ] 用户可完整录入合法牌面
- [ ] 临时副露流程符合最新需求
- [ ] UI 不自行计算番型
- [ ] Rule Picker、首次引导、Replace Guard、返回键和状态保持通过
- [ ] Tile Asset Manifest 与小尺寸验收通过

---

# 10. M6 — Result / Adjustment

## T601 建立 AnalysisResult 状态渲染

- 状态：TODO
- 目标：按 Domain union 显示不同结果类型。
- 依赖：M5
- 验收：不通过 score>0 猜测合法性。
- 测试：各 outcome fixture
- 追踪：Spec §16；Architecture §101

## T602 实现正式结果摘要

- 状态：TODO
- 目标：显示最高合法结果、计入/未计入番型。
- 依赖：T601
- 测试：Result fixture
- 追踪：REQ-RESULT-001～005

## T603 实现最高拆分牌面

- 状态：TODO
- 目标：按当前 Candidate 排列并高亮胡牌张。
- 依赖：T602
- 测试：并列切换
- 追踪：REQ-RESULT-015

## T604 实现完整计算过程

- 状态：TODO
- 目标：渲染 Explanation。
- 依赖：T408、T602
- 验收：包含来源、关系、计算顺序。
- 测试：Explanation UI
- 追踪：REQ-RESULT-004～006

## T605 实现并列最高方案切换

- 状态：TODO
- 目标：保留所有 tied-high。
- 依赖：T409、T603
- 测试：多 tied-high
- 追踪：REQ-ENGINE-004、REQ-RESULT-002

## T606 实现 Temporary Rule Adjustment UI

- 状态：TODO
- 目标：只展示规则声明的临时调整字段。
- 依赖：T210、T602
- 测试：字段白名单
- 追踪：REQ-RESULT-010

## T607 实现 EffectiveRule 构建

- 状态：TODO
- 目标：临时规则不修改原 RulePackage。
- 依赖：T606
- 测试：immutability
- 追踪：REQ-RESULT-010～012

## T608 实现 Session Rule Result Layer

- 状态：TODO
- 目标：应用临时规则后完整重算并可改变合法性。
- 依赖：T607、T410
- 测试：门槛改变合法性
- 追踪：REQ-RESULT-012～013

## T609 实现 Fan Adjustment Domain

- 状态：TODO
- 目标：exclude/force-include recognized pattern。
- 依赖：T404
- 测试：只能操作 recognized pattern
- 追踪：REQ-RESULT-007～009

## T610 实现 Fan Adjustment UI

- 状态：TODO
- 目标：允许取消/强制计入并显示冲突原因。
- 依赖：T609、T602
- 测试：交互
- 追踪：REQ-RESULT-005、007

## T611 实现失效调整

- 状态：TODO
- 目标：牌面变化后 stale adjustment 保留但不计分。
- 依赖：T609
- 测试：识别消失/冲突变化
- 追踪：REQ-RESULT-014

## T612 实现三层结果切换

- 状态：TODO
- 目标：Preset / Session Rule / User Adjustment 分层。
- 依赖：T608～T611
- 测试：各组合
- 追踪：REQ-RESULT-013

## T613 建立“Fan Adjustment 不改变合法性”性质测试

- 状态：TODO
- 目标：把宪章原则固化成自动测试。
- 依赖：T609
- 测试：Property-based
- 追踪：REQ-RESULT-009；Architecture §23

## T614 实现结果操作权限矩阵

- 状态：TODO
- 目标：不同 Outcome 显示正确 Save/Copy/Share；Incomplete Context 不允许正式分享。
- 依赖：T601～T612
- 测试：权限矩阵，包含 Incomplete Context 的 Save/Share 均禁止
- 追踪：REQ-RESULT-016～017

## T615 实现 Quick Calc Domain / Application Use Case

- 状态：TODO
- 目标：复用当前规则关系、计分、合法性、门槛和封顶完成手选番型合计。
- 依赖：T405～T407、T210
- 验收：
  - 不调用 Hand Structure Engine、自动 Recognizer、Wait 或多拆分。
  - `common-simple@1.0.0` 使用 minimumFan 0、自摸 +1、默认无封顶。
  - 输出 `unverifiedByHand = true`。
- 测试：关系、互斥、门槛、封顶、自摸、Rule Version
- 追踪：REQ-QUICK-001～003；Architecture §74；Rule Spec §20

## T616 实现 Quick Calc UI

- 状态：TODO
- 目标：在 Calculator 提供弱化入口和手选番型流程。
- 依赖：T615、T523
- 验收：
  - 继承当前规则。
  - 所有结果持续显示“用户选择，未经牌面验证”。
  - 不进入主导航。
- 测试：入口、番型选择、上下文、未验证标识
- 追踪：REQ-NAV-005、REQ-QUICK-001～002；Spec §26

## T617 固化 Quick Calc 输出限制

- 状态：TODO
- 目标：确保 Quick Calc 不能伪装成正式牌例结果。
- 依赖：T614～T616
- 验收：不显示保存牌例、牌例分享、听牌或多拆分入口，只允许临时查看和复制文字。
- 测试：权限矩阵与 E2E
- 追踪：REQ-QUICK-003、REQ-SAVE-003

### M6 Gate

- [ ] 三层结果边界清晰
- [ ] Fan Adjustment 永远不改变合法性
- [ ] 完整结果过程可解释
- [ ] Quick Calc 可用且未验证标识、保存/分享限制全部通过

---

# 11. M7 — Ready / Discard Analysis

## T701 建立 Worker Protocol

- 状态：TODO
- 目标：定义 evaluate/wait/discard 请求响应。
- 依赖：M6
- 测试：协议序列化
- 追踪：Architecture §30

## T702 实现 Engine Worker

- 状态：TODO
- 目标：将重计算移出主线程。
- 依赖：T701
- 验收：页面交互在分析中保持响应。
- 测试：Worker smoke
- 追踪：REQ-ENGINE-011

## T703 实现 stale revision 丢弃

- 状态：TODO
- 目标：旧结果永不污染新牌面。
- 依赖：T702、T110
- 测试：快速连续修改
- 追踪：REQ-ENGINE-011

## T704 实现分析取消与 Worker 重建

- 状态：TODO
- 目标：用户可取消长任务。
- 依赖：T702
- 测试：cancel 后无结果进入 UI
- 追踪：REQ-ENGINE-011～012

## T705 实现 Wait Analysis Domain

- 状态：TODO
- 目标：枚举 enabledTiles 并复用正式 evaluate。
- 依赖：T410、T702
- 测试：合法/待确认/结构可和
- 追踪：REQ-ENGINE-006、REQ-WAIT-005～008

## T706 实现 Discard-to-ready Domain

- 状态：TODO
- 目标：枚举暗手牌 distinct discard。
- 依赖：T705
- 测试：一步进入听牌/无听牌
- 追踪：REQ-ENGINE-007

## T707 实现 Worker 会话级 LRU Cache

- 状态：TODO
- 目标：减少重复牌面分析。
- 依赖：T705～T706
- 测试：缓存命中与版本隔离
- 追踪：REQ-ENGINE-012

## T708 实现弃牌候选小三角

- 状态：TODO
- 目标：在对应暗手牌上标记。
- 依赖：T706
- 测试：等价重复牌
- 追踪：REQ-WAIT-001

## T709 实现待胡牌展示

- 状态：TODO
- 目标：麻将牌图 + 最高合法结果。
- 依赖：T705
- 测试：多待胡牌
- 追踪：REQ-WAIT-002

## T710 实现点炮/自摸差异展示

- 状态：TODO
- 目标：主模式与另一模式分离。
- 依赖：T705
- 测试：两模式结果不同牌例
- 追踪：REQ-WAIT-007

## T711 实现听牌排序设置

- 状态：TODO
- 目标：高番优先/听口优先。
- 依赖：T705～T706
- 测试：稳定排序
- 追踪：REQ-WAIT-003

## T712 建立性能回归牌例

- 状态：TODO
- 目标：记录普通和牌、复杂拆分、听牌、弃牌分析。
- 依赖：T705～T707
- 验收：固定牌例、环境、运行次数和统计口径可复现，能够为 T1217 提供明确基线并检测性能回退。
- 测试：性能基准
- 证据：在 `docs/verification/m7/T712.md` 记录固定环境、牌例集、基准原始数据和统计口径。
- 追踪：REQ-ENGINE-012

## T713 实现首次结果后的防抖自动重算

- 状态：TODO
- 目标：首次正式结果后，胡牌张、上下文、临时规则和番型调整变化触发协调后的防抖重算。
- 依赖：T702～T704、T518
- 验收：旧结果立即失效；只有当前 documentRevision 的结果可重新成为正式结果。
- 测试：连续快速修改、防抖次数、stale response
- 追踪：REQ-ENGINE-010～011；Architecture §102

## T714 实现 Engine Error 恢复流程

- 状态：TODO
- 目标：为计算异常提供业务级恢复，不依赖 React Error Boundary。
- 依赖：T704、T520
- 验收：
  - 通过 DraftProtectionPort / UndoPort 保留牌面、规则、条件和 Draft 保护语义。
  - 不输出猜测结果。
  - 提供 Retry、Undo、Copy Issue Info。
  - 不自动上传错误或牌面。
- 测试：Worker error、Retry 成功/失败、Undo Port、Draft Port、复制信息；持久化集成由 T916 验证
- 追踪：REQ-ENGINE-013、REQ-PRIV-002～003；Spec RESULT-F

## T715 实现合法和牌继续弃牌分析入口

- 状态：TODO
- 目标：在 Legal Win 中提供弱化入口“忽略当前和牌，继续分析出牌”。
- 依赖：T706、T602
- 验收：入口不改变或覆盖当前正式和牌结果，只建立独立弃牌分析视图。
- 测试：合法和牌、有/无弃牌听牌候选、返回正式结果
- 追踪：REQ-ENGINE-009；Spec RESULT-A

### M7 Gate

- [ ] 13 张听牌可用
- [ ] 14 张弃牌后听牌可用
- [ ] Worker stale/cancel 正确
- [ ] 不显示剩余张数或概率
- [ ] 防抖自动重算、Engine Error 恢复和合法和牌继续分析通过

---

# 12. M8 — Encyclopedia

## T801 实现 Rule Encyclopedia 数据加载

- 状态：TODO
- 目标：读取与 RulePackage 同版本百科数据。
- 依赖：M2、M7
- 测试：规则/百科版本对应
- 追踪：REQ-ENC-001～002

## T802 实现规则列表与状态

- 状态：TODO
- 目标：展示 development/test/full。
- 依赖：T801
- 测试：状态筛选
- 追踪：REQ-RULE-002～005

## T803 实现规则详情页

- 状态：TODO
- 目标：简介、牌种、门槛、封顶、自摸、来源、限制。
- 依赖：T801
- 测试：核心内容
- 追踪：REQ-ENC-002

## T804 实现完整番表

- 状态：TODO
- 目标：直接读取 Engine 使用的 PatternDefinition。
- 依赖：T206、T801
- 验收：不存在独立 UI 番值常量。
- 测试：Engine/UI value 一致
- 追踪：REQ-ENC-001～003

## T805 实现番型详情

- 状态：TODO
- 目标：名称、别名、值、条件、关系、来源。
- 依赖：T804
- 测试：Pattern ref
- 追踪：REQ-ENC-002

## T806 实现百科搜索与筛选

- 状态：TODO
- 目标：名称/别名/类别/数值/启用状态，以及“仅查看当前牌面已识别番型”。
- 依赖：T804
- 测试：搜索、组合筛选、当前 Evaluation 识别集、无当前牌面降级
- 追踪：REQ-ENC-003

## T807 实现百科示例

- 状态：TODO
- 目标：展示基础/组合/反例/地方特殊示例。
- 依赖：T801
- 测试：expected result 与 Rule Case 一致
- 追踪：REQ-ENC-004

## T808 实现“带入计算器”

- 状态：TODO
- 目标：test/full 示例转临时 CalculatorDocument。
- 依赖：T807、T106、T520
- 验收：development 不可带入。
- 测试：Replace Guard
- 追踪：REQ-ENC-005

## T809 实现规则与番型 Deep Link

- 状态：TODO
- 目标：刷新/返回保持位置。
- 依赖：T803、T805
- 测试：路由 E2E
- 追踪：REQ-ENC-006

## T810 实现核心百科离线资源

- 状态：TODO
- 目标：生成 `common-simple@1.0.0` 核心百科的可缓存构建产物和离线资源清单；本 Task 不宣称正式 Offline 已完成。
- 依赖：T801
- 验收：Rule Version、Pattern Catalog、示例、来源和资源 URL 清单稳定，可供 T1104 纳入生产 Service Worker。
- 测试：离线 bundle/resource manifest 完整性，不执行正式断网验收
- 追踪：REQ-ENC-007

### M8 Gate

- [ ] 番表与 Engine 同源
- [ ] 来源/争议/限制可查看
- [ ] 示例可带入且不自动保存
- [ ] 核心百科离线 bundle 与资源清单已准备；正式缓存与断网验收留在 T1104/M11

---

# 13. M9 — Persistence

## T901 初始化 Dexie 数据库

- 状态：TODO
- 目标：建立 saved/trash/draft/snapshot/meta 表。
- 依赖：M8
- 测试：DB open/close
- 追踪：REQ-STORAGE-001

## T902 实现 SavedExampleRecord

- 状态：TODO
- 目标：保存完整 Calculator + Result Snapshot。
- 依赖：T901、T612
- 测试：roundtrip
- 追踪：REQ-SAVE-004

## T903 实现默认名称生成器

- 状态：TODO
- 目标：规则名 + 1～2 个主要番型。
- 依赖：T902
- 测试：排除普通附加项
- 追踪：REQ-SAVE-006

## T904 实现保存牌例 Use Case

- 状态：TODO
- 目标：只有正式合法当前 revision 结果可由用户主动通过仅含名称的表单保存。
- 依赖：T902～T903
- 验收：
  - 表单只有名称，允许重名，不自动覆盖。
  - Share / Import 临时内容合法时可主动另存，但不自动保存。
  - 保存成功后保持当前页面和结果。
- 测试：合法/非法/听牌/Quick Calc、重名、Share/Import 主动另存、保存后页面
- 追踪：REQ-SAVE-001～003、005、007、010、017

## T905 实现 Saved 列表

- 状态：TODO
- 目标：倒序、搜索、规则筛选、排序。
- 依赖：T904
- 测试：列表行为
- 追踪：REQ-SAVE-013

## T906 实现只读打开与编辑副本

- 状态：TODO
- 目标：默认只读，编辑进入临时副本。
- 依赖：T905
- 测试：原记录不自动修改
- 追踪：REQ-SAVE-008～009

## T907 实现更新原记录/另存/放弃

- 状态：TODO
- 目标：显式决定编辑结果。
- 依赖：T906
- 测试：三种路径
- 追踪：REQ-SAVE-008

## T908 实现回收站

- 状态：TODO
- 目标：删除→Trash→恢复/永久删除，永久删除需确认且回收站不自动过期。
- 依赖：T905
- 测试：modifiedAt 不因 trash 改变、永久删除确认、长期保留
- 追踪：REQ-SAVE-015

## T909 实现唯一 Draft

- 状态：TODO
- 目标：500ms debounce 自动保存。
- 依赖：T901、T106
- 测试：刷新恢复
- 追踪：REQ-DRAFT-001～003

## T910 实现启动 Draft 恢复

- 状态：TODO
- 目标：继续上次/新建。
- 依赖：T909
- 测试：启动分支
- 追踪：REQ-DRAFT-004

## T911 实现 Undo/Redo

- 状态：TODO
- 目标：会话级 Command History。
- 依赖：T106
- 测试：常用操作
- 追踪：REQ-DRAFT-006

## T912 实现多标签编辑锁

- 状态：TODO
- 目标：单主要编辑器、可 takeover。
- 依赖：T909
- 验收：同一时刻只有一个主要编辑器可写；takeover 后原标签转只读；异常关闭后锁可恢复，且无 Draft 静默覆盖。
- 测试：两 Tab E2E
- 证据：在 `docs/verification/m9/T912.md` 记录两标签时序、takeover/异常关闭结果和 E2E 报告。
- 追踪：REQ-STORAGE-004

## T913 实现 Storage Capability 与 Temporary Mode

- 状态：TODO
- 目标：存储不可用仍可计算。
- 依赖：T901
- 验收：IDB 不可用或 Quota 失败时明确进入 Temporary Mode；计算仍可完成，不显示虚假保存成功，受影响的保存/恢复/导入操作明确暂停。
- 测试：模拟 IDB failure/quota
- 证据：在 `docs/verification/m9/T913.md` 记录故障注入、降级能力矩阵、用户提示和测试报告。
- 追踪：REQ-STORAGE-003

## T914 实现 Rule Snapshot 引用

- 状态：TODO
- 目标：旧牌例依赖规则版本可保留最小快照。
- 依赖：T902
- 测试：删除规则包后牌例仍可打开
- 追踪：REQ-SAVE-011～012、REQ-STORAGE-007

## T915 建立 Settings Preferences Store / Repository

- 状态：TODO
- 目标：为所有轻量设置提供统一、类型化的 localStorage 事实来源。
- 依赖：T011
- 涉及：`src/application/state/`、`src/infrastructure/preferences/`
- 实现：theme、motion、lastRuleRef、recentRules、readySortMode、defaultCopyFormat、update preferences、testRuleConfirmations、PWA prompt、onboarding state。
- 验收：
  - Schema 校验失败时使用安全默认值并提示可恢复。
  - 不在 localStorage 保存牌例、Draft 或牌面。
  - T523/T524 与 Settings UI 通过同一 Port 使用偏好。
- 测试：roundtrip、损坏数据、默认值、版本迁移
- 追踪：REQ-NAV-001～002、REQ-UI-004～006、REQ-WAIT-003、REQ-SHARE-006、REQ-UPDATE-002；Architecture §37

## T916 集成 Replace Guard、Draft 与 Engine Recovery

- 状态：TODO
- 目标：将 T520/T714 的 Draft/Undo Port 接入唯一 Draft 和会话 Command History。
- 依赖：T520、T714、T909～T911
- 验收：New Hand、Rule Switch、Share、Import、百科示例、Saved Example 和 Engine Error 在未保护 Draft 前均不替换当前状态。
- 测试：各入口持久 Draft、Undo、保护失败、刷新恢复
- 追踪：REQ-DRAFT-003～006；Architecture §58

## T917 实现 Saved 状态机、modifiedAt 与容量显示

- 状态：TODO
- 目标：落实 SAVED / MODIFIED_AFTER_SAVE、精确修改时间和无数量上限行为。
- 依赖：T904～T908、T913
- 验收：
  - 保存成功后为 SAVED，继续修改变为 MODIFIED_AFTER_SAVE。
  - 只有改名并保存、内容更新覆盖、按新规则覆盖时更新 modifiedAt。
  - 只读查看、浏览拆分、复制分享、移入/恢复回收站不更新时间。
  - 不设置人为数量上限，显示大致存储占用；空间不足建议备份或删除。
- 测试：状态机、modifiedAt 参数化矩阵、容量/Quota
- 追踪：REQ-SAVE-010、014、016

## T918 实现 Database Migration Service / Use Case

- 状态：TODO
- 目标：提供真实数据库迁移能力，而不是只建立测试 Harness。
- 依赖：T008、T901
- 验收：
  - 使用独立 DATABASE_SCHEMA_VERSION。
  - 迁移前生成安全备份。
  - staging/transaction 成功后才 commit，失败 rollback。
  - 不可可靠迁移的数据保留只读，不静默删除。
- 测试：多版本路径、备份失败、中途异常、rollback、只读降级
- 证据：在 `docs/verification/m9/T918.md` 记录版本迁移矩阵、迁移前后数据摘要、备份/rollback 和只读降级报告。
- 追踪：REQ-REL-006、REQ-DATA-008；Architecture §42、§44.1

## T919 实现清除全部本地数据 Use Case

- 状态：TODO
- 目标：安全清除用户本地数据而不删除应用和内置核心规则。
- 依赖：T901
- 验收：列出删除范围、二次确认、通过 BackupExportPort 提供先导出完整备份；清除 Saved/Trash/Draft/Settings/Rule Snapshots 后重新初始化安全默认值。
- 测试：取消、BackupExportPort 失败、确认清除、核心 App/Rule 保留；M10/M11 验证真实备份集成
- 证据：在 `docs/verification/m9/T919.md` 记录删除范围、确认分支、备份失败保护、清除前后数据摘要及测试报告。
- 追踪：REQ-STORAGE-008；Spec §37.5

### M9 Gate

- [ ] T901～T919 完成
- [ ] 保存/恢复/编辑/Trash/Draft 全部通过
- [ ] 多标签保护可用
- [ ] Storage failure 不虚假保存成功
- [ ] Preferences、Replace Guard 持久化、Saved 状态机、Migration 与清除全部数据通过

---

# 14. M10 — Share / Import / Export

## T1001 实现结果文字 Formatter

- 状态：TODO
- 目标：简洁版/详细版，不依赖 DOM。
- 依赖：M9
- 测试：稳定文本
- 追踪：REQ-SHARE-006～007

## T1002 实现 Tile Unicode + 中文映射

- 状态：TODO
- 目标：复制牌面保持分组。
- 依赖：T101、T1001
- 测试：所有牌编码
- 追踪：REQ-SHARE-007

## T1003 定义 SharePayload Schema

- 状态：TODO
- 目标：只包含当前分享所需数据。
- 依赖：T106、T612
- 验收：contentType 只允许正式合法、不能胡、听牌/弃牌分析；`INCOMPLETE_CONTEXT`、Quick Calc、Needs Correction 和 Engine Error 均拒绝生成正式 Payload。
- 测试：白名单、各禁止状态、Rule Version 与 TESTING 标识
- 追踪：REQ-SHARE-001～002

## T1004 实现 Share Codec

- 状态：TODO
- 目标：Canonical JSON → DEFLATE → Base64URL。
- 依赖：T1003
- 测试：roundtrip/property test
- 追踪：REQ-SHARE-001

## T1005 实现分享前摘要

- 状态：TODO
- 目标：规则/版本/类型/结果层/调整/完整牌面。
- 依赖：T1003
- 测试：各种内容类型
- 追踪：REQ-SHARE-004

## T1006 实现打开分享内容流程

- 状态：TODO
- 目标：先校验，再 Replace Guard。
- 依赖：T1004、T916
- 测试：有 Draft 时不丢失
- 追踪：REQ-SHARE-003

## T1007 实现超长链接降级

- 状态：TODO
- 目标：超限改用单牌例 JSON。
- 依赖：T1004
- 测试：长度边界
- 追踪：REQ-SHARE-005

## T1008 定义完整备份 Schema

- 状态：TODO
- 目标：saved/trash/draft/settings/snapshots。
- 依赖：T901～T918
- 测试：Schema
- 追踪：REQ-DATA-001～003

## T1009 实现完整备份导出

- 状态：TODO
- 目标：生成普通 JSON + format version + integrity。
- 依赖：T1008
- 测试：export roundtrip
- 追踪：REQ-DATA-001～003

## T1010 实现单牌例导出

- 状态：TODO
- 目标：脱离设备可复现。
- 依赖：T902、T914
- 测试：另一个空 DB 导入
- 追踪：REQ-DATA-006

## T1011 实现完整备份预览

- 状态：TODO
- 目标：导入前展示数量/版本/关键风险。
- 依赖：T1008
- 测试：正常/高版本
- 追踪：REQ-DATA-004

## T1012 实现合并导入

- 状态：TODO
- 目标：外部 ID 重分配，不覆盖。
- 依赖：T1011
- 测试：同名、同 ID、重复导入
- 追踪：REQ-DATA-005

## T1013 实现覆盖恢复安全备份

- 状态：TODO
- 目标：破坏性恢复前自动生成当前备份。
- 依赖：T1009、T1011
- 验收：当前完整备份成功生成并可校验后才允许覆盖恢复；备份失败或结果不明确时不得改变现有数据。
- 测试：备份失败时禁止覆盖
- 证据：在 `docs/verification/m10/T1013.md` 记录备份成功/失败 fixture、覆盖是否发生及测试报告。
- 追踪：REQ-DATA-004

## T1014 实现覆盖恢复事务

- 状态：TODO
- 目标：全量成功才 commit。
- 依赖：T1013
- 验收：所有导入数据通过校验并在同一事务完成后才 commit；中途异常完整 rollback，恢复前数据保持不变。
- 测试：中途异常 rollback
- 证据：在 `docs/verification/m10/T1014.md` 记录事务故障点、rollback 后数据摘要和测试报告。
- 追踪：REQ-DATA-004

## T1015 实现单牌例导入

- 状态：TODO
- 目标：预览→临时打开→主动保存。
- 依赖：T1010
- 测试：不自动进入 Saved
- 追踪：REQ-DATA-007

## T1016 实现高版本兼容与只读降级

- 状态：TODO
- 目标：关键不兼容不猜测。
- 依赖：T1008、T1010
- 验收：未知非关键字段可安全忽略；关键不兼容只能进入明确只读状态，不重新计算、不覆盖当前数据且不静默丢弃字段。
- 测试：unknown noncritical/critical
- 证据：在 `docs/verification/m10/T1016.md` 记录版本 fixture、兼容判定、只读展示和数据保留结果。
- 追踪：REQ-DATA-008

## T1017 实现外部数据安全限制

- 状态：TODO
- 目标：限制文件大小、深度、字段数、数组数等。
- 依赖：T1003、T1008
- 验收：所有超限或畸形 Payload 在隔离校验阶段被拒绝，不覆盖 Draft、不写入持久层、不执行外部内容。
- 测试：oversized/malformed payload
- 证据：在 `docs/verification/m10/T1017.md` 记录限制阈值、恶意 fixture、拒绝结果和测试报告。
- 追踪：REQ-DATA-009；Architecture §47

## T1018 实现选择性批量导出

- 状态：TODO
- 目标：导出用户明确选择的一组 Saved Example。
- 依赖：T902、T1008
- 验收：
  - 只包含选择记录及其必要 Rule Snapshot。
  - 不包含未选择记录、Draft、Trash 或无关偏好。
  - 保留 Rule/Engine/Data/Single Example 相关版本。
- 测试：单选、多选、空选、依赖 Snapshot、另一个空 DB roundtrip
- 追踪：REQ-DATA-002

## T1019 实现普通 JSON 内容与保管责任提示

- 状态：TODO
- 目标：所有 Full/Selected/Single JSON 导出前展示一致的非加密与保管提示。
- 依赖：T1009、T1010、T1018
- 验收：提示文件内容范围、普通 JSON 未加密和用户保管责任；取消后不生成文件。
- 测试：三种导出类型、确认/取消、可访问性
- 追踪：REQ-DATA-003；Spec §35.3

### M10 Gate

- [ ] T1001～T1019 完成
- [ ] Share/Backup/Import roundtrip 通过
- [ ] 导入失败不破坏现有数据
- [ ] 超长分享不生成损坏 URL
- [ ] Full / Selected Batch / Single Example 导出及 JSON 保管提示通过

---

# 15. M11 — PWA / Offline / Update

## T1101 配置 PWA Manifest 与图标

- 状态：TODO
- 目标：在 T013 脚手架上配置正式可安装 Manifest 和合法授权像素风幺鸡图标。
- 依赖：M10、T013
- 验收：名称、副标题、start_url、display、theme、正式图标完整；图标来源进入 Asset Manifest，并复用于 favicon/PWA/默认分享标识。
- 测试：manifest 校验、图标尺寸/可读性、Asset Manifest
- 追踪：REQ-PROD-002～003、006；Spec §2.1；Architecture §70

## T1102 配置 Service Worker App Shell

- 状态：TODO
- 目标：在 T013 扩展点上实现生产 Service Worker、正式 App Shell 缓存和 prompt 更新策略。
- 依赖：T1101
- 测试：离线重开、缓存版本、更新不静默接管
- 追踪：REQ-STORAGE-005～006

## T1103 将大众麻将核心规则加入离线缓存

- 状态：TODO
- 目标：首次完成加载后核心计算离线。
- 依赖：T210、T1102
- 测试：断网计算
- 追踪：REQ-STORAGE-006

## T1104 将核心百科加入离线缓存

- 状态：TODO
- 目标：将 T810 产出的核心百科 bundle/resource manifest 纳入生产 Service Worker，完成番表、详情、示例和来源离线能力。
- 依赖：T810、T1102
- 测试：断网百科
- 追踪：REQ-ENC-007

## T1105 实现非打扰式安装提示

- 状态：TODO
- 目标：首次不弹，使用后轻提示，设置常驻入口。
- 依赖：T1101
- 测试：提示频率
- 追踪：REQ-STORAGE-005

## T1106 实现可选 Rule Package 下载框架

- 状态：TODO
- 目标：为 v0.2+ 准备 explicit download/cache。
- 依赖：T209、T1102
- 测试：假规则包安装
- 追踪：REQ-STORAGE-006

## T1107 实现 Rule Package Integrity 与 Staging

- 状态：TODO
- 目标：完整验证后才激活。
- 依赖：T1106
- 验收：Schema、版本、Capability、来源引用和完整性校验全部通过后才原子激活；损坏、中断或校验失败继续使用旧版，不产生半激活状态。
- 测试：损坏包/中断
- 证据：在 `docs/verification/m11/T1107.md` 记录 staging 状态、故障注入、旧版保留和测试报告。
- 追踪：REQ-UPDATE-003

## T1108 实现 version.json 更新检查

- 状态：TODO
- 目标：实现 App `version.json` 每天最多一次静态元数据请求；Rule 更新发现由 T1114 独立实现。
- 依赖：T1102
- 测试：节流、关闭自动检查
- 追踪：REQ-UPDATE-002

## T1109 实现 App 更新提示

- 状态：TODO
- 目标：立即/稍后/更新内容。
- 依赖：T1108、T909
- 测试：更新前 Draft 保存
- 追踪：REQ-UPDATE-001

## T1110 实现 Rule Update 选择

- 状态：TODO
- 目标：不静默改变旧牌例。
- 依赖：T1106～T1107
- 测试：旧版共存
- 追踪：REQ-UPDATE-004

## T1111 实现规则包删除与 Snapshot 保留

- 状态：TODO
- 目标：删除可选资源但不破坏历史牌例。
- 依赖：T914、T1106
- 测试：依赖旧规则牌例
- 追踪：REQ-STORAGE-007

## T1112 实现完整 Settings 页面

- 状态：TODO
- 目标：将零散偏好和数据能力接入正式 Settings 信息架构。
- 依赖：T915、T919、T1009、T1105、T1108
- 实现：外观、Reduced Motion、听牌排序、默认复制格式、安装入口、自动更新开关、App/Rule 手动检查入口与 Application Ports、数据管理、存储占用、清除全部数据。
- 验收：所有偏好通过同一 Preferences Repository 持久化；将 T919 的 BackupExportPort 接入 T1009，清除数据前可先执行真实 Full Backup。
- 测试：各设置 roundtrip、刷新恢复、数据管理、清除/备份集成
- 追踪：REQ-UI-004～005、REQ-WAIT-003、REQ-SHARE-006、REQ-STORAGE-005、008、REQ-UPDATE-002；Spec §37

## T1113 实现 Help / About / Privacy / Feedback

- 状态：TODO
- 目标：完成设置中的帮助、引导重播、用途、隐私和反馈入口。
- 依赖：T1112、T714
- 验收：
  - 显示产品用途和非金钱化声明。
  - 显示本地优先、无账号/云同步/自动遥测和备份建议。
  - 支持 GitHub Issue、反馈邮件、复制问题信息。
  - 牌面、结果、临时规则默认不附带，只有用户勾选并预览后加入。
- 测试：帮助跳转、引导重播、隐私内容、Feedback 勾选/预览、无自动上传
- 追踪：REQ-PROD-004～005、REQ-PRIV-001～004

## T1114 实现 Rule Update Discovery

- 状态：TODO
- 目标：通过静态规则索引发现新 Rule Version，并与 App 更新检查分离。
- 依赖：T1106～T1108、T1112、T915
- 验收：
  - Rule 自动检查每天最多一次，可关闭。
  - Settings 可手动检查。
  - 请求不携带牌面、牌例、设置或设备标识。
  - 发现更新只提示，不静默安装或改变旧牌例。
- 测试：日限流、关闭、手动检查、请求参数、旧版共存
- 追踪：REQ-UPDATE-002～004；Architecture §53～54

## T1115 统一产品身份与应用资产

- 状态：TODO
- 目标：确保标题、副标题和同一合法授权幺鸡图标贯穿网页、PWA、分享和 About。
- 依赖：T525、T1101、T1113
- 验收：
  - 主标题为“麻将番数计算器”。
  - 副标题为“多地区规则 · 附带番表”。
  - favicon、PWA、默认分享标识使用同一资产事实。
  - Asset Manifest 包含 author/source/license/modified。
- 测试：metadata/manifest/share/about 一致性、小尺寸视觉清单
- 追踪：REQ-PROD-002～004、REQ-UI-003

### M11 Gate

- [ ] T1101～T1115 完成
- [ ] 核心 Calculator/百科离线可用
- [ ] App/Rule 更新不静默覆盖
- [ ] Rule Package 损坏不会半激活
- [ ] Settings、Help/Privacy/Feedback、App/Rule Update Discovery 和产品身份通过

---

# 16. M12 — Quality Hardening

## T1201 完成主题系统

- 状态：TODO
- 目标：system/light/dark。
- 依赖：M11
- 验收：三种主题均可切换并按设置恢复；system 跟随系统变化，核心内容在三种主题下可读。
- 测试：主题切换
- 证据：在 `docs/verification/m12/T1201.md` 记录三种模式、刷新恢复、系统变化和视觉检查结果。
- 追踪：REQ-UI-004

## T1202 完成 Reduced Motion

- 状态：TODO
- 目标：系统偏好 + 手动关闭非必要动画。
- 依赖：T1201
- 验收：系统 Reduced Motion 与手动设置均可关闭非必要动画，且不影响状态反馈和核心操作。
- 测试：prefers-reduced-motion
- 证据：在 `docs/verification/m12/T1202.md` 记录系统/手动组合矩阵和测试报告。
- 追踪：REQ-UI-005

## T1203 完成麻将牌基础无障碍

- 状态：TODO
- 目标：tile aria-label、focus、键盘。
- 依赖：M5
- 验收：麻将牌具有可理解名称、可见焦点并可用键盘完成核心选牌操作；不得只依赖颜色表达状态。
- 测试：keyboard/a11y
- 证据：在 `docs/verification/m12/T1203.md` 记录键盘路径、aria 检查和自动/人工无障碍结果。
- 追踪：REQ-QUAL-003

## T1204 完成 Dialog/Focus 无障碍

- 状态：TODO
- 目标：Modal 焦点锁定和关闭恢复。
- 依赖：M5～M10
- 验收：Dialog 打开后焦点进入并受控，关闭后回到触发点；Escape/确认/取消路径均无焦点丢失。
- 测试：keyboard
- 证据：在 `docs/verification/m12/T1204.md` 记录主要 Dialog 的焦点路径和测试报告。
- 追踪：REQ-QUAL-003

## T1205 完成 Live Region

- 状态：TODO
- 目标：分析中、完成、错误可被读屏识别。
- 依赖：M7
- 验收：分析开始、完成、取消和错误均产生适度且不重复轰炸的可读屏状态通知。
- 测试：a11y
- 证据：在 `docs/verification/m12/T1205.md` 记录事件矩阵、读屏/自动检查结果和测试报告。
- 追踪：REQ-QUAL-003

## T1206 完成移动端响应式验收

- 状态：TODO
- 目标：窄屏/常见手机可完成全流程。
- 依赖：M11
- 验收：规定窄屏 viewport 可完成选牌、条件、分析、查看结果、保存、复制和分享；无遮挡、不可达操作或横向溢出 blocker。
- 测试：Playwright viewport
- 证据：在 `docs/verification/m12/T1206.md` 记录 viewport 矩阵、逐流程结果、截图和 E2E 报告。
- 追踪：REQ-NAV-*、REQ-QUAL-001

## T1207 完成桌面响应式验收

- 状态：TODO
- 目标：左右布局和导航稳定。
- 依赖：M11
- 验收：规定桌面 viewport 下左右布局、四主导航和响应式降级稳定，核心流程全部可完成。
- 测试：桌面 E2E
- 证据：在 `docs/verification/m12/T1207.md` 记录 viewport/浏览器矩阵、截图和 E2E 报告。
- 追踪：REQ-NAV-004、012

## T1208 完成 Safari/WebKit 核心 E2E

- 状态：TODO
- 目标：验证 Safari 关键流程。
- 依赖：M11
- 验收：WebKit 下选牌、计算、听牌、保存/恢复、复制、分享及规定降级路径全部通过。
- 测试：Playwright WebKit
- 证据：在 `docs/verification/m12/T1208.md` 记录 WebKit 版本、逐流程结果和 E2E 报告。
- 追踪：REQ-QUAL-001

## T1209 完成 Android/Chromium 核心回归

- 状态：TODO
- 目标：移动 Chromium 核心流程。
- 依赖：M11
- 验收：规定 Android/Chromium 环境下核心流程和触控交互全部通过，无移动端 blocker。
- 测试：移动 Chromium
- 证据：在 `docs/verification/m12/T1209.md` 记录设备/模拟环境、浏览器版本、逐流程结果和报告。
- 追踪：REQ-QUAL-001

## T1210 完成微信内置浏览器人工验收清单

- 状态：TODO
- 目标：验证选牌、计算、听牌、复制、分享。
- 依赖：M11
- 验收：真实微信内置浏览器完成选牌、计算、听牌、复制和打开分享链接；所有必测流程明确记录 `PASS`，未执行、`FAIL` 或结果不明不得通过。
- 测试：真实设备人工验收
- 证据：在 `docs/verification/m12/T1210.md` 记录设备、系统、微信版本、逐用例结果和截图/录屏或缺陷链接。
- 追踪：REQ-QUAL-001

## T1211 完成存储故障回归

- 状态：TODO
- 目标：IDB/Quota 失败进入 Temporary Mode。
- 依赖：T913
- 验收：IDB/Quota 故障均进入规定降级；仍可计算且不会虚假保存、覆盖或静默丢失数据。
- 测试：故障注入
- 证据：在 `docs/verification/m12/T1211.md` 记录故障矩阵、降级行为、数据前后摘要和测试报告。
- 追踪：REQ-STORAGE-003

## T1212 完成 Migration Test Harness

- 状态：TODO
- 目标：后续 Beta/RC 数据迁移可自动验证。
- 依赖：T918
- 验收：Harness 可覆盖所有受支持旧 Schema、成功迁移、备份失败、中途异常、rollback 和只读降级，并输出可判定报告。
- 测试：旧 Schema → 当前 Schema
- 证据：在 `docs/verification/m12/T1212.md` 记录 fixture 版本矩阵、Harness 命令、报告和失败样例。
- 追踪：REQ-REL-006、REQ-DATA-008

## T1213 完成 Import/Export 全量回归

- 状态：TODO
- 目标：完整备份、合并、覆盖、单牌例。
- 依赖：M10
- 验收：完整备份、选择性批量、合并导入、覆盖恢复和单牌例 roundtrip 全部通过；失败路径不破坏现有数据。
- 测试：E2E roundtrip
- 证据：在 `docs/verification/m12/T1213.md` 记录数据集、各路径前后摘要、事务结果和 E2E 报告。
- 追踪：REQ-DATA-001～009

## T1214 完成 Share 安全回归

- 状态：TODO
- 目标：malformed/oversized/高版本不破坏 Draft。
- 依赖：M10
- 验收：畸形、超限和高版本 Share Payload 均在替换前被拒绝或只读降级，当前 Draft 与持久数据保持不变。
- 测试：恶意 Payload
- 证据：在 `docs/verification/m12/T1214.md` 记录恶意 fixture、拒绝/降级结果、Draft 前后摘要和报告。
- 追踪：REQ-SHARE-*、REQ-DATA-009

## T1215 完成百科内容安全测试

- 状态：TODO
- 目标：防 raw HTML/script/XSS。
- 依赖：M8
- 验收：百科内容不执行 raw HTML、script、危险 URL 或事件属性；恶意内容以安全文本或明确拒绝方式处理。
- 测试：恶意 Markdown fixture
- 证据：在 `docs/verification/m12/T1215.md` 记录恶意 fixture、渲染结果、DOM/安全检查和测试报告。
- 追踪：Architecture §72、§89

## T1216 完成 PWA Offline Smoke

- 状态：TODO
- 目标：断网后核心功能完整。
- 依赖：M11
- 验收：首次成功加载后断网重开，选牌、计算、听牌、核心百科和已保存牌例可用；未缓存可选资源给出明确提示。
- 测试：Playwright offline
- 证据：在 `docs/verification/m12/T1216.md` 记录缓存版本、断网步骤、逐流程结果和 E2E 报告。
- 追踪：REQ-STORAGE-006

## T1217 完成性能验收

- 状态：TODO
- 目标：普通和牌目标 1s、听牌/弃牌目标 3s。
- 依赖：T712
- 验收：在固定设备、浏览器、构建和牌例集上，普通和牌及听牌/弃牌分别达到目标；未达目标时记录为明确失败而非主观“可接受”。
- 测试：固定设备/牌例记录
- 证据：在 `docs/verification/m12/T1217.md` 记录环境、样本、每次耗时、统计口径和原始数据。
- 追踪：REQ-ENGINE-012

## T1218 完成隐私检查

- 状态：TODO
- 目标：确认无 Analytics、无自动错误上传，且 Help / About / Privacy 中的隐私说明与实际网络行为一致。
- 依赖：M11、T1113
- 验收：无 Analytics、自动错误上传或用户数据自动外传；所有远程请求与隐私说明一致，反馈附加数据必须由用户主动勾选并预览。
- 测试：Network inspection + 隐私说明核对
- 证据：在 `docs/verification/m12/T1218.md` 记录网络请求清单、隐私文案对照、反馈勾选结果和检查截图。
- 追踪：REQ-PRIV-001～003

## T1219 完成规则测试覆盖审查

- 状态：TODO
- 目标：`common-simple@1.0.0` 的 78 个启用番型均有正例、反例与必要关系用例，3 个禁用番型明确保持不支持；最低番、花牌、自摸与不封顶规则均有覆盖。
- 依赖：T411、T705～T706
- 验收：Coverage Matrix 对 81 个参考番型逐项可追踪；78 个启用番型正反例完整、3 个禁用番型不支持断言完整，关键关系和计分事实无空白。
- 测试：Coverage Matrix
- 证据：在 `docs/verification/m12/T1219.md` 保留 Coverage Matrix、Rule Version、缺口计数和测试报告链接。
- 追踪：REQ-QUAL-004

## T1220 完成正式发布阻断项检查器/清单

- 状态：TODO
- 目标：把 RC Gate 固化。
- 依赖：T1201～T1219、T1221
- 验收：
  - 所有 blocker 均可记录 `PASS`、`FAIL` 或 `NOT_RUN`，不得使用空白或“结果不明”。
  - Save、Restore、Import、Share、Migration 必须作为五条独立链路记录；任一 `FAIL`、`NOT_RUN` 或结果不明确都阻断发布。
- 验证：对全 `PASS`、单项 `FAIL`、单项 `NOT_RUN` 和结果缺失 fixture 执行检查器/清单 dry run，只有全 `PASS` fixture 可通过。
- 证据：保留 `docs/verification/m12/T1220.md`，附检查器输出或清单样例，并关联五条链路的独立证据位置。
- 追踪：REQ-REL-005

## T1221 完成浏览器能力检测与降级提示

- 状态：TODO
- 目标：对 Web Worker、IndexedDB、Cache Storage、Service Worker / PWA、Clipboard、Web Share 与 File APIs 进行统一运行时检测；不支持时提供与 Spec 一致的可操作降级或提示，不以 User-Agent 猜测代替能力检测，非核心能力缺失不得阻断计算。
- 依赖：T702、T913、M10、T1102、T1104、T1112、T1208～T1210
- 验收：支持与不支持 fixture 均能进入确定路径；Worker 缺失时使用同一确定性 Engine 主线程降级，IndexedDB 缺失进入 Temporary Mode，其余非核心能力按 Architecture §61 降级；关键流程不会白屏、静默失败或返回近似结果。
- 测试：能力矩阵单元测试 + Chromium/WebKit E2E + 微信人工清单
- 证据：在 `docs/verification/m12/T1221.md` 记录能力矩阵、支持/缺失 fixture、各平台降级结果及自动/人工报告。
- 追踪：REQ-QUAL-001、REQ-STORAGE-003～007；Spec §54；Architecture §83

### M12 Gate

- [ ] 无障碍核心要求通过
- [ ] 移动/桌面/Safari/微信核心流程通过
- [ ] PWA/Offline/Storage/Migration/Share/Import 回归完成
- [ ] Rule Test Corpus 完整
- [ ] 浏览器能力检测与降级路径通过
- [ ] 可以进入 Alpha

---

# 17. Alpha 任务

## TA01 发布 v0.1.0-alpha.1

- 状态：TODO
- 依赖：M12 Gate
- 目标：首次完整内部测试构建。
- 验收：
  - 所有冻结主功能存在。
  - 版本标注 alpha。
- 验证：对 Alpha 构建执行静态启动和冻结主功能入口 smoke，并核对 App/Engine/Rule/Data 版本标识。
- 证据：保留 `docs/verification/v0.1.0-alpha.1/TA01.md`，记录构建标识、smoke 结果及 Artifact 链接。
- 追踪：REQ-REL-004

## TA02 执行内部规则牌例核对

- 状态：TODO
- 依赖：TA01
- 目标：程序结果与人工计算交叉验证。
- 验收：人工复核范围覆盖 Rule Test Corpus 的高风险结构、关系、门槛、自摸、花牌和 3 个禁用结构；发现差异必须登记，不得以解释性备注直接改判程序结果为通过。
- 测试：规则人工复核表
- 证据：保留 `docs/verification/alpha/TA02.md`，附复核人、牌例范围、程序/人工结果、差异和处理链接。
- 追踪：REQ-RULE-005、REQ-QUAL-004

## TA03 建立 Alpha 缺陷回归机制

- 状态：TODO
- 依赖：TA01
- 目标：每个规则 Bug 进入永久 Rule Case。
- 验收：Bug 无测试不得关闭。
- 验证：以一个模拟规则 Bug 走完“登记 → Rule Case → 修复验证 → 关闭”流程，并验证缺少 Rule Case 时无法标记关闭。
- 证据：保留 `docs/verification/alpha/TA03.md`，附缺陷与永久 Rule Case 的双向引用样例。
- 追踪：Constitution 原则二；Plan §17

## TA04 Alpha 数据升级验证

- 状态：TODO
- 依赖：TA01
- 目标：alpha.x 之间测试 Draft/Saved Migration。
- 验收：所有受支持 alpha.x fixture 可升级；迁移前备份、失败 rollback/只读保留和关键数据前后一致性均通过。
- 测试：旧 alpha 数据升级
- 证据：保留 `docs/verification/alpha/TA04.md`，附版本矩阵、前后数据摘要和 Migration Harness 报告。
- 追踪：REQ-REL-006

### Alpha Exit Gate

- [ ] 无大范围基础 Engine 缺陷
- [ ] `common-simple@1.0.0` 的 78 个启用番型均有自动测试，3 个禁用番型均有不支持断言
- [ ] 核心流程可由非开发者完成

---

# 18. Beta 任务

## TB01 发布 v0.1.0-beta.1

- 状态：TODO
- 依赖：Alpha Exit Gate
- 目标：进入公开测试。
- 验收：Alpha Exit Gate 有完整 `PASS` 证据；构建明确标注 `v0.1.0-beta.1`，并包含测试范围、已知限制和反馈入口。
- 验证：执行发布构建、静态启动和版本/发布说明 smoke。
- 证据：保留 `docs/verification/v0.1.0-beta.1/TB01.md`，关联 Alpha Gate 记录、构建 Artifact 和发布说明。
- 追踪：REQ-REL-004

## TB02 收集并分类 Beta 规则问题

- 状态：TODO
- 依赖：TB01
- 目标：区分规则 Bug、资料争议、UI 误解。
- 验收：每项关联 Rule Version/Source。
- 验证：抽查所有新增 Beta 规则问题，确认分类、Rule Version、Source、复现牌例和处理状态完整；缺项不得关闭。
- 证据：保留 `docs/verification/beta/TB02.md` 或等价问题台账导出，并链接问题记录。
- 追踪：REQ-RULE-006～007

## TB03 完成 Beta 跨端实测

- 状态：TODO
- 依赖：TB01
- 目标：真实手机/桌面/微信。
- 验收：在真实手机、桌面和微信内置浏览器分别完成选牌、计算、听牌、保存/恢复、复制和打开分享链接；必测用例全部 `PASS`，任一核心流程 `FAIL`、未执行或结果不明均不得通过 Beta Gate。
- 验证：按设备/浏览器矩阵执行人工端到端验收，记录设备、OS、浏览器/微信版本及逐用例结果。
- 证据：保留 `docs/verification/v0.1.0-beta.1/TB03.md`，附设备矩阵、截图/录屏或缺陷链接。
- 追踪：REQ-REL-005

## TB04 Beta 数据迁移回归

- 状态：TODO
- 依赖：TB01
- 目标：beta.x 版本间不静默丢数据。
- 验收：所有受支持 beta.x fixture 均可迁移到当前版本；迁移前安全备份可用，Saved/Draft/Trash/Settings/Rule Snapshot 数量和关键内容保持；失败路径 rollback 或只读保留，不静默删除。
- 验证：执行旧 beta fixture → 当前 Schema 的自动 Migration Harness，并人工抽查迁移前后关键记录。
- 证据：保留 `docs/verification/beta/TB04.md`，附 fixture 版本矩阵、自动报告、前后数据摘要和 rollback 结果。
- 追踪：REQ-REL-006

### Beta Exit Gate

- [ ] 无已知严重错算
- [ ] Rule Cases 全通过
- [ ] 保存 / 恢复 / 分享 / 导入 / 迁移分别通过并有独立结果记录
- [ ] 手机/桌面/微信核心流程通过

---

# 19. RC 任务

## TR01 发布 v0.1.0-rc.1

- 状态：TODO
- 依赖：Beta Exit Gate
- 目标：冻结新功能，只做发布阻断修复。
- 验收：Beta Exit Gate 有完整 `PASS` 证据；构建明确标注 `v0.1.0-rc.1`，功能冻结范围和允许修复范围已有记录。
- 验证：执行 RC 发布构建、静态启动、版本标识及功能冻结清单检查。
- 证据：保留 `docs/verification/v0.1.0-rc.1/TR01.md`，关联 Beta Gate、构建 Artifact 和冻结清单。
- 追踪：REQ-REL-004～005

## TR02 执行完整 RC Rule Test

- 状态：TODO
- 依赖：TR01
- 验收：`common-simple@1.0.0` 的 78 个启用番型自动测试 100% 通过，3 个禁用番型的不支持断言 100% 通过。
- 验证：在 RC 构建对应提交上执行完整 Rule Test Corpus，不允许跳过、重试后隐藏首轮失败或只运行子集。
- 证据：保留 `docs/verification/v0.1.0-rc.1/TR02.md`，附测试命令、提交标识、81/78/3 汇总和原始报告链接。
- 追踪：REQ-RULE-005、REQ-QUAL-004

## TR03 执行 RC 数据完整性验收

- 状态：TODO
- 依赖：TR01
- 范围：Saved/Draft/Trash/Backup/Import/Share/Migration。
- 验收：保存、恢复、导入、分享、迁移五条发布关键链路分别通过并形成独立验收记录；任一失败均阻断发布。
- 验证：分别执行 Save、Restore、Import、Share、Migration 的正常、损坏/失败和恢复路径；每条链路独立判定 `PASS`/`FAIL`，不得以综合 smoke 替代。
- 证据：保留 `docs/verification/v0.1.0-rc.1/TR03.md` 作为索引，并分别关联五条链路的用例、数据前后摘要和测试报告。
- 追踪：REQ-REL-005

## TR04 执行 RC 浏览器验收

- 状态：TODO
- 依赖：TR01
- 范围：Chrome/Edge/Safari/Android/WeChat。
- 验收：Chrome、Edge、Safari、Android 主流浏览器和微信内置浏览器的规定核心流程全部 `PASS`；任一必测平台未执行、`FAIL` 或结果不明均阻断 RC。
- 验证：执行自动 E2E 与真实设备人工矩阵；至少覆盖选牌、计算、听牌、复制、保存/恢复和打开分享链接，以及能力缺失时的规定降级。
- 证据：保留 `docs/verification/v0.1.0-rc.1/TR04.md`，附平台版本、逐用例结果、自动报告及截图/缺陷链接。
- 追踪：REQ-QUAL-001

## TR05 执行 RC PWA/Offline 验收

- 状态：TODO
- 依赖：TR01
- 验收：正式 Manifest、安装、生产 Service Worker、App Shell、核心规则和核心百科缓存均可用；断网重开后核心计算与百科流程通过，更新只提示且不静默接管当前状态。
- 验证：在生产构建上执行安装、首次加载后断网、离线重开、缓存升级、损坏/旧缓存恢复和更新提示测试。
- 证据：保留 `docs/verification/v0.1.0-rc.1/TR05.md`，附浏览器/PWA 环境、逐项结果、自动报告和截图/录屏链接。
- 追踪：REQ-STORAGE-005～007

## TR06 执行 RC 阻断项审查

- 状态：TODO
- 依赖：TR02～TR05
- 验收：
  - 严重错算 = 0
  - 严重漏算 = 0
  - 合法性严重误判 = 0
  - 数据严重故障 = 0
  - 核心流程 blocker = 0
  - 保存 / 恢复 / 导入 / 分享 / 迁移 = 全部通过
- 验证：逐项审查 TR02～TR05 及 T1220 证据；任何缺失记录、`FAIL`、`NOT_RUN` 或结果不明确均判定 RC Gate 不通过。
- 证据：保留 `docs/verification/v0.1.0-rc.1/TR06.md`，形成 blocker 清单、五链路独立状态和所有上游证据链接。
- 追踪：REQ-REL-005

---

# 20. 正式发布任务

## TF01 发布 v0.1.0

- 状态：TODO
- 依赖：TR06
- 目标：发布首个正式版本。
- 验收：
  - App Version 固定；
  - Engine Version 固定；
  - Rule Version 固定；
  - Release Notes；
  - Rule Support Scope；
  - Known Limitations；
  - PWA 正常。
  - 保存 / 恢复 / 导入 / 分享 / 迁移的 RC 验收全部通过。
- 验证：核对 TR06 为 `PASS`，复验正式 Artifact 的版本、静态启动、PWA metadata、Release Notes、支持范围和已知限制；不得在正式发布时补做未完成的 RC 验收。
- 证据：保留 `docs/verification/v0.1.0/TF01.md`，关联 RC Gate、正式 Artifact、版本清单和发布说明。
- 追踪：REQ-REL-005

## TF02 建立 v0.1.x Patch 流程

- 状态：TODO
- 依赖：TF01
- 目标：后续 Bug Fix 有明确 Rule/Engine Version 决策。
- 验收：规则 Bug 必须带回归牌例。
- 验证：以模拟规则 Bug、Engine Bug 和纯 UI Bug 分别演练版本决策、回归要求和发布记录流程。
- 证据：保留 `docs/verification/v0.1.x/TF02.md`，附三类样例的版本决策、回归链接和 Patch 清单模板。
- 追踪：REQ-SAVE-012、REQ-QUAL-004

---

# 21. 不进入 v0.1.0 的任务

以下不得被新增成 v0.1.0 开发 Task：

```text
自定义规则编辑器
空白规则编辑器
人工新增系统未识别番型
癞子/财神/百搭
拍照识牌
结果图片生成
账号
云同步
多人牌局结算
一炮多响
金额/支付/赔付
牌河/其他玩家明牌
剩余牌概率
多语言
文本记谱录入
```

若需要这些功能：

```text
先修改 docs/product/requirements-baseline-v1.2.md（或其经批准的后继版本）
→ 重新审查
→ 更新 Spec / Architecture / Plan
→ 再新增 Task
```

---

# 22. 建议 Codex 执行批次

为了降低一次改动范围，建议 Codex 按以下批次执行：

```text
Batch 01: T001-T004
Batch 02: T005-T010
Batch 02A: T011-T013
Batch 03: T101-T105
Batch 04: T106-T110
Batch 05: T201-T205
Batch 06: T206-T208
Batch 06A: T212-T214
Batch 06B: T209-T211
Batch 07: T301-T305
Batch 08: T306-T310
Batch 09: T401-T405
Batch 10: T406-T411
Batch 11: T501-T506
Batch 12: T507-T514
Batch 13: T515-T519
Batch 13A: T520-T525
Batch 14: T601-T607
Batch 15: T608-T614
Batch 15A: T615-T617
Batch 16: T701-T707
Batch 17: T708-T712
Batch 17A: T713-T715
Batch 18: T801-T805
Batch 19: T806-T810
Batch 20: T901-T907
Batch 21: T908-T914
Batch 21A: T915-T919
Batch 22: T1001-T1007
Batch 23: T1008-T1017
Batch 23A: T1018-T1019
Batch 24: T1101-T1105
Batch 25: T1106-T1111
Batch 25A: T1112-T1115
Batch 26: T1201-T1205
Batch 27: T1206-T1210
Batch 28: T1211-T1215
Batch 29: T1216-T1219
Batch 29A: T1221
Batch 29B: T1220
```

这些批次是默认建议，不是新的需求优先级。

如果实际仓库已有部分能力，应先核对现状，再把已满足任务标记为 `DONE`，禁止重复实现或为了“匹配文档”无意义重写。

---

# 23. 每轮 Codex 开始前检查

每个 Batch 开始前应：

1. 阅读 `docs/AGENTS.md`；
2. 阅读当前 Task；
3. 阅读任务直接引用的上游章节；
4. 检查现有代码是否已经存在；
5. 检查是否与当前任务冲突；
6. 给出预计修改范围；
7. 如发现冲突先停止并报告。

---

# 24. 每轮 Codex 完成后检查

每个 Batch 完成后应输出：

```text
完成了哪些 Task
修改了哪些文件
增加了哪些测试
测试结果
是否存在已知限制
是否发现需求/架构冲突
下一批是否可以开始
```

不得只回复“已完成”。

---

# 25. Task Definition of Done

单个 Task 只有同时满足以下条件才可 `DONE`：

- [ ] 实现内容完整
- [ ] 验收标准通过
- [ ] 任务要求的自动测试、人工验证或其他明确验证已执行并通过
- [ ] Gate/发布/人工验收/Migration/兼容/安全/隐私等高风险 Task 已形成规定的证据记录
- [ ] lint/typecheck 通过
- [ ] 不破坏既有 Rule Cases
- [ ] 无新 console error
- [ ] 没有通过 TODO 冒充功能
- [ ] 未新增未经批准的依赖/后端/遥测
- [ ] 若涉及规则变化，Rule Version/Engine Version 已评估
- [ ] 若涉及 Schema，Migration 已评估
- [ ] 若涉及用户行为变化，文档已检查一致
- [ ] Review 后方可标记 DONE

---

# 26. Milestone Definition of Done

Milestone 完成需要：

- 该阶段所有必须 Task 完成；
- Gate 全通过；
- 阶段测试全绿；
- 形成 `docs/verification/<milestone>/gate.md`，逐项关联 Gate 条件、Task、验证方式、`PASS`/`FAIL` 与证据；无证据、结果不明确或仅凭人工印象的项目不得勾选；
- 没有已知阻断后续的数据模型问题；
- 没有需求冲突未处理；
- 文档无需因实现偏差被迫“追认代码”。

---

# 27. 需求追踪摘要

| Task 组 | 主要需求 |
|---|---|
| T0xx | `REQ-GOV-*`, `REQ-QUAL-*` |
| T1xx | `REQ-INPUT-*`, `REQ-CONTEXT-*` |
| T2xx | `REQ-RULE-*`, `REQ-ENC-*`；RulePackage 子 Schema、来源与内容完整性 |
| T3xx | `REQ-ENGINE-001～005` |
| T4xx | `REQ-RESULT-*`, `REQ-ENGINE-*` |
| T5xx | `REQ-NAV-*`, `REQ-UI-*`, `REQ-INPUT-*`, `REQ-CONTEXT-*`；Rule Picker、Onboarding、Replace Guard、Tile Asset Manifest |
| T6xx | `REQ-RESULT-*`；Quick Calc |
| T7xx | `REQ-ENGINE-006～013`, `REQ-WAIT-*`；自动重算、错误恢复与合法和牌继续分析 |
| T8xx | `REQ-ENC-*`, `REQ-RULE-*` |
| T9xx | `REQ-SAVE-*`, `REQ-DRAFT-*`, `REQ-STORAGE-*`；Preferences、Replace Guard 持久化、Migration、清除全部数据 |
| T10xx | `REQ-SHARE-*`, `REQ-DATA-*`；选中批量导出与 JSON 风险提示 |
| T11xx | `REQ-STORAGE-*`, `REQ-UPDATE-*`；正式 PWA、设置/帮助/隐私、App/Rule 更新、产品身份 |
| T12xx | `REQ-UI-*`, `REQ-QUAL-*`, `REQ-PRIV-*`, `REQ-REL-005～006`；浏览器能力检测与发布 Gate |

---

# 28. 文档批准

当前状态：

```text
已批准 / Active
项目方确认日期：2026-08-10
```

当前生效规则：

- `tasks.md` 成为 v0.1.0 的执行清单；
- Codex 应以当前未完成 Task 为主要工作入口；
- 不允许跳过上游文档直接凭提示词自由发挥；
- Task 状态应随实际仓库进展维护；
- 需求变化时先修改 Baseline，而不是直接追加违反范围的新 Task。

---

# 29. 当前下一步

正式执行约束位于 `docs/AGENTS.md`。该文件应将：

- Constitution 的最高约束；
- Architecture 的代码边界；
- Tasks 的执行方式；
- 测试和文档同步要求；

转换为 Codex 在仓库中必须遵守的操作规则。若二者冲突，以本文件及其上游正式文档为准，并先停止受影响工作、报告冲突。

---

# 30. 一句话执行准则

> **每一个 Task 都必须能明确回答“改什么、为什么改、怎样算完成、怎样证明没有破坏麻将规则”；如果这四个问题回答不清楚，就不应开始编码。**
