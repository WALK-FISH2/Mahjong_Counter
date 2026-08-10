# 麻将番数计算器开发任务清单

> **Implementation Tasks — Mahjong Fan Calculator**

## 文档元数据

- 文档名称：Implementation Tasks
- 文档版本：`Tasks 1.0.0`
- 文档状态：已制定，待项目方审阅确认
- 制定日期：2026-08-07
- 主要适用版本：`v0.1.0`
- 上游需求基线：[`requirements-baseline.md`](../product/requirements-baseline.md) — `Baseline 1.1`
- 上游一致性审查：[`requirements-audit.md`](../product/requirements-audit.md) — `PASS`
- 上游项目宪章：[`constitution.md`](../governance/constitution.md) — `Constitution 1.0.0`
- 上游产品规格：[`spec.md`](../product/spec.md) — `Spec 1.0.0`
- 上游技术架构：[`architecture.md`](../architecture/architecture.md) — `Architecture 1.0.0`
- 上游实施计划：[`plan.md`](./plan.md) — `Plan 1.0.0`
- 下游执行约束：项目根目录 `AGENTS.md`

---

# 1. 文档目的

本文件把 `plan.md` 的 M0～M12 进一步拆成可执行、可 Review、可测试、可由 Codex/人工开发者逐项完成的任务。

每个任务至少包含：

- Task ID
- 状态
- 目标
- 依赖
- 涉及模块
- 实现内容
- 验收标准
- 测试要求
- 上游追踪

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

只有满足该任务全部验收标准和测试要求，才可以标记 `DONE`。

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

- 状态：TODO
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

- 状态：TODO
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

- 状态：TODO
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

- 状态：TODO
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

- 状态：TODO
- 目标：建立 Domain/规则单元测试基础。
- 依赖：T001
- 涉及：Vitest 配置、`src/test/`
- 验收：示例单测可运行并进入 CI。
- 测试：`npm test`
- 追踪：Architecture §77、§83

## T006 配置 React Testing Library

- 状态：TODO
- 目标：建立组件行为测试能力。
- 依赖：T005
- 涉及：组件测试环境
- 验收：能渲染并交互一个示例按钮。
- 测试：组件 smoke test
- 追踪：Architecture §77

## T007 配置 Playwright

- 状态：TODO
- 目标：建立浏览器 E2E 基础。
- 依赖：T001
- 涉及：`playwright.config.*`
- 验收：
  - 可启动构建并访问首页。
  - 至少 Chromium/WebKit smoke 通过。
- 测试：`npm run test:e2e`
- 追踪：Architecture §77、§83

## T008 建立版本常量

- 状态：TODO
- 目标：独立管理 App/Engine/Data/Share/Backup 版本。
- 依赖：T001
- 涉及：`src/app/version/`
- 实现：
  - `APP_VERSION`
  - `ENGINE_VERSION`
  - `DATA_SCHEMA_VERSION`
  - `SHARE_FORMAT_VERSION`
  - `BACKUP_FORMAT_VERSION`
- 验收：业务代码不直接散落读取 package 版本。
- 测试：版本常量单测
- 追踪：Architecture §42、§96

## T009 建立基础 Router 与四主页面 Shell

- 状态：TODO
- 目标：创建 Calculator、Encyclopedia、Saved、Settings 页面壳。
- 依赖：T001
- 涉及：`src/app/routes/`、`src/pages/`
- 验收：
  - 四页面可访问。
  - 无业务空按钮冒充完成。
- 测试：路由 smoke
- 追踪：REQ-NAV-003～006；Spec §5

## T010 建立基础 CI

- 状态：TODO
- 目标：自动执行 lint/typecheck/test/build。
- 依赖：T002～T007
- 涉及：CI 配置
- 验收：任一阶段失败即 CI 失败。
- 测试：提交测试分支验证
- 追踪：Architecture §83

### M0 Gate

- [ ] T001～T010 完成
- [ ] `lint/typecheck/test/build` 全通过
- [ ] 项目可静态运行
- [ ] 尚未加入业务规则硬编码

---

# 5. M1 — Mahjong Domain Model

## T101 定义 TileCode 与 Tile Metadata

- 状态：TODO
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

- 状态：TODO
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

- 状态：TODO
- 目标：严格分离 concealed/melds/flowers/winningTile。
- 依赖：T101～T102
- 涉及：`hand.ts`
- 验收：统一展示不会导致数据拍平。
- 测试：序列化 roundtrip
- 追踪：REQ-INPUT-004～007、017、019

## T104 定义 TransientInputSession

- 状态：TODO
- 目标：副露临时录入与正式牌面分离。
- 依赖：T102～T103
- 涉及：`meld-input-state.ts`
- 验收：
  - 未完成吃牌不进入 melds。
  - 可表达前 1～2 张临时选择。
- 测试：临时状态转换
- 追踪：REQ-INPUT-004、012～014

## T105 定义 WinContext

- 状态：TODO
- 目标：建立点炮/自摸与动态上下文字段。
- 依赖：T101
- 涉及：`context.ts`
- 验收：unknown 与 false 可区分。
- 测试：序列化与状态验证
- 追踪：REQ-CONTEXT-*；Architecture §9

## T106 定义 CalculatorDocument

- 状态：TODO
- 目标：建立当前计算唯一事实对象。
- 依赖：T103～T105
- 涉及：`calculator-document.ts`
- 实现：ruleRef、hand、context、temporary adjustment、fan adjustments、source、revision。
- 验收：所有正式计算输入可由该对象表达。
- 测试：roundtrip
- 追踪：Architecture §8

## T107 实现全局牌数统计

- 状态：TODO
- 目标：跨 concealed/melds/winningTile 正确统计普通牌。
- 依赖：T103
- 涉及：`validation.ts`
- 验收：杠四张正确计数，胡牌张计入全局。
- 测试：多区域计数牌例
- 追踪：REQ-INPUT-015～016

## T108 实现结构张数计算

- 状态：TODO
- 目标：支持杠按结构 3、花牌不计结构。
- 依赖：T103
- 涉及：`hand-count.ts`
- 验收：返回结构张数与实际录入张数。
- 测试：普通手牌、杠、花牌组合
- 追踪：REQ-INPUT-021、REQ-ENGINE-005

## T109 建立 Domain 硬校验

- 状态：TODO
- 目标：统一检查第五张、非法牌、副露基本结构。
- 依赖：T107～T108
- 涉及：`validation.ts`
- 验收：所有明确输入错误有稳定 error code。
- 测试：正反例
- 追踪：REQ-INPUT-015、025；Architecture §99

## T110 建立 CalculatorDocument revision 工具

- 状态：TODO
- 目标：任何计算语义变化都生成新 revision。
- 依赖：T106
- 涉及：Application/Domain helper
- 验收：同 revision 只对应一组语义输入。
- 测试：修改不同字段 revision 变化
- 追踪：Architecture §8、§30

### M1 Gate

- [ ] T101～T110 完成
- [ ] Domain 无 React/Storage 依赖
- [ ] 牌数、结构张数与临时副露测试通过

---

# 6. M2 — Rule System

## T201 定义 RulePackage Schema

- 状态：TODO
- 目标：建立规则包顶级结构。
- 依赖：M1
- 涉及：`src/domain/rules/`、`src/schemas/rule-package/`
- 验收：RulePackage 必须经 Zod 校验才能使用。
- 测试：合法/非法 Schema
- 追踪：REQ-RULE-*；Architecture §10

## T202 定义 RuleManifest 与规则状态

- 状态：TODO
- 目标：支持 development/test/full。
- 依赖：T201
- 验收：开发中规则不可进入 Calculator。
- 测试：状态行为
- 追踪：REQ-RULE-002～005

## T203 定义 TileSetDefinition

- 状态：TODO
- 目标：规则动态声明牌种和最大副本数。
- 依赖：T201
- 验收：可表达 27/34/42。
- 测试：三种典型集合
- 追踪：REQ-INPUT-002、015、016

## T204 定义 HandModelDefinition

- 状态：TODO
- 目标：规则化 13/14 与副露组数。
- 依赖：T201
- 验收：Engine/UI 不需写死目标张数。
- 测试：普通 14 张配置
- 追踪：REQ-INPUT-020～021、REQ-ENGINE-005

## T205 定义 ContextDefinition

- 状态：TODO
- 目标：规则声明上下文动态字段。
- 依赖：T201、T105
- 验收：可表达门风、圈风、杠上花等。
- 测试：必填、显示条件、互斥
- 追踪：REQ-CONTEXT-002～008

## T206 定义 PatternDefinition 与 RuleSource

- 状态：TODO
- 目标：番型值、Recognizer Key、来源可追溯。
- 依赖：T201
- 验收：每个 Pattern 可引用来源。
- 测试：source ref 校验
- 追踪：REQ-RULE-007、REQ-ENC-002

## T207 定义 PatternRelation Schema

- 状态：TODO
- 目标：支持 covers/mutex/non-repeat。
- 依赖：T206
- 验收：关系成员必须存在且无非法环。
- 测试：关系图正反例
- 追踪：REQ-RESULT-005、007；Architecture §18

## T208 建立 Capability Registry

- 状态：TODO
- 目标：规则包只能引用可信 Engine 能力。
- 依赖：T201
- 验收：未知 capability 阻止计算。
- 测试：缺失 capability
- 追踪：Architecture §11

## T209 建立 Rule Repository 最小实现

- 状态：TODO
- 目标：统一加载内置规则。
- 依赖：T201～T208
- 涉及：`src/infrastructure/rule-repository/`
- 验收：Application 不直接 fetch/读取 JSON。
- 测试：加载内置 Rule
- 追踪：Architecture §49

## T210 建立大众麻将·通用简化版 RulePackage 骨架

- 状态：TODO
- 目标：首版规则走正式 RulePackage Pipeline。
- 依赖：T201～T209
- 验收：
  - 独立 Rule ID。
  - 与国标无混称。
  - Rule status/source/version 完整。
- 测试：Schema/Capability/Source 校验
- 追踪：REQ-REL-001～002、REQ-RULE-009

## T211 建立 Build-time Rule Validator

- 状态：TODO
- 目标：构建时阻止损坏规则进入产物。
- 依赖：T206～T210
- 验收：ID/关系/source/capability 错误阻断。
- 测试：故意制造非法规则
- 追踪：Architecture §84

### M2 Gate

- [ ] 大众麻将规则包可由 RuleRepository 加载
- [ ] UI/Engine 可读取动态牌种、结构张数和状态
- [ ] 规则包完全是数据，不执行脚本

---

# 7. M3 — Structure Engine

## T301 建立 TileCount 内部表示

- 状态：TODO
- 目标：为拆分算法提供高效计数数组。
- 依赖：M2
- 验收：稳定 TileCode 可映射到内部索引并无损返回。
- 测试：全牌 roundtrip
- 追踪：Architecture §15

## T302 实现普通结构 DFS

- 状态：TODO
- 目标：枚举面子+将所有合法拆分。
- 依赖：T301、T204
- 验收：不在第一解停止。
- 测试：单解、多解、无解
- 追踪：REQ-ENGINE-001～003

## T303 为 DFS 增加 Memoization

- 状态：TODO
- 目标：降低重复搜索。
- 依赖：T302
- 验收：结果与无缓存版本完全一致。
- 测试：一致性 + 性能对比
- 追踪：REQ-ENGINE-012

## T304 实现拆分 Canonical Dedup

- 状态：TODO
- 目标：去掉等价重复拆分。
- 依赖：T302
- 验收：同逻辑组合只保留一次。
- 测试：重复路径牌例
- 追踪：REQ-ENGINE-003

## T305 集成固定副露

- 状态：TODO
- 目标：副露不参与暗手牌重新拆分。
- 依赖：T302、T102
- 验收：declared melds 固定进入结果。
- 测试：吃/碰/杠牌例
- 追踪：REQ-INPUT-004、REQ-ENGINE-003

## T306 实现七对结构

- 状态：TODO
- 目标：独立识别七对。
- 依赖：T301
- 测试：正例、反例、副露非法
- 追踪：REQ-ENGINE-001

## T307 实现十三幺结构

- 状态：TODO
- 目标：独立识别十三幺。
- 依赖：T301
- 测试：正例、反例
- 追踪：REQ-ENGINE-001

## T308 实现多结构并行枚举

- 状态：TODO
- 目标：同时返回普通/七对/十三幺候选。
- 依赖：T302、T306、T307
- 验收：不按结构优先级提前停止。
- 测试：同时符合多个结构的牌例
- 追踪：REQ-ENGINE-002

## T309 实现 Winning Tile Placement

- 状态：TODO
- 目标：枚举胡牌张在拆分中的所有有效落点。
- 依赖：T302～T308
- 验收：可区分将、顺子、刻子落点。
- 测试：多落点牌例
- 追踪：REQ-INPUT-017～018；Architecture §16

## T310 建立 Structure Rule Test Corpus

- 状态：TODO
- 目标：建立首批规则标准牌例。
- 依赖：T302～T309
- 验收：普通/七对/十三幺/多拆分均有正反例。
- 测试：CI 批量执行
- 追踪：REQ-QUAL-004

### M3 Gate

- [ ] 所有结构测试通过
- [ ] 多拆分不会漏解
- [ ] Winning Tile Placement 可供番型识别使用

---

# 8. M4 — Pattern / Score Engine

## T401 实现 DerivedFacts

- 状态：TODO
- 目标：统一派生花色、字牌、门清、面子等事实。
- 依赖：M3
- 验收：Recognizer 不重复计算公共事实。
- 测试：各种拆分
- 追踪：Architecture §17

## T402 建立 PatternRecognizer Registry

- 状态：TODO
- 目标：按 recognizerKey 调用可信识别器。
- 依赖：T206、T401
- 验收：未知 key 阻止规则加载。
- 测试：registry lookup
- 追踪：Architecture §17

## T403 实现大众麻将首批基础番型 Recognizer

- 状态：TODO
- 目标：按 Baseline/规则文档逐项实现 v0.1 番型。
- 依赖：T402
- 验收：每个番型都有 Evidence。
- 测试：每个番型至少正例+易误判反例
- 追踪：REQ-RULE-005、REQ-QUAL-004

## T404 实现 Pattern Relation Resolver

- 状态：TODO
- 目标：处理 covers/mutex/non-repeat。
- 依赖：T207、T403
- 验收：被排除番型保留原因。
- 测试：关系牌例
- 追踪：REQ-RESULT-004～007

## T405 实现 Scoring Strategy 基础框架

- 状态：TODO
- 目标：支持规则原生单位和大众麻将首版计分。
- 依赖：T404
- 验收：不强制所有规则统一单位。
- 测试：基本计分
- 追踪：REQ-RESULT-001

## T406 实现封顶与封顶外项目框架

- 状态：TODO
- 目标：支持 cap 前后展示与 extras。
- 依赖：T405
- 测试：达到/未达到封顶
- 追踪：REQ-RESULT-003

## T407 实现 Legality Engine

- 状态：TODO
- 目标：区分 legal/illegal/incomplete-context。
- 依赖：T205、T405
- 验收：分值与合法性完全分离。
- 测试：门槛不足、缺上下文
- 追踪：REQ-ENGINE-008、REQ-CONTEXT-008

## T408 实现 CalculationExplanation

- 状态：TODO
- 目标：生成结构化计算解释。
- 依赖：T403～T407
- 验收：结构/番型/关系/计分/合法性均可追踪。
- 测试：Explanation snapshot
- 追踪：REQ-PROD-001、REQ-RESULT-004～006

## T409 实现 Candidate Comparison

- 状态：TODO
- 目标：选择最高合法结果并保留并列最高。
- 依赖：T408
- 验收：不混合拆分番型。
- 测试：高低结果、并列
- 追踪：REQ-ENGINE-002～004、REQ-RESULT-002

## T410 实现 evaluateHand Domain API

- 状态：TODO
- 目标：形成完整正式计算入口。
- 依赖：T409
- 验收：输出 legal/structural-illegal/not-winning/incomplete-context。
- 测试：端到端 Domain 牌例
- 追踪：Architecture §21～22

## T411 扩充大众麻将 Rule Case Corpus

- 状态：TODO
- 目标：为所有已实现番型和关系建测试。
- 依赖：T403～T410
- 验收：计划番型均有自动测试。
- 测试：CI Rule Cases
- 追踪：REQ-QUAL-004

### M4 Gate

- [ ] 固定牌例无需 UI 即可输出正确结果
- [ ] 结果可解释
- [ ] 多拆分/并列最高通过
- [ ] 正式进入完整 UI 前 Engine 已稳定

---

# 9. M5 — Calculator Input UI

## T501 建立 Calculator 响应式页面骨架

- 状态：TODO
- 目标：实现移动单页与桌面左右布局。
- 依赖：M4
- 验收：
  - 移动顺序符合 Spec。
  - 桌面左右布局共享状态。
- 测试：响应式组件/E2E
- 追踪：REQ-NAV-007～012

## T502 实现顶部规则栏

- 状态：TODO
- 目标：持续显示当前规则与切换入口。
- 依赖：T501
- 验收：测试版/临时调整状态可显示。
- 测试：组件测试
- 追踪：REQ-NAV-008、REQ-RULE-001

## T503 实现动态 TilePalette

- 状态：TODO
- 目标：按 TileSet 展示当前全部牌种。
- 依赖：T203、T501
- 验收：27/34/42 动态正确。
- 测试：不同 Rule fixture
- 追踪：REQ-INPUT-002～003

## T504 实现数量角标与禁用

- 状态：TODO
- 目标：全局计数达到上限后原位禁用。
- 依赖：T503、T107
- 测试：跨 hand/meld/winningTile
- 追踪：REQ-INPUT-015～016

## T505 实现暗手牌录入

- 状态：TODO
- 目标：点击添加、点击撤回、保持录入顺序。
- 依赖：T503
- 测试：重复牌、一张删除
- 追踪：REQ-INPUT-006～007

## T506 实现一键整理

- 状态：TODO
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
- 验收：非法第三张拒绝但前两张保留。
- 测试：合法/非法 chow
- 追踪：REQ-INPUT-012～013

## T510 实现碰牌临时录入

- 状态：TODO
- 目标：选择一种牌自动生成三张。
- 依赖：T104、T503
- 测试：牌数上限
- 追踪：REQ-INPUT-008

## T511 实现明杠/暗杠录入

- 状态：TODO
- 目标：自动四张，支持 direct/added。
- 依赖：T104、T503
- 测试：杠类型和数量
- 追踪：REQ-INPUT-009～011

## T512 实现花牌临时录入

- 状态：TODO
- 目标：仅规则支持时显示，并记录具体花牌。
- 依赖：T203、T503
- 测试：无花规则隐藏
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

### M5 Gate

- [ ] 用户可完整录入合法牌面
- [ ] 临时副露流程符合最新需求
- [ ] UI 不自行计算番型

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
- 目标：不同 Outcome 显示正确 Save/Copy/Share。
- 依赖：T601～T612
- 测试：权限矩阵
- 追踪：REQ-RESULT-016～017

### M6 Gate

- [ ] 三层结果边界清晰
- [ ] Fan Adjustment 永远不改变合法性
- [ ] 完整结果过程可解释

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
- 测试：性能基准
- 追踪：REQ-ENGINE-012

### M7 Gate

- [ ] 13 张听牌可用
- [ ] 14 张弃牌后听牌可用
- [ ] Worker stale/cancel 正确
- [ ] 不显示剩余张数或概率

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
- 目标：名称/别名/类别/数值/启用状态。
- 依赖：T804
- 测试：搜索
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
- 依赖：T807、T106
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
- 目标：大众麻将百科随核心 App 可离线。
- 依赖：T801
- 测试：离线打开
- 追踪：REQ-ENC-007

### M8 Gate

- [ ] 番表与 Engine 同源
- [ ] 来源/争议/限制可查看
- [ ] 示例可带入且不自动保存

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
- 目标：只有正式合法当前 revision 结果可保存。
- 依赖：T902～T903
- 测试：合法/非法/听牌/Quick Calc
- 追踪：REQ-SAVE-001、003

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
- 目标：删除→Trash→恢复/永久删除。
- 依赖：T905
- 测试：modifiedAt 不因 trash 改变
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
- 测试：两 Tab E2E
- 追踪：REQ-STORAGE-004

## T913 实现 Storage Capability 与 Temporary Mode

- 状态：TODO
- 目标：存储不可用仍可计算。
- 依赖：T901
- 测试：模拟 IDB failure/quota
- 追踪：REQ-STORAGE-003

## T914 实现 Rule Snapshot 引用

- 状态：TODO
- 目标：旧牌例依赖规则版本可保留最小快照。
- 依赖：T902
- 测试：删除规则包后牌例仍可打开
- 追踪：REQ-SAVE-011～012、REQ-STORAGE-007

### M9 Gate

- [ ] 保存/恢复/编辑/Trash/Draft 全部通过
- [ ] 多标签保护可用
- [ ] Storage failure 不虚假保存成功

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
- 测试：白名单
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
- 依赖：T1004、T909
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
- 依赖：T901～T914
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
- 测试：备份失败时禁止覆盖
- 追踪：REQ-DATA-004

## T1014 实现覆盖恢复事务

- 状态：TODO
- 目标：全量成功才 commit。
- 依赖：T1013
- 测试：中途异常 rollback
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
- 测试：unknown noncritical/critical
- 追踪：REQ-DATA-008

## T1017 实现外部数据安全限制

- 状态：TODO
- 目标：限制文件大小、深度、字段数、数组数等。
- 依赖：T1003、T1008
- 测试：oversized/malformed payload
- 追踪：REQ-DATA-009；Architecture §47

### M10 Gate

- [ ] Share/Backup/Import roundtrip 通过
- [ ] 导入失败不破坏现有数据
- [ ] 超长分享不生成损坏 URL

---

# 15. M11 — PWA / Offline / Update

## T1101 配置 PWA Manifest 与图标

- 状态：TODO
- 目标：支持安装。
- 依赖：M10
- 测试：manifest 校验
- 追踪：REQ-PROD-003、006

## T1102 配置 Service Worker App Shell

- 状态：TODO
- 目标：核心静态资源离线。
- 依赖：T1101
- 测试：离线重开
- 追踪：REQ-STORAGE-005～006

## T1103 将大众麻将核心规则加入离线缓存

- 状态：TODO
- 目标：首次完成加载后核心计算离线。
- 依赖：T210、T1102
- 测试：断网计算
- 追踪：REQ-STORAGE-006

## T1104 将核心百科加入离线缓存

- 状态：TODO
- 目标：番表和示例离线。
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
- 测试：损坏包/中断
- 追踪：REQ-UPDATE-003

## T1108 实现 version.json 更新检查

- 状态：TODO
- 目标：每天最多一次静态元数据请求。
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

### M11 Gate

- [ ] 核心 Calculator/百科离线可用
- [ ] App/Rule 更新不静默覆盖
- [ ] Rule Package 损坏不会半激活

---

# 16. M12 — Quality Hardening

## T1201 完成主题系统

- 状态：TODO
- 目标：system/light/dark。
- 依赖：M11
- 测试：主题切换
- 追踪：REQ-UI-004

## T1202 完成 Reduced Motion

- 状态：TODO
- 目标：系统偏好 + 手动关闭非必要动画。
- 依赖：T1201
- 测试：prefers-reduced-motion
- 追踪：REQ-UI-005

## T1203 完成麻将牌基础无障碍

- 状态：TODO
- 目标：tile aria-label、focus、键盘。
- 依赖：M5
- 测试：keyboard/a11y
- 追踪：REQ-QUAL-003

## T1204 完成 Dialog/Focus 无障碍

- 状态：TODO
- 目标：Modal 焦点锁定和关闭恢复。
- 依赖：M5～M10
- 测试：keyboard
- 追踪：REQ-QUAL-003

## T1205 完成 Live Region

- 状态：TODO
- 目标：分析中、完成、错误可被读屏识别。
- 依赖：M7
- 测试：a11y
- 追踪：REQ-QUAL-003

## T1206 完成移动端响应式验收

- 状态：TODO
- 目标：窄屏/常见手机可完成全流程。
- 依赖：M11
- 测试：Playwright viewport
- 追踪：REQ-NAV-*、REQ-QUAL-001

## T1207 完成桌面响应式验收

- 状态：TODO
- 目标：左右布局和导航稳定。
- 依赖：M11
- 测试：桌面 E2E
- 追踪：REQ-NAV-004、012

## T1208 完成 Safari/WebKit 核心 E2E

- 状态：TODO
- 目标：验证 Safari 关键流程。
- 依赖：M11
- 测试：Playwright WebKit
- 追踪：REQ-QUAL-001

## T1209 完成 Android/Chromium 核心回归

- 状态：TODO
- 目标：移动 Chromium 核心流程。
- 依赖：M11
- 测试：移动 Chromium
- 追踪：REQ-QUAL-001

## T1210 完成微信内置浏览器人工验收清单

- 状态：TODO
- 目标：验证选牌、计算、听牌、复制、分享。
- 依赖：M11
- 验收：真实设备记录结果。
- 测试：人工
- 追踪：REQ-QUAL-001

## T1211 完成存储故障回归

- 状态：TODO
- 目标：IDB/Quota 失败进入 Temporary Mode。
- 依赖：T913
- 测试：故障注入
- 追踪：REQ-STORAGE-003

## T1212 完成 Migration Test Harness

- 状态：TODO
- 目标：后续 Beta/RC 数据迁移可自动验证。
- 依赖：T901
- 测试：旧 Schema → 当前 Schema
- 追踪：REQ-REL-006、REQ-DATA-008

## T1213 完成 Import/Export 全量回归

- 状态：TODO
- 目标：完整备份、合并、覆盖、单牌例。
- 依赖：M10
- 测试：E2E roundtrip
- 追踪：REQ-DATA-001～009

## T1214 完成 Share 安全回归

- 状态：TODO
- 目标：malformed/oversized/高版本不破坏 Draft。
- 依赖：M10
- 测试：恶意 Payload
- 追踪：REQ-SHARE-*、REQ-DATA-009

## T1215 完成百科内容安全测试

- 状态：TODO
- 目标：防 raw HTML/script/XSS。
- 依赖：M8
- 测试：恶意 Markdown fixture
- 追踪：Architecture §72、§89

## T1216 完成 PWA Offline Smoke

- 状态：TODO
- 目标：断网后核心功能完整。
- 依赖：M11
- 测试：Playwright offline
- 追踪：REQ-STORAGE-006

## T1217 完成性能验收

- 状态：TODO
- 目标：普通和牌目标 1s、听牌/弃牌目标 3s。
- 依赖：T712
- 测试：固定设备/牌例记录
- 追踪：REQ-ENGINE-012

## T1218 完成隐私检查

- 状态：TODO
- 目标：确认无 Analytics、无自动错误上传。
- 依赖：M11
- 测试：Network inspection
- 追踪：REQ-PRIV-001～003

## T1219 完成规则测试覆盖审查

- 状态：TODO
- 目标：每个自动番型正例、反例、关系、门槛、封顶等完整。
- 依赖：T411、T705～T706
- 测试：Coverage Matrix
- 追踪：REQ-QUAL-004

## T1220 完成正式发布阻断项检查器/清单

- 状态：TODO
- 目标：把 RC Gate 固化。
- 依赖：T1201～T1219
- 验收：所有 blocker 可明确记录状态。
- 追踪：REQ-REL-005

### M12 Gate

- [ ] 无障碍核心要求通过
- [ ] 移动/桌面/Safari/微信核心流程通过
- [ ] PWA/Offline/Storage/Migration/Share/Import 回归完成
- [ ] Rule Test Corpus 完整
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
- 追踪：REQ-REL-004

## TA02 执行内部规则牌例核对

- 状态：TODO
- 依赖：TA01
- 目标：程序结果与人工计算交叉验证。
- 测试：规则人工复核表
- 追踪：REQ-RULE-005、REQ-QUAL-004

## TA03 建立 Alpha 缺陷回归机制

- 状态：TODO
- 依赖：TA01
- 目标：每个规则 Bug 进入永久 Rule Case。
- 验收：Bug 无测试不得关闭。
- 追踪：Constitution 原则二；Plan §17

## TA04 Alpha 数据升级验证

- 状态：TODO
- 依赖：TA01
- 目标：alpha.x 之间测试 Draft/Saved Migration。
- 测试：旧 alpha 数据升级
- 追踪：REQ-REL-006

### Alpha Exit Gate

- [ ] 无大范围基础 Engine 缺陷
- [ ] 全部 v0.1 番型有测试
- [ ] 核心流程可由非开发者完成

---

# 18. Beta 任务

## TB01 发布 v0.1.0-beta.1

- 状态：TODO
- 依赖：Alpha Exit Gate
- 目标：进入公开测试。
- 追踪：REQ-REL-004

## TB02 收集并分类 Beta 规则问题

- 状态：TODO
- 依赖：TB01
- 目标：区分规则 Bug、资料争议、UI 误解。
- 验收：每项关联 Rule Version/Source。
- 追踪：REQ-RULE-006～007

## TB03 完成 Beta 跨端实测

- 状态：TODO
- 依赖：TB01
- 目标：真实手机/桌面/微信。
- 追踪：REQ-REL-005

## TB04 Beta 数据迁移回归

- 状态：TODO
- 依赖：TB01
- 目标：beta.x 版本间不静默丢数据。
- 追踪：REQ-REL-006

### Beta Exit Gate

- [ ] 无已知严重错算
- [ ] Rule Cases 全通过
- [ ] 保存/恢复/分享/导入/迁移稳定
- [ ] 手机/桌面/微信核心流程通过

---

# 19. RC 任务

## TR01 发布 v0.1.0-rc.1

- 状态：TODO
- 依赖：Beta Exit Gate
- 目标：冻结新功能，只做发布阻断修复。
- 追踪：REQ-REL-004～005

## TR02 执行完整 RC Rule Test

- 状态：TODO
- 依赖：TR01
- 验收：所有规则自动测试 100% 通过。
- 追踪：REQ-RULE-005、REQ-QUAL-004

## TR03 执行 RC 数据完整性验收

- 状态：TODO
- 依赖：TR01
- 范围：Saved/Draft/Trash/Backup/Import/Share/Migration。
- 追踪：REQ-REL-005

## TR04 执行 RC 浏览器验收

- 状态：TODO
- 依赖：TR01
- 范围：Chrome/Edge/Safari/Android/WeChat。
- 追踪：REQ-QUAL-001

## TR05 执行 RC PWA/Offline 验收

- 状态：TODO
- 依赖：TR01
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
- 追踪：REQ-REL-005

## TF02 建立 v0.1.x Patch 流程

- 状态：TODO
- 依赖：TF01
- 目标：后续 Bug Fix 有明确 Rule/Engine Version 决策。
- 验收：规则 Bug 必须带回归牌例。
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
先修改 requirements-baseline
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
Batch 03: T101-T105
Batch 04: T106-T110
Batch 05: T201-T205
Batch 06: T206-T211
Batch 07: T301-T305
Batch 08: T306-T310
Batch 09: T401-T405
Batch 10: T406-T411
Batch 11: T501-T506
Batch 12: T507-T514
Batch 13: T515-T519
Batch 14: T601-T607
Batch 15: T608-T614
Batch 16: T701-T707
Batch 17: T708-T712
Batch 18: T801-T805
Batch 19: T806-T810
Batch 20: T901-T907
Batch 21: T908-T914
Batch 22: T1001-T1007
Batch 23: T1008-T1017
Batch 24: T1101-T1105
Batch 25: T1106-T1111
Batch 26: T1201-T1205
Batch 27: T1206-T1210
Batch 28: T1211-T1215
Batch 29: T1216-T1220
```

这些批次是默认建议，不是新的需求优先级。

如果实际仓库已有部分能力，应先核对现状，再把已满足任务标记为 `DONE`，禁止重复实现或为了“匹配文档”无意义重写。

---

# 23. 每轮 Codex 开始前检查

每个 Batch 开始前应：

1. 阅读 `AGENTS.md`；
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
- [ ] 相关自动测试存在
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
- 没有已知阻断后续的数据模型问题；
- 没有需求冲突未处理；
- 文档无需因实现偏差被迫“追认代码”。

---

# 27. 需求追踪摘要

| Task 组 | 主要需求 |
|---|---|
| T0xx | `REQ-GOV-*`, `REQ-QUAL-*` |
| T1xx | `REQ-INPUT-*`, `REQ-CONTEXT-*` |
| T2xx | `REQ-RULE-*`, `REQ-ENC-*` |
| T3xx | `REQ-ENGINE-001～005` |
| T4xx | `REQ-RESULT-*`, `REQ-ENGINE-*` |
| T5xx | `REQ-NAV-*`, `REQ-UI-*`, `REQ-INPUT-*`, `REQ-CONTEXT-*` |
| T6xx | `REQ-RESULT-*` |
| T7xx | `REQ-ENGINE-006～013`, `REQ-WAIT-*` |
| T8xx | `REQ-ENC-*`, `REQ-RULE-*` |
| T9xx | `REQ-SAVE-*`, `REQ-DRAFT-*`, `REQ-STORAGE-*` |
| T10xx | `REQ-SHARE-*`, `REQ-DATA-*` |
| T11xx | `REQ-STORAGE-*`, `REQ-UPDATE-*` |
| T12xx | `REQ-UI-*`, `REQ-QUAL-*`, `REQ-PRIV-*`, `REQ-REL-005～006` |

---

# 28. 文档批准

当前状态：

```text
已制定，待项目方审阅确认
```

项目方确认后更新为：

```text
已批准 / Active
```

批准后：

- `tasks.md` 成为 v0.1.0 的执行清单；
- Codex 应以当前未完成 Task 为主要工作入口；
- 不允许跳过上游文档直接凭提示词自由发挥；
- Task 状态应随实际仓库进展维护；
- 需求变化时先修改 Baseline，而不是直接追加违反范围的新 Task。

---

# 29. 当前下一步

本文件确认后，正式文档链中还剩：

```text
项目根目录 AGENTS.md
```

`AGENTS.md` 应将：

- Constitution 的最高约束；
- Architecture 的代码边界；
- Tasks 的执行方式；
- 测试和文档同步要求；

转换为 Codex 在仓库中必须遵守的操作规则。

---

# 30. 一句话执行准则

> **每一个 Task 都必须能明确回答“改什么、为什么改、怎样算完成、怎样证明没有破坏麻将规则”；如果这四个问题回答不清楚，就不应开始编码。**
