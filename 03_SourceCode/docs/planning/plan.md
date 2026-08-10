# 麻将番数计算器实施计划

> **Implementation Plan — Mahjong Fan Calculator**

## 文档元数据

- 文档名称：Implementation Plan
- 文档版本：`Plan 1.0.0`
- 文档状态：已批准 / Active
- 制定日期：2026-08-07
- 项目方确认日期：2026-08-10
- 主要适用版本：`v0.1.0`
- 上游需求基线：[`requirements-baseline-v1.2.md`](../product/requirements-baseline-v1.2.md) — `Baseline 1.2`
- 上游一致性审查：[`requirements-audit.md`](../product/requirements-audit.md) — `PASS`
- 上游项目宪章：[`constitution.md`](../governance/constitution.md) — `Constitution 1.0.0`
- 上游产品规格：[`spec.md`](../product/spec.md) — `Spec 1.0.0`
- 上游技术架构：[`architecture.md`](../architecture/architecture.md) — `Architecture 1.0.0`
- v0.1.0 规则事实规范：[`rule-spec-v1.0.md`](../rules/common-simple/rule-spec-v1.0.md) — `common-simple@1.0.0`
- 下游文档：
  - `docs/planning/tasks.md`
  - `docs/AGENTS.md`

---

# 1. 计划目的

本文件定义 `v0.1.0` 的实施顺序、阶段边界、阶段产物、进入条件、退出条件以及预发布路线。

本文件不负责把每一个开发动作拆成具体任务；具体可执行任务将在 `tasks.md` 中继续细化。

本计划必须满足以下原则：

1. 先完成可验证的核心 Domain，再扩展 UI。
2. 规则正确性优先于页面数量。
3. 每个阶段都必须有可运行、可测试的阶段产物。
4. 不在前期同时铺开大量非核心页面。
5. 不把未来规则、自定义规则、癞子、多玩家结算带入 v0.1.0。
6. 每个阶段完成后再进入下一阶段，避免 UI、规则和存储同时失控。
7. 任何需求冲突先回到 Baseline，不允许通过 Plan 静默缩减需求。

---

# 2. v0.1.0 总体实施策略

`v0.1.0` 是整个项目最重要的基础版本。

它不只是“大众麻将规则版本”，还需要完成后续 v0.2～v1.0 共用的计算器骨架。

因此采用：

```text
Foundation
→ Domain Model
→ Rule System
→ Core Engine
→ Calculator Input
→ Result / Adjustment
→ Ready Analysis
→ Encyclopedia
→ Persistence
→ Share / Import
→ PWA / Update
→ Quality Hardening
→ Alpha
→ Beta
→ RC
→ v0.1.0
```

计划目标是：

> 在 v0.1.0 中把“多规则计算器平台”建好，而不是先写一个一次性的大众麻将页面，后续再推翻重构。

---

# 3. 版本阶段总览

| 阶段 | 目标 | 核心产物 |
|---|---|---|
| M0 | 工程与质量基线 | 可构建、可测试、可静态部署的项目骨架 |
| M1 | 麻将领域模型 | Tile、Hand、Meld、Context、CalculatorDocument |
| M2 | 规则系统 | RulePackage、Schema、Capability、内置大众规则骨架 |
| M3 | 和牌结构引擎 | 普通结构、七对、十三幺、拆分、胡牌张落点 |
| M4 | 番型与计分引擎 | Recognizer、关系、计分、合法性、Explanation |
| M5 | Calculator 录牌 | 动态选牌、手牌、胡牌张、临时副露、条件 |
| M6 | 结果、调整与快速算番 | 结果页、封顶、三层结果、临时规则、人工番型调整、Quick Calc |
| M7 | 听牌与弃牌分析 | Wait、Discard-to-ready、Worker、排序 |
| M8 | 规则百科 | 番表、番型详情、来源、示例、深链接 |
| M9 | 本地数据 | Saved Examples、Draft、Trash、Undo、多标签保护、Preferences、Migration |
| M10 | 分享与导入导出 | Copy、Share、Full/Selected/Single Export、Import、Rule Snapshot |
| M11 | PWA、更新与设置 | Offline、规则缓存、App/Rule Update、Settings、Help/Privacy/Feedback、产品身份 |
| M12 | 质量收口 | A11y、跨端、Browser Capability、性能、安全、迁移、规则测试 |
| Alpha | 内部完整验证 | v0.1.0-alpha.x |
| Beta | 公开测试 | v0.1.0-beta.x |
| RC | 正式候选 | v0.1.0-rc.x |
| Release | 正式版 | v0.1.0 |

---

# 4. M0 — 工程与质量基线

## 4.1 目标

建立后续开发的稳定工程环境，避免在功能开发中反复调整项目基础设施。

## 4.2 主要工作

完成：

- React + TypeScript + Vite 基础工程；
- 严格 TypeScript；
- 路由；
- Zustand 基础状态容器；
- Vitest；
- React Testing Library；
- Playwright 基础；
- ESLint / 格式化；
- PWA 最小工程脚手架，仅建立配置、注册和构建扩展点；
- 基础目录结构；
- 独立版本常量：`APP_VERSION`、`ENGINE_VERSION`、`DATABASE_SCHEMA_VERSION`、`BACKUP_FORMAT_VERSION`、`SHARE_FORMAT_VERSION`、`SINGLE_EXAMPLE_FORMAT_VERSION`，以及每个 RulePackage 自身的 `RULE_VERSION`；
- CI 基础流水线；
- Domain import boundary；
- 基础错误边界；
- 静态构建验证。

## 4.3 阶段产物

至少能：

```text
npm install
npm test
npm run build
```

并成功生成静态站点。

首页可以只有空 Calculator Shell，但：

- 路由可用；
- 测试可运行；
- CI 可阻断错误；
- Domain 不依赖 React。

M0 的 PWA 产物不代表正式可安装或完整离线能力。正式 Manifest、图标、生产 Service Worker、缓存、Offline 和 Update 统一在 M11 完成。

## 4.4 退出条件

- TypeScript strict 生效；
- lint/typecheck/test/build 全部可运行；
- 基础目录与架构一致；
- 静态部署 Smoke Test 通过；
- 不存在业务规则实现。

---

# 5. M1 — 麻将领域模型

## 5.1 目标

先建立整个项目最稳定的数据边界。

## 5.2 范围

实现：

- `TileCode`
- Tile metadata
- `Meld`
- `HandSnapshot`
- `TransientInputSession`
- `WinContext`
- `CalculatorDocument`
- RuleRef
- revision
- 基础硬校验
- 全局牌数统计
- 结构张数计算接口

## 5.3 重点要求

必须证明：

- 手牌、副露、花牌、胡牌张在数据层严格分离；
- 副露临时录入不会污染正式 Hand；
- 同一普通牌全局最多四张；
- 规则不使用的 Tile 能被阻止；
- 原始手牌录入顺序可以保留；
- 未来规则不被固定 34/42 张写死。

## 5.4 测试重点

包括：

- 42 个 TileCode 唯一；
- Tile 排序稳定；
- 全局计数正确；
- 杠的结构张数正确；
- 花牌不计结构张数；
- 第五张普通牌被拒绝；
- transient chow 不进入正式 Hand。

## 5.5 退出条件

Domain Model 已可独立使用，不依赖 UI。

---

# 6. M2 — 规则系统与大众麻将规则骨架

## 6.1 目标

建立所有后续地区规则共用的 RulePackage 框架。

## 6.2 范围

实现：

- RulePackage 顶层组合 Schema；
- RuleManifest；
- TileSetDefinition；
- HandModelDefinition；
- StructureDefinition；
- ContextDefinition；
- PatternDefinition；
- PatternRelation；
- ScoringDefinition；
- LegalityDefinition；
- TemporaryAdjustmentDefinition；
- RuleSource；
- Capability Registry；
- content hash / integrity 基础；
- Rule Repository 最小实现；
- 内置 `common-simple@1.0.0` RulePackage。

`common-simple@1.0.0` 必须逐项转录 `docs/rules/common-simple/rule-spec-v1.0.md`：144 张牌、普通结构/七对/十三幺、3 个禁用特殊结构、81 个参考番型中的 78 个启用番型、minimumFan 0、自摸 +1、花牌每张 +1、默认不封顶以及平台奖励排除项。

## 6.3 重要原则

此阶段的大众麻将规则必须走真实 RulePackage。

禁止：

```text
先硬编码大众麻将
后续再重构成 RulePackage
```

## 6.4 RulePackage CI 校验

完成：

- Schema；
- ID 唯一；
- relation 引用；
- source 引用；
- capability；
- manifest；
- content hash 生成基础能力。

此外校验 Rule Spec、RulePackage、百科 Pattern Catalog 和 Rule Test Corpus 的 Rule ID / Rule Version 可追踪性。

## 6.5 退出条件

应用可以：

```text
加载内置大众麻将规则
→ 得到当前 Tile Set
→ 得到 Hand Model
→ 得到 Structure/Pattern/Scoring 配置
```

此时还不要求完成实际番型计算。

但必须能证明所有 81 个参考 Pattern ID 均已进入可验证目录，78 个启用、3 个因当前结构能力禁用。

---

# 7. M3 — 和牌结构与拆分引擎

## 7.1 目标

首先把“牌是否结构成和”做正确。

## 7.2 实现顺序

### M3.1 普通结构

实现：

```text
N 个面子 + 1 对将
```

包括：

- 副露固定组；
- 暗手牌拆分；
- 顺子；
- 刻子；
- 将；
- DFS；
- Memoization；
- 去重。

### M3.2 七对

独立结构实现。

### M3.3 十三幺

独立结构实现。

### M3.4 多结构并行

同一牌面允许多个结构同时成立。

### M3.5 Winning Tile Placement

为每种拆分枚举胡牌张实际落点。

## 7.3 阶段重点

此阶段不急于做完整结果页面。

优先建立大量固定牌例，验证：

- 能和；
- 不能和；
- 多拆分；
- 七对；
- 十三幺；
- 副露；
- 杠；
- 胡牌张位置。

## 7.4 退出条件

给定：

```text
HandSnapshot + Rule
```

Domain 能输出：

```text
0..N 个合法 WinningDecomposition
```

且不会找到第一解就停止。

---

# 8. M4 — 番型识别、关系、计分与合法性

## 8.1 目标

建立从结构到正式规则结果的完整计算链。

## 8.2 子阶段

### M4.1 Derived Facts

统一计算：

- 花色使用；
- 字牌；
- 是否门清；
- 面子类型；
- 将牌；
- 顺子；
- 刻子；
- 花牌数量；
- 其他基础事实。

### M4.2 Pattern Recognizer

以 `common-simple@1.0.0` Rule Spec 为唯一规则事实依据，为 78 个启用番型逐个实现 Recognizer；七星不靠、全不靠、组合龙保持禁用并返回当前结构能力未支持。

每个 Recognizer：

- 只判断成立；
- 输出 Evidence；
- 不负责关系和最终加总。

每个启用番型同步建立至少一个明确正例和一个关键反例；关系表必须从 Rule Spec 的规范性来源转录并进入回归测试。

### M4.3 Pattern Relations

实现：

- covers；
- mutually-exclusive；
- non-repeat-group。

### M4.4 Scoring

实现大众麻将所需的首个 Scoring Strategy。

### M4.5 Legality

实现：

- 起胡门槛；
- 规则限制；
- incomplete context。

### M4.6 Cap / Extra

实现封顶与封顶外项目框架。

### M4.7 Explanation

输出结构化 CalculationExplanation。

### M4.8 Candidate Compare

完整比较所有候选，只保留最高与并列最高。

## 8.3 退出条件

Domain 已可完成：

```text
CalculatorDocument
→ SystemEvaluation
```

并能区分：

- legal win；
- structural win but illegal；
- not winning；
- incomplete context。

---

# 9. M5 — Calculator 图形化录牌

## 9.1 目标

把已验证 Domain 能力接入真实用户交互。

## 9.2 子阶段

### M5.1 页面框架

完成移动端：

```text
顶部规则
→ 选牌器
→ 已录入牌面
→ 和牌条件
→ 分析结果
```

桌面端：

```text
左录牌 / 右条件结果
```

### M5.2 动态选牌器

读取 Rule TileSet：

- 27/34/42/其他；
- 数量角标；
- 达上限禁用；
- 不适用牌隐藏。

### M5.3 手牌

- 点击录入；
- 点击撤回；
- 原顺序；
- 一键整理。

### M5.4 胡牌张

独立区域：

- 替换；
- 撤销；
- 14 张已和时要求确认。

### M5.5 临时副露

实现：

- 吃；
- 碰；
- 明杠；
- 暗杠；
- 花牌。

其中吃牌必须具备三牌位临时 UI。

### M5.6 已录入牌面

统一展示，但数据层仍分：

```text
concealed
melds
flowers
winningTile
```

### M5.7 和牌条件

- 默认点炮；
- 自摸；
- 动态 Context；
- 不兼容条件处理；
- 门风/圈风缺失。

### M5.8 悬浮操作条

- 结构进度；
- 开始分析；
- 分析状态；
- 查看结果。

### M5.9 Rule Picker 与首次引导

- 默认 `common-simple@1.0.0`；
- 首次规则轻提示与操作引导；
- 规则分组、搜索、最近使用；
- development/test/full 状态控制；
- TESTING 规则首次确认；
- 结果影响版本更新后重新确认。

### M5.10 Navigation State 与 Replace Guard

建立统一 Application 能力，覆盖：

- New Hand；
- Rule Switch；
- Share；
- Import；
- Encyclopedia Example；
- Saved Example；
- 浏览器返回与 Modal Stack；
- Calculator 状态和合理滚动位置保持。

任何替换动作都必须先经过确认；Draft Port 在 M5 建立，M9 接入持久 Draft，未确认前不得替换当前 CalculatorDocument。

### M5.11 产品牌面资产

- 建立 Tile Asset Manifest；
- 记录作者、来源、License 和修改情况；
- 验证麻将牌与图标的小尺寸可读性；
- 资产不得成为业务 Tile ID。

## 9.3 退出条件

用户已经可以完整录入一副牌，并让 M4 Engine 得到正确输入；规则选择、替换保护、导航状态和牌面资产均有可测试承载。

---

# 10. M6 — 结果页与两类调整

## 10.1 目标

完整实现用户能理解、核对和调整的正式结果。

## 10.2 正式结果

实现：

- 原生单位；
- 最高合法结果；
- 计入番型；
- 未计入番型；
- 原因；
- 封顶前；
- 封顶后；
- 完整计算过程；
- 规则版本；
- 来源；
- 当前最高拆分牌面；
- 查看原始牌面；
- 并列最高切换。

## 10.3 临时规则调整

实现：

```text
System Rule
→ Temporary Adjustment
→ Effective Rule
→ Full Re-evaluation
```

必须：

- 只开放 Rule 声明参数；
- 点击应用才生效；
- 可以改变合法性；
- 不修改原系统预设；
- 新建/切换规则后清除。

## 10.4 番型人工调整

实现：

- exclude；
- force-include recognized pattern；
- 失效调整；
- 冲突重新确认。

必须证明：

```text
Fan Adjustment 不改变 Base Legality
```

## 10.5 三层结果

完成：

```text
系统预设结果
本次规则结果
用户调整结果
```

无调整时不显示多余层。

## 10.6 Quick Calc

实现 Calculator 内的弱化入口“我已知道番型，只想快速合计”：

- 继承当前 RulePackage；
- 复用 Pattern Relation Resolver、Scoring、Legality、门槛和封顶；
- 不调用牌面结构、自动 Recognizer、听牌和多拆分；
- 所有结果持续标记“用户选择，未经牌面验证”；
- 不允许保存牌例或生成牌例分享链接；
- 以 `common-simple@1.0.0` 的 minimumFan、自摸、花牌和封顶事实为基线。

## 10.7 退出条件

完整胡牌用户流程：

```text
录牌
→ 分析
→ 查看正式结果
→ 查看计算过程
→ 临时规则调整
→ Fan Adjustment
```

全部可用；Quick Calc 的入口、关系处理和输出限制也通过验收。

---

# 11. M7 — 听牌与弃牌分析

## 11.1 目标

完成计算器第二大核心能力。

## 11.2 Web Worker

先完成：

- Worker Protocol；
- requestId；
- documentRevision；
- stale result 丢弃；
- cancel；
- Worker 重建。

## 11.3 Wait Analysis

对当前规则所有 enabled Tile：

- 检查 maxCopies；
- 作为 winning tile；
- 复用正式 Engine；
- 分类 legal / pending / structural-only。

## 11.4 Discard-to-ready

对暗手牌 distinct tile：

- 去掉；
- 执行 Wait Analysis；
- 产生候选弃牌。

## 11.5 UI

实现：

- 小三角标记；
- 点击候选弃牌；
- 待胡麻将牌图；
- 每张待胡牌最高合法结果；
- 点炮/自摸差异；
- 确定合法/待确认分类。

## 11.6 排序

- 默认高番优先；
- 设置切换听口优先；
- stable tie-break。

## 11.7 性能

开始建立固定性能牌例。

## 11.8 Analysis Lifecycle

- 首次正式结果后的相关修改使用防抖自动重算；
- 所有请求携带 requestId 与 documentRevision；
- stale Worker 结果不得进入当前 UI；
- Engine Error 保留输入和 Draft；
- 提供 Retry、Undo 和 Copy Issue Info；
- 合法和牌提供弱化入口“忽略当前和牌，继续分析出牌”。

## 11.9 退出条件

13 张听牌和 14 张弃牌后听牌两条主流程全部通过，Analysis Lifecycle 的自动重算、错误恢复、stale 防护和合法和牌继续分析也通过。

---

# 12. M8 — 规则百科

## 12.1 目标

将规则透明度、来源和规则学习能力补齐。

## 12.2 内容

完成：

- 规则列表；
- 状态；
- 规则详情；
- 完整番表；
- 番型详情；
- 来源；
- 争议；
- 支持范围；
- 已知限制；
- 示例。

## 12.3 搜索与筛选

- 名称；
- 别名；
- 类别；
- 番值；
- 启用状态。

## 12.4 示例

测试版/full：

- 带入 Calculator；
- 不自动保存；
- 可恢复示例。

Development：

- 只读。

## 12.5 Deep Link

实现：

```text
rule detail
pattern detail
browser refresh/back
```

## 12.6 退出条件

大众麻将规则在 Calculator 中使用的数据与百科展示来自同一 RulePackage，不存在两份番表事实。

---

# 13. M9 — Saved Example、Draft 与编辑恢复

## 13.1 目标

建立可靠本地数据能力。

## 13.2 IndexedDB

实现：

- savedExamples；
- trashExamples；
- draft；
- ruleSnapshots；
- metadata。

## 13.3 保存牌例

实现：

- 仅用户主动保存；
- 默认名称；
- 可重名；
- 内部唯一 ID；
- Result Snapshot；
- Rule/Engine Version；
- 并列最高；
- 临时规则；
- Fan Adjustment。

## 13.4 Saved 页面

- 默认 modifiedAt 倒序；
- 搜索；
- 规则筛选；
- 排序；
- 默认只读；
- 编辑副本；
- 更新/另存/放弃。

## 13.5 回收站

- 移入；
- 恢复；
- 永久删除；
- 不自动过期。

## 13.6 Draft

- 唯一草稿；
- debounce；
- 页面隐藏尽力保存；
- 启动恢复；
- 保存待修正状态；
- 保存临时规则调整。

## 13.7 Undo / Redo

当前会话生效，不持久化历史。

## 13.8 多标签页

- 主编辑锁；
- read-only；
- takeover。

## 13.9 Settings 本地偏好

使用 localStorage 保存：

- theme / reduced motion；
- lastRuleRef / 最近使用规则；
- readySortMode；
- defaultCopyFormat；
- autoUpdateCheckEnabled / lastUpdateCheckAt；
- testRuleConfirmations；
- PWA prompt state；
- 首次提示与引导状态。

## 13.10 Saved 生命周期与容量

- 保存表单只有名称；
- SAVED / MODIFIED_AFTER_SAVE 状态；
- modifiedAt 严格按 Spec 规定更新；
- 回收站永久删除确认且不自动过期；
- 不设置人为数量上限；
- 显示大致存储占用；
- Share / Import 临时内容只有用户主动操作后才另存。

## 13.11 Replace Guard 持久化集成

将 M5 建立的 Replace Guard 接入唯一 Draft，确保 New Hand、Rule Switch、Share、Import、百科示例和 Saved Example 在未确认替换前不会丢失 Draft。

## 13.12 Migration Service

- 独立 DATABASE_SCHEMA_VERSION；
- 迁移路径解析；
- 迁移前安全备份；
- staging / transaction；
- rollback；
- 无法可靠迁移时只读保留。

## 13.13 清除全部本地数据

- 明确列出删除范围；
- 二次确认；
- 提供先导出完整备份；
- 不删除应用本身和内置核心规则。

## 13.14 退出条件

刷新、重新打开浏览器、替换 Calculator、打开已保存牌例、迁移和清除数据等关键场景不会静默覆盖或丢失用户数据；Settings 偏好具有稳定本地事实来源。

---

# 14. M10 — 复制、分享、备份与导入

## 14.1 复制

完成：

- 简洁版；
- 详细版；
- Unicode + 中文名；
- 分组结构；
- Clipboard fallback。

## 14.2 分享

完成：

```text
SharePayload
→ validate
→ canonical JSON
→ compress
→ Base64URL
→ Fragment
```

以及：

- 分享前摘要；
- 当前结果层；
- 分享打开；
- Replace Guard；
- 恢复原始分享内容；
- 超长链接 JSON fallback；
- `INCOMPLETE_CONTEXT`、Quick Calc、Needs Correction 与 Engine Error 不生成正式 SharePayload。

## 14.3 完整备份

实现：

- export；
- format version；
- integrity；
- saved/trash/draft/settings/snapshot。

## 14.3A 选择性批量与单牌例导出

- 用户可选择一组 Saved Example 批量导出；
- 单牌例继续使用可独立复现格式；
- 批量导出不得夹带未选择记录、Draft 或无关偏好。

所有普通 JSON 导出前必须提示文件内容范围、未加密事实和用户保管责任。

## 14.4 合并导入

- 预览；
- 外部 ID 重分配；
- mapping；
- 不覆盖；
- 重复警告。

## 14.5 覆盖恢复

- 自动安全备份；
- staging；
- transaction；
- rollback。

## 14.6 单牌例文件

- export；
- import preview；
- 临时打开；
- 不自动保存。

## 14.7 高版本兼容

- harmless fields ignore；
- critical incompatibility read-only。

## 14.8 退出条件

完整备份、选择性批量、单牌例及所有导入/导出 roundtrip 测试通过，安全提示存在，失败不会破坏现有数据。

---

# 15. M11 — PWA、离线、规则包与更新

## 15.1 PWA

在 M0 脚手架之上实现正式产品能力：

- 正式 manifest；
- 原创或合法授权的像素风幺鸡 icons / favicon / 默认分享标识；
- 生产 Service Worker；
- App Shell；
- 核心规则；
- 核心百科。

## 15.2 安装

- 首次不打扰；
- 使用一段时间后轻提示；
- 设置保留安装入口。

## 15.3 可选规则包框架

即使 v0.1.0 只有核心大众规则，也要完成后续地区规则需要的：

- Rule Repository；
- versioned URL；
- explicit download；
- Cache；
- integrity；
- install metadata。

## 15.4 更新检查

- App `version.json` 与 Rule 静态索引分开；
- App / Rule 每天最多自动检查一次；
- 用户可关闭；
- 用户可分别手动检查；
- 请求不携带牌面、牌例、设置或设备标识。

## 15.5 App Update

- 更新提示；
- 查看更新内容；
- 保存 Draft；
- 用户主动更新。

## 15.6 Rule Update

- 新规则包完整验证；
- staging；
- rollback；
- 不静默升级旧牌例。

## 15.7 Settings 功能集成

完成正式 Settings 页面：

- 外观与 Reduced Motion；
- 听牌排序；
- 默认复制格式；
- PWA 安装入口；
- 自动更新开关；
- App / Rule 手动检查更新；
- 数据管理、存储占用和清除全部数据；
- 帮助、引导重播、用途说明和隐私说明；
- GitHub Issue、反馈邮件、复制问题信息；
- Feedback 附加牌面/结果必须由用户主动勾选并预览。

## 15.8 产品身份

确保“麻将番数计算器”“多地区规则 · 附带番表”及同一合法授权幺鸡图标用于网页、PWA、分享和关于页面，并通过 Asset Manifest 与小尺寸可读性验收。

## 15.9 退出条件

关闭网络后，已加载核心应用可以完成：

```text
录牌
计算
听牌
百科
已保存牌例
```

Settings、Help、Privacy、Feedback、App/Rule Update Discovery 和产品身份同时通过验收。

---

# 16. M12 — 质量收口

## 16.1 目标

在进入 Alpha 之前，把“功能完成”提升为“可发布测试”。

## 16.2 无障碍

检查：

- 键盘；
- 焦点；
- Dialog；
- Tile aria-label；
- live region；
- 非颜色唯一表达；
- 点击区域；
- reduced motion。

## 16.3 浏览器

至少验证：

- Chrome；
- Edge；
- Safari；
- Android 主流浏览器；
- 微信内置浏览器核心流程。

建立统一 Browser Capability Detection，至少覆盖：

- Web Worker；
- IndexedDB；
- Cache Storage；
- Service Worker / PWA；
- Clipboard；
- Web Share；
- File APIs。

非核心能力缺失不得阻断录牌和计算；对应入口必须说明降级原因并提供可行 fallback。

## 16.4 响应式

验证：

- 窄手机；
- 常见手机；
- 中等尺寸；
- 桌面。

## 16.5 性能

固定复杂牌例：

- 普通和牌目标 ≤1s；
- 听牌/弃牌目标 ≤3s；
- 超时状态；
- Cancel。

## 16.6 数据

验证：

- Draft；
- Saved；
- Trash；
- Backup；
- Merge；
- Restore；
- Migration；
- Storage failure；
- Multi-tab。

## 16.7 安全

验证：

- malformed share；
- oversized share；
- malformed JSON；
- high-version JSON；
- bad Rule Package；
- Markdown XSS；
- no dynamic code。

## 16.8 隐私

确认：

- 无 Analytics；
- 无错误自动上传；
- 更新检查无用户数据；
- Feedback 默认不附牌面。

## 16.9 退出条件

所有 Alpha 阻塞项已经具备测试保障。

---

# 17. Rule Test Corpus 建设计划

规则测试不是最后阶段一次补齐，而是贯穿 M3～M12。

## 第一批：结构

在 M3 建立：

- 标准结构；
- 七对；
- 十三幺；
- 不能和；
- 副露；
- 杠；
- 多拆分。

## 第二批：番型

M4 按 `common-simple@1.0.0` 的 78 个启用番型逐项实现并添加：

- 至少一个正例；
- 容易误判的反例。

七星不靠、全不靠、组合龙另有明确的 unsupported structure 回归。Rule Corpus 必须记录 Rule ID、Rule Version 和 Rule Spec 来源。

## 第三批：关系

加入：

- covers；
- mutex；
- non-repeat。

## 第四批：总规则

加入：

- 门槛；
- 封顶；
- 点炮；
- 自摸；
- 特殊上下文。

## 第五批：分析

M7 加入：

- 当前听牌；
- 多结构听牌；
- 弃牌后听牌；
- 合法/结构可和；
- 上下文不足。

## 第六批：历史回归

从 Alpha 开始：

> 每一个规则 Bug 都必须新增永久回归测试。

---

# 18. 文档同步计划

开发期间文档职责：

### docs/product/requirements-baseline-v1.2.md

只在需求发生正式变化时更新。

### requirements-audit.md

需求基线发生重要变化、可能产生冲突时重新审查。

### docs/rules/common-simple/rule-spec-v1.0.md

`common-simple` 的牌组、结构、番型、关系、番值、门槛、自摸、花牌、封顶或来源事实变化时更新，并重新执行规则事实审查。

### constitution.md

只有最高原则变化时更新。

### spec.md

产品行为变化时更新。

### architecture.md

技术边界、数据模型、核心技术方案变化时更新。

### plan.md

阶段策略或版本路线变化时更新。

### tasks.md

随着开发执行持续维护状态。

### docs/AGENTS.md

约束 Codex/AI 的仓库操作方式。

不能使用 `tasks.md` 的变化反向覆盖 Spec。

---

# 19. Alpha 阶段

版本：

```text
v0.1.0-alpha.x
```

## 19.1 目标

完整流程已经存在，重点验证：

- 规则引擎；
- 数据完整性；
- 大范围逻辑错误；
- 关键 UX；
- PWA 基础。

## 19.2 Alpha 进入条件

必须完成 M0～M12 的首轮实现。

允许：

- 局部 UI 未精修；
- 非阻塞文案问题；
- 性能尚需优化。

不允许：

- 核心计算流程缺失；
- 听牌完全未实现；
- 保存/恢复完全未实现；
- 规则百科只是空壳。

## 19.3 Alpha 测试重点

- 开发者人工牌例；
- 自动 Rule Cases；
- 极端拆分；
- 保存/重载；
- Import/Export；
- Worker stale/cancel；
- Storage failure；
- Offline。

## 19.4 Alpha 退出条件

进入 Beta 前：

- 无已知会导致大范围错误结果的基础 Engine 缺陷；
- `common-simple@1.0.0` 的 78 个启用番型都有正例和关键反例；
- 3 个当前不支持特殊结构都有 unsupported structure 回归；
- 核心流程可由非开发者完成。

---

# 20. Beta 阶段

版本：

```text
v0.1.0-beta.x
```

## 20.1 目标

面向更真实用户进行公开测试。

重点：

- 规则遗漏；
- 地方/通用规则争议；
- 手机交互；
- 牌面输入易用性；
- 听牌正确性；
- 浏览器兼容；
- 数据兼容。

## 20.2 Beta 规则

所有 Beta 牌例必须记录：

- App Version；
- Rule Version；
- Engine Version。

发现规则错误：

```text
Bug
→ 固定复现牌例
→ Regression Test
→ 修复
→ Rule Version / Engine Version 判断
```

## 20.3 Beta 数据

升级 Beta 版本：

- 尽量兼容；
- 迁移前保护本地数据；
- 不兼容则保留只读。

## 20.4 Beta 退出条件

进入 RC 前：

- 核心产品流程稳定；
- 规则标准测试集全部通过；
- 无已知严重错算；
- 保存/恢复/分享/导入/迁移稳定；
- 手机、桌面、微信核心流程都已验证。

---

# 21. RC 阶段

版本：

```text
v0.1.0-rc.x
```

## 21.1 目标

验证“当前构建是否可以直接作为正式版”。

## 21.2 RC 规则

原则：

- 不再加入新功能；
- 不再进行大范围 UI 重构；
- 只修复阻塞发布的问题和高价值低风险缺陷。

## 21.3 RC 完整验收

### 规则

- 无已知严重错算；
- 无已知严重漏算；
- 无合法性严重误判；
- 全部 Rule Cases 通过。
- RulePackage、百科和 Rule Corpus 与 `common-simple@1.0.0` Rule Spec 一致。
- 78 个启用番型及 3 个禁用特殊结构的覆盖矩阵通过。

### 数据

- 保存；
- Draft；
- Trash；
- Backup；
- Import；
- Restore；
- Merge；
- Single Example；
- Share；
- Migration。

Save、Restore、Import、Share、Migration 必须分别形成正向通过记录；任一项未执行、失败或结果不明都阻断正式发布。

### 浏览器

- Mobile；
- Desktop；
- WeChat；
- Safari。

### PWA

- Install；
- Offline；
- Update；
- Cache；
- Rule Package integrity。

### 性能

- 固定性能牌例达到目标或有明确非阻塞说明。

### 可访问性

- 无明显阻断。

## 21.4 RC 退出条件

满足 Baseline `REQ-REL-005`：

```text
阻塞错误 = 0
Save / Restore / Import / Share / Migration = 全部通过
```

---

# 22. 正式 v0.1.0

正式发布条件：

```text
v0.1.0-rc.x
→ 完整验收通过
→ v0.1.0
```

正式发布必须：

- 固定 App Version；
- 固定 Engine Version；
- 固定大众麻将 Rule Version；
- 发布 Release Notes；
- 发布当前规则支持范围；
- 发布已知限制；
- 保留测试数据迁移策略；
- 发布可用的静态站点/PWA。

---

# 23. v0.1.0 后续 Patch

例如：

```text
v0.1.1
v0.1.2
```

适用于：

- UI Bug；
- 兼容性；
- 数据修复；
- 非需求扩张型性能优化；
- 规则 Bug。

若规则 Bug 会改变结果：

- 必须判断是否 Rule Version bump；
- Engine Version 按实际变化更新；
- 新增永久回归牌例；
- 旧牌例仍保留旧结果。

---

# 24. v0.2.0～v0.7.0 的实施模式

v0.1.0 之后新增地区规则原则上不再重复建设计算器基础设施。

每个地区版本主要循环：

```text
规则资料收集
→ RulePackage
→ 缺失 Capability 分析
→ 如有必要扩展 Engine
→ Pattern Recognizer
→ Rule Cases
→ Encyclopedia
→ UI 动态配置验证
→ Beta/RC
→ Release
```

若新增地区规则要求扩展 Engine：

- 扩展必须保持已有规则测试全部通过；
- 不得写地区特定页面分叉。

---

# 25. v0.2 河北推倒胡计划概要

正式进入 v0.2 时另建详细计划，但当前预留：

- 河北通用预设；
- 石家庄常见版；
- 规则来源和地方争议；
- Rule Package；
- 大众规则已有 Engine 复用；
- 必要新增番型和计分策略；
- 完整 Rule Cases；
- Encyclopedia；
- 版本测试。

---

# 26. v0.3 无锡麻将计划概要

包含：

- 无锡本地常见版；
- 无锡通用简化版；
- 地方资料确认；
- 差异通过 RulePackage 表达；
- 不复制 Calculator。

---

# 27. v0.4 四川麻将计划概要

包含：

- 成都血战到底；
- 四川血战通用版。

当前仍只做：

```text
单副手牌计算
```

不做：

- 整局血战结算；
- 一炮多响多人状态；
- 玩家分数关系。

四川牌种通过 TileSet 动态切换，例如无字牌、无花牌时仅展示对应序数牌。

---

# 28. v0.5 国标麻将计划概要

预计是 v0.x 中规则引擎扩展最大的版本。

需要增加：

- 国标完整番表；
- 8 番起胡；
- 更复杂番型关系；
- 全不靠；
- 七星不靠；
- 组合龙等特殊结构；
- 更多复杂拆分；
- 大型 Rule Case Corpus。

国标必须是独立 Rule ID，不允许把大众麻将升级“变成国标”。

---

# 29. v0.6～v0.7 广东规则概要

分别加入：

- 广东鸡平胡；
- 广东推倒胡。

仍遵循：

```text
RulePackage + Capability
```

而不是新建广东专用计算器。

---

# 30. v1.0.0 统一验收

v1.0.0 的含义：

> 第一代“多地区麻将番数计算器”完成，而不是增加一个新的大功能。

统一验证：

- 所有已发布规则；
- 规则切换；
- 规则版本；
- Saved Example；
- 历史 Rule Snapshot；
- Import/Export；
- PWA；
- Offline；
- Mobile/Desktop/WeChat；
- Data Migration。

v1.0.0 仍不要求：

- 自定义规则；
- 癞子；
- 拍照识牌；
- 多玩家结算。

---

# 31. 风险与应对

## RISK-01 规则资料不统一

风险：地方麻将存在多种版本。

处理：

- 规则来源可追溯；
- 默认预设采用资料支持充分的常见版本；
- 争议项标记；
- 必要时使用本次规则调整；
- 不冒充唯一标准。

---

## RISK-02 多拆分导致计算量增长

处理：

- Count Array；
- DFS Memo；
- Dedup；
- Worker；
- Cache；
- 性能回归。

禁止减少搜索范围。

---

## RISK-03 Result 与 UI 强耦合

处理：

- Domain 输出 structured result；
- Result UI 只负责展示；
- Formatter 复用 Explanation。

---

## RISK-04 本地数据损坏

处理：

- IndexedDB transaction；
- backup；
- migration；
- read-only fallback；
- result snapshot；
- rule snapshot。

---

## RISK-05 Rule Package 变成脚本系统

处理：

- Rule Package 仅数据；
- Capability allowlist；
- 不允许 eval / DSL 执行任意代码。

---

## RISK-06 PWA 缓存旧版本

处理：

- immutable versioned Rule URLs；
- update metadata；
- user-confirmed update；
- 不使用可选规则 stale silent replacement。

---

## RISK-07 移动端 UI 太拥挤

处理：

- 先按当前 Spec 的页面上方动态选牌器实现；
- 真实设备测试；
- 只有确认空间不足时才启用底部面板降级预案；
- 不提前把 fallback 变成默认。

---

## RISK-08 Scope Creep

处理：

任何新增：

- 自定义规则；
- 癞子；
- 图片识牌；
- 多语言；
- 云同步；
- 结算；

默认进入候选/远期，不直接进入 v0.1.0。

---

# 32. 开发优先级

遇到资源冲突时按：

```text
P0 规则正确性
P0 数据安全
P0 核心计算流程
P1 结果解释
P1 保存/恢复
P1 手机可用性
P1 听牌分析
P2 百科与分享
P2 PWA/离线增强
P2 可访问性完善
P3 视觉精修
P3 非核心动效
```

注意：

基础无障碍仍属于正式发布要求；这里的 P2 表示开发顺序，不表示可以不做。

---

# 33. 阶段 Gate 原则

任何里程碑进入下一个阶段前：

1. 当前阶段相关测试通过；
2. 没有已知会迫使后续大规模推翻的数据结构缺陷；
3. 文档与实现一致；
4. 没有通过 TODO 冒充完成；
5. 新增的规则 Bug 已转回归测试；
6. 发现需求冲突已经处理。

不要求每阶段 UI 全部精修。

---

# 34. 任务拆分原则

下一份 `tasks.md` 应把每个 Milestone 拆成：

```text
Task ID
目标
依赖
涉及文件/模块
实现内容
验收标准
测试要求
对应 REQ/Spec
完成状态
```

任务粒度应满足：

- Codex 一次可以理解；
- 不跨越太多领域；
- 有明确完成判定；
- 可独立 review；
- 不把整个 M4 写成一个任务。

---

# 35. Tasks 推荐批次

`tasks.md` 建议组织为：

```text
T0xx  Foundation
T1xx  Domain Model
T2xx  Rule System
T3xx  Structure Engine
T4xx  Pattern / Score
T5xx  Calculator UI / Rule Picker / Navigation Guard / Assets
T6xx  Result / Adjustment / Quick Calc
T7xx  Ready Analysis
T8xx  Encyclopedia
T9xx  Persistence / Preferences / Migration / Replace Guard Integration
T10xx Share / Import / Selected Export
T11xx PWA / Update / Settings / Product Identity
T12xx Quality / Browser Capability / Release
```

这样：

- ID 稳定；
- 可追加任务；
- 可映射 Milestone；
- Codex 容易按阶段执行。

---

# 36. 不允许 Plan 做出的变更

本计划不得被理解为允许：

- 推迟冻结的 v0.1.0 功能到 v0.2；
- 用 Alpha 代替完整 v0.1.0；
- 把听牌分析降为 Future；
- 把规则百科降为空页面；
- 把保存/分享改为联网服务；
- 把自定义规则提前到 v0.1；
- 将大众麻将与国标合并；
- 去掉完整拆分枚举；
- 去掉三层结果；
- 去掉 Rule Snapshot / Result Snapshot 等历史可复现机制。

如果开发中认为范围过大，只能提出正式需求变更，不允许由 Plan 自行缩减。

---

# 37. Plan 完成判定

本计划自身可视为通过的条件：

- 阶段顺序与 Architecture 一致；
- v0.1.0 冻结功能均有实施阶段承载；
- 没有把远期需求混入当前开发；
- Alpha/Beta/RC Gate 明确；
- 规则测试贯穿开发；
- 数据迁移与 PWA 不是最后临时补丁；
- 下一步可以据此生成 `tasks.md`。

---

# 38. 当前建议执行顺序

正式编码时建议严格从：

```text
M0
→ M1
→ M2
→ M3
→ M4
```

开始。

在 M4 的 Domain Engine 没有通过足够规则牌例之前，**不要投入大量时间精修 Calculator UI**。

原因：

> 如果规则、牌面模型和拆分结构后续被推翻，UI 返工成本会非常高。

当 M4 已经能够通过代码直接输入固定牌例并输出正确、可解释结果后，再进入 M5 做完整图形化交互。

---

# 39. 文档批准

本文件已于 2026-08-10 获项目方正式确认，当前状态：

```text
已批准 / Active
```

生效后：

- `tasks.md` 根据本 Plan 拆分可执行任务；
- `docs/AGENTS.md` 根据全部上游文档约束 Codex；
- Codex 开发应默认按 `tasks.md` 当前阶段执行；
- 任何需要跳阶段的情况必须说明原因和影响。

---

# 40. 一句话实施策略

> **先把麻将规则与计算引擎做成可信、可测试、可复现的核心，再把完整交互、数据、PWA 和发布能力一层层接上去；v0.1.0 的目标不是“尽快做出页面”，而是做出后续所有地区规则都能稳定复用的第一代计算器平台。**
