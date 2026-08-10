好的。现在已经有了这些文件，第一次给codex的提示词是不是不用详细描述？该怎么写呢

对。现在已经有完整的 `requirements-baseline → constitution → spec → architecture → plan → tasks → AGENTS` 文档链，**第一次给 Codex 的提示词反而不应该再重复大段产品需求**。重复描述越多，越容易出现“提示词和文档细节不一致，Codex 不知道听谁的”这种问题。

我建议仍然沿用我们之前确定的工作方式：**第一轮只让 Codex 阅读文档、检查仓库现状、做冲突与差距分析，不修改代码。**

第一次可以直接发下面这段：

> 请先阅读项目根目录的 `AGENTS.md`，并按照其中规定的文档权威关系和工作流程执行。
>
> 然后阅读本项目当前正式文档：
>
> - `docs/product/requirements-baseline.md`
> - `docs/product/requirements-audit.md`
> - `docs/governance/constitution.md`
> - `docs/product/spec.md`
> - `docs/architecture/architecture.md`
> - `docs/planning/plan.md`
> - `docs/planning/tasks.md`
>
> 本轮**不要修改任何代码或文档**。
>
> 请完整检查当前仓库的代码、配置、目录结构和已有功能，并重点回答：
>
> 1. 当前项目已经实现了哪些内容，分别对应哪些 Task；
> 2. 哪些 Task 可以认为已经满足验收条件，哪些只是部分实现；
> 3. 当前代码与正式需求、Spec 或 Architecture 是否存在冲突；
> 4. 是否存在会影响后续开发的数据结构、规则引擎、状态管理、存储或技术栈问题；
> 5. 是否存在文档要求已经明确取消/延期，但代码中仍然存在的功能；
> 6. 按 `tasks.md` 和依赖关系，建议接下来从哪个 Task / Batch 开始；
> 7. 给出下一轮预计需要修改的文件范围。
>
> 如果发现冲突，不要自行决定如何处理，明确列出“文档要求 / 当前实现 / 冲突影响 / 建议处理方案”，等待我确认。
>
> 最后输出一份简洁但完整的“实施前现状与冲突分析”，**不要开始编码**。

这个提示词已经足够了。**不需要再给 Codex 解释什么是副露临时录入、为什么川麻只有 27 种牌、三层结果是什么等**——这些都应该让它从正式文档读取。

而且现在 `AGENTS.md` 已经存在，所以今后提示词可以越来越短。等 Codex 第一轮检查结果没有问题后，第二轮甚至可以只写：

> 根据你上一轮的现状与冲突分析，现在开始执行 `docs/planning/tasks.md` 中的 **Batch 01（T001～T004）**。严格遵守 `AGENTS.md` 和所有上游正式文档。
>  如果实际代码情况与上一轮分析不一致，或实施过程中发现新的需求/架构冲突，立即停止受影响修改并报告，不要自行改变产品设计。
>  完成后按照 `AGENTS.md` 规定的格式汇报修改文件、完成 Task、测试结果、已知限制以及是否可以进入下一 Batch。

以后基本就是这种模式：**文档负责“完整描述”，提示词只负责“告诉 Codex 这轮做什么”**。这比每轮重新复制几十条需求稳得多。











一共要分多少个阶段？每个阶段的提示词怎么写？

按照我们现在已经确定的 `plan.md + tasks.md`，我建议不要把“阶段”和“Codex 每轮执行批次”混在一起。

**产品开发一共是 13 个实施阶段 M0～M12，加上 Alpha、Beta、RC、正式发布 4 个阶段，再加最开始一次“代码现状审查”。所以从项目流程看，一共是 18 个阶段。**

但真正让 Codex 写代码时，M0～M12 又被拆成了 **29 个 Batch**。这是更合适的执行粒度。也就是说，**不要一次告诉 Codex“完成整个 M5”**，而是让它一次完成一个 Batch。

整体关系是：

| 大阶段                    | Codex Batch | Task         |
| ------------------------- | ----------- | ------------ |
| 实施前审查                | —           | 不改代码     |
| M0 Foundation             | 01～02      | T001～T010   |
| M1 Domain Model           | 03～04      | T101～T110   |
| M2 Rule System            | 05～06      | T201～T211   |
| M3 Structure Engine       | 07～08      | T301～T310   |
| M4 Pattern / Score Engine | 09～10      | T401～T411   |
| M5 Calculator UI          | 11～13      | T501～T519   |
| M6 Result / Adjustment    | 14～15      | T601～T614   |
| M7 Ready Analysis         | 16～17      | T701～T712   |
| M8 Encyclopedia           | 18～19      | T801～T810   |
| M9 Persistence            | 20～21      | T901～T914   |
| M10 Share / Import        | 22～23      | T1001～T1017 |
| M11 PWA / Update          | 24～25      | T1101～T1111 |
| M12 Quality / Release     | 26～29      | T1201～T1220 |
| Alpha                     | —           | TA01～TA04   |
| Beta                      | —           | TB01～TB04   |
| RC                        | —           | TR01～TR06   |
| Release                   | —           | TF01～TF02   |

我建议实际跟 Codex 按下面方式推进。

1. **阶段 0：实施前代码审查**

这是你现在第一次给 Codex 的提示词。**不允许它改代码。**

```
请先阅读项目根目录的 AGENTS.md，并严格按照其中规定的文档权威关系和工作流程执行。

然后阅读以下正式文档：

- docs/product/requirements-baseline.md
- docs/product/requirements-audit.md
- docs/governance/constitution.md
- docs/product/spec.md
- docs/architecture/architecture.md
- docs/planning/plan.md
- docs/planning/tasks.md

本轮不要修改任何代码或文档。

请完整检查当前仓库的代码、配置、目录结构和已有功能，并重点分析：

1. 当前已经实现了哪些内容，分别对应 tasks.md 中哪些 Task；
2. 哪些 Task 已满足验收条件，哪些只是部分实现；
3. 当前代码与 requirements/spec/architecture 是否存在冲突；
4. 是否存在会影响后续开发的数据结构、规则引擎、状态管理、存储或技术栈问题；
5. 是否存在已经明确取消或延期，但代码中仍然存在的功能；
6. 按 tasks.md 的依赖关系，建议下一步从哪个 Batch 开始；
7. 给出下一轮预计需要修改的文件范围。

如果发现冲突，不要自行决定如何处理。

请按照：

文档要求
→ 当前实现
→ 冲突
→ 影响
→ 建议方案

的方式列出，等待我确认。

最后输出“实施前现状与冲突分析”。

本轮不要编码。
```

1. **M0：Foundation，Batch 01～02**

如果第一轮没有需要你拍板的重大冲突，就进入真正开发。

Batch 01：

```
根据上一轮现状与冲突分析，现在开始执行：

Batch 01
T001～T004

请严格遵守：
- AGENTS.md
- docs/product/requirements-baseline.md
- docs/governance/constitution.md
- docs/product/spec.md
- docs/architecture/architecture.md
- docs/planning/plan.md
- docs/planning/tasks.md

开始前先核对 T001～T004 在当前仓库中的实际完成情况。

已经完全满足验收条件的 Task 不要重复实现；
部分满足的 Task 只补齐缺口；
不要为了匹配文档目录示例而无意义重构现有可用代码。

如果发现新的需求或架构冲突，停止受影响修改并报告，不要自行改变设计。

完成后按照 AGENTS.md 的格式汇报：
- 完成的 Task
- 修改文件
- 新增/修改测试
- lint/typecheck/test/build 结果
- 已知限制
- 是否满足本 Batch 的验收条件
- 是否可以进入 Batch 02
```

Batch 02 以后，**基本只需要换编号**：

```
继续按照 AGENTS.md 和全部正式上游文档执行。

现在执行：

Batch 02
T005～T010

先核对现有实现，再实施缺失部分。
不要扩大当前 Batch 范围。
不要顺手重构无关模块。

发现需求、架构或现有代码冲突时，停止受影响修改并报告。

完成后：
1. 按 Task 验收标准逐项核对；
2. 运行相关测试；
3. 运行本 Batch 应执行的 lint/typecheck/test/build；
4. 报告修改文件、测试结果和已知限制；
5. 判断 M0 Gate 是否已经满足。

不要自动进入 M1，等待我确认。
```

1. **M1：Domain Model，Batch 03～04**

这一阶段非常重要，主要是牌的数据模型。

```
现在开始 M1 — Mahjong Domain Model。

本阶段对应：
Batch 03：T101～T105
Batch 04：T106～T110

先执行 Batch 03，本轮不要提前执行 Batch 04。

重点遵守 architecture.md 中关于：
TileCode、Meld、HandSnapshot、TransientInputSession、WinContext
的领域边界。

特别注意：
- concealed / melds / flowers / winningTile 必须分离；
- 副露临时录入不得污染正式 Hand；
- 不得记录当前版本不需要的来源玩家、一炮多响等多人字段；
- Domain 不得依赖 React、DOM、Zustand、Dexie 或 UI；
- 不得把 34/42 或 13/14 作为不可扩展业务常量散落实现。

完成后按 AGENTS.md 汇报，并判断 Batch 03 是否满足验收。
不要自动进入 Batch 04。
```

Batch 04 时只写：

```
继续 M1，现在执行 Batch 04：T106～T110。

以上一轮已经通过 Review 的 M1 数据模型为基础继续开发。

重点完成 CalculatorDocument、全局牌数、结构张数、Domain 硬校验和 revision。

不要重新设计上一轮已经确认的数据模型，除非发现明确冲突。

完成后运行相关测试，并逐项检查 M1 Gate。
不要自动进入 M2。
```

1. **M2：Rule System，Batch 05～06**

```
现在开始 M2 — Rule System。

先执行 Batch 05：T201～T205。

目标是建立真正的数据驱动 RulePackage，而不是在代码中硬编码大众麻将。

重点：
- RulePackage 必须是数据；
- 禁止执行规则 JavaScript、eval 或任意表达式；
- 动态牌种、结构张数、Context 必须由规则声明；
- 大众麻将与未来国标麻将必须保持独立 Rule ID；
- 未知 Capability 不得冒险计算。

完成后按 Task 验收并汇报，不要进入 Batch 06。
```

然后：

```
继续 M2，执行 Batch 06：T206～T211。

重点完成：
PatternDefinition、PatternRelation、Capability Registry、
RuleRepository、大众麻将·通用简化版 RulePackage、
Build-time Rule Validation。

大众麻将必须从第一版开始走正式 RulePackage Pipeline，
禁止建立一套临时硬编码规则以后再重构。

完成后检查 M2 Gate。
```

1. **M3：Structure Engine，Batch 07～08**

```
现在开始 M3 — Structure Engine。

先执行 Batch 07：T301～T305。

这一阶段优先保证数学/规则正确性，不做 UI。

重点：
- TileCount 内部表示；
- 普通结构 DFS；
- Memoization；
- Canonical Dedup；
- 固定副露集成。

必须枚举全部合法拆分。
严禁找到第一种胡法后停止。

每种算法都必须有固定牌例测试。

完成后汇报，不进入 Batch 08。
```

然后：

```
继续 M3，执行 Batch 08：T306～T310。

完成：
- 七对
- 十三幺
- 多结构并行
- Winning Tile Placement
- Structure Rule Test Corpus

特别检查同一牌面存在多个结构、多个拆分、多个胡牌张落点的情况。

完成后只有在 M3 Gate 全部满足后，才建议进入 M4。
```

1. **M4：Pattern / Score Engine，Batch 09～10**

```
现在开始 M4 — Pattern / Score Engine。

执行 Batch 09：T401～T405。

重点建立：
DerivedFacts
→ PatternRecognizer Registry
→ 大众麻将番型识别
→ Pattern Relation Resolver
→ Scoring Strategy

Recognizer 只负责“番型是否成立以及证据”。

不要让 Recognizer 同时处理：
互斥、包含、封顶、起胡或最终合法性。

每个自动番型至少增加：
- 正例
- 易误判反例
```

然后：

```
继续 M4，执行 Batch 10：T406～T411。

重点完成：
- Cap / Extras
- Legality
- CalculationExplanation
- Candidate Comparison
- evaluateHand
- 完整 Rule Case Corpus

必须证明：
- Score 与 Legality 分离；
- 多拆分独立计算；
- 不混合不同拆分番型；
- 并列最高全部保留；
- 正式结果可以解释。

完成后检查 M4 Gate。

在 M4 Gate 通过前，不要开始大量 Calculator UI 开发。
```

1. **M5：Calculator UI，Batch 11～13**

Batch 11：

```
现在开始 M5 — Calculator Input UI。

执行 Batch 11：T501～T506。

重点：
- 移动端单页纵向布局；
- 桌面左右布局；
- 顶部当前规则；
- 动态 TilePalette；
- 全局数量角标；
- 手牌输入；
- 一键整理。

UI 必须读取 Rule/Domain 数据，
禁止在组件中复制麻将规则。
```

Batch 12：

```
继续 M5，执行 Batch 12：T507～T514。

这是牌面录入关键批次。

严格按照最新需求实现：
- 胡牌张独立固定区域；
- 吃/碰/明杠/暗杠/花牌没有长期固定空区域；
- 使用临时录入流程；
- 吃牌使用三牌位临时录入；
- 前两张可撤回；
- 第三张非法时保留前两张；
- 完成后成为独立 Meld；
- 完成后自动恢复手牌录入；
- 已完成副露视觉集中展示，但数据语义保持独立。

不要恢复旧版“吃牌区域/碰牌区域/杠牌区域”设计。
```

Batch 13：

```
继续 M5，执行 Batch 13：T515～T519。

完成：
WinContext
缺失上下文
结构张数
悬浮操作条
待修正状态

特别注意：
未知门风/圈风等不得擅自设置默认值；
待修正状态不得静默删除用户输入。

完成后检查 M5 Gate。
```

1. **M6：Result / Adjustment，Batch 14～15**

```
现在开始 M6。

执行 Batch 14：T601～T607。

重点实现：
- Result Outcome
- 正式结果摘要
- 最高拆分牌面
- 完整计算过程
- 并列最高
- Temporary Rule Adjustment UI
- EffectiveRule

System RulePackage 必须 immutable。
临时规则只生成本次 EffectiveRule。
```

然后：

```
继续 M6，执行 Batch 15：T608～T614。

重点实现三层结果：

系统预设结果
→ 本次规则结果
→ 用户调整结果

必须满足核心不变量：

Temporary Rule Adjustment 可以改变合法性；
Fan Adjustment 绝对不能改变 Base Legality。

实现后必须有自动测试证明这一点。

完成后检查 M6 Gate。
```

1. **M7：Ready Analysis，Batch 16～17**

```
现在开始 M7 — 听牌与弃牌分析。

执行 Batch 16：T701～T707。

重点：
- Worker Protocol
- Engine Worker
- revision
- stale result
- cancel
- Wait Analysis
- Discard-to-ready
- LRU Cache

听牌分析必须复用正式 evaluate，不允许另写一个简化版“能胡判断器”。
```

然后：

```
继续 M7，执行 Batch 17：T708～T712。

完成：
- 弃牌小三角
- 待胡牌展示
- 点炮/自摸差异
- 高番优先/听口优先
- 性能回归牌例

不要加入剩余牌数量、概率、牌效率等当前范围外能力。

完成后检查 M7 Gate。
```

1. **M8：Encyclopedia，Batch 18～19**

```
现在开始 M8 — 规则百科。

执行 Batch 18：T801～T805。

重点要求：
百科展示的番值、番型状态、关系和来源，
必须和 Engine 使用同一 RulePackage 数据。

禁止另外维护一份 FAN_TABLE 常量。
```

Batch 19：

```
继续 M8，执行 Batch 19：T806～T810。

完成：
- 搜索筛选
- 示例
- 带入计算器
- Deep Link
- 核心百科离线

Development Rule 只能查看，不允许带入正式计算。

完成后检查 M8 Gate。
```

1. **M9：Persistence，Batch 20～21**

```
现在开始 M9 — Persistence。

执行 Batch 20：T901～T907。

重点：
IndexedDB
SavedExample
Result Snapshot
默认名称
主动保存
Saved List
只读打开
编辑副本
更新/另存/放弃

只有用户明确点击“保存牌例”才创建正式记录。
禁止自动历史。
```

然后：

```
继续 M9，执行 Batch 21：T908～T914。

完成：
Trash
唯一 Draft
Draft 恢复
Undo/Redo
多标签编辑锁
Temporary Mode
Rule Snapshot

特别验证：
- Storage failure 不显示虚假成功；
- Undo History 不持久；
- 两个 Tab 不同时写同一 Draft；
- 删除规则包不破坏旧牌例。

完成后检查 M9 Gate。
```

1. **M10：Share / Import，Batch 22～23**

```
现在开始 M10。

执行 Batch 22：T1001～T1007。

实现：
- 简洁/详细复制
- Unicode + 中文牌名
- SharePayload
- 压缩编码
- 分享摘要
- Share 打开
- 超长 URL JSON fallback

Base64URL/压缩不能称为加密。
分享打开前必须保护当前 Draft。
```

然后：

```
继续 M10，执行 Batch 23：T1008～T1017。

重点完成：
完整备份
单牌例
导入预览
合并导入
覆盖恢复
安全备份
事务 Rollback
高版本只读
外部 Payload 安全限制

所有外部 JSON 必须从 unknown 经过 runtime validation。

禁止 JSON.parse 后直接 as 强转。

完成后检查 M10 Gate。
```

1. **M11：PWA / Update，Batch 24～25**

```
现在开始 M11。

执行 Batch 24：T1101～T1105。

完成：
PWA Manifest
Service Worker
核心规则离线
核心百科离线
非打扰式安装提示

首次访问不要强弹安装。
断网后核心 Calculator 必须仍可使用。
```

然后：

```
继续 M11，执行 Batch 25：T1106～T1111。

完成：
可选 Rule Package 下载框架
Integrity/Staging
App 更新检查
App Update
Rule Update
Rule Package 删除与 Snapshot 保留

任何 Rule Update 都不能静默改变旧牌例。

完成后检查 M11 Gate。
```

1. **M12：Quality，Batch 26～29**

Batch 26：

```
现在开始 M12 — Quality Hardening。

执行 Batch 26：T1201～T1205。

完成主题、Reduced Motion 和基础无障碍。

不要只做视觉检查，要有键盘、焦点、aria 和分析状态测试。
```

Batch 27：

```
继续 M12，执行 Batch 27：T1206～T1210。

完成跨端验收：
移动端
桌面
Safari/WebKit
Android Chromium
微信内置浏览器

微信部分如果无法自动化，请生成明确的真实设备人工验收清单并记录结果。
```

Batch 28：

```
继续 M12，执行 Batch 28：T1211～T1215。

完成：
Storage failure
Migration Harness
Import/Export 全量回归
Share 安全
百科内容安全

重点测试异常路径，而不仅是成功路径。
```

Batch 29：

```
继续 M12，执行 Batch 29：T1216～T1220。

完成：
PWA Offline
性能验收
隐私检查
Rule Test Coverage Review
正式发布 Blocker Checklist

完成后不要直接发布 Alpha。

请完整检查 M12 Gate，并输出：
- 所有未完成 Task
- 所有失败测试
- 所有已知规则问题
- 是否具备进入 Alpha 的条件

等待我确认。
```

1. **Alpha**

这里开始不再是普通功能开发。

```
现在进入 v0.1.0 Alpha 阶段。

请执行 tasks.md 中：
TA01～TA04

本阶段目标不是新增功能，而是验证当前完整实现。

重点：
- 发布 alpha 标识版本；
- 执行内部规则牌例人工交叉验证；
- 每个规则 Bug 必须建立永久 Regression Test；
- 验证 alpha.x 数据升级。

如果发现功能缺失，先判断是冻结需求遗漏还是实现缺陷。
不要利用 Alpha 随意增加新功能。

完成后按照 Alpha Exit Gate 给出是否可以进入 Beta 的明确判断。
```

1. **Beta**

```
现在进入 v0.1.0 Beta 阶段。

执行：
TB01～TB04

重点：
- 面向真实使用场景测试；
- 分类规则 Bug、规则资料争议、UI 误解；
- 做真实手机/桌面/微信测试；
- 验证 beta.x 数据迁移。

任何规则问题都必须记录：
App Version
Engine Version
Rule Version
复现牌例
资料依据

规则 Bug 修复后必须增加永久回归测试。

不要在 Beta 阶段扩张产品范围。

最后按照 Beta Exit Gate 判断是否可以进入 RC。
```

1. **RC**

```
现在进入 v0.1.0 RC 阶段。

执行：
TR01～TR06

从现在开始冻结新功能。

禁止：
- 新功能
- 大规模重构
- 高风险 UI 改版

只允许修复：
- 发布阻断问题
- 严重规则问题
- 数据完整性问题
- 高价值低风险缺陷

完整执行：
Rule Test
数据完整性
浏览器兼容
PWA/Offline
发布 Blocker Review

最终明确输出：

严重错算：
严重漏算：
合法性严重误判：
数据严重故障：
核心流程 blocker：

只要其中任何一项非 0，都不要建议正式发布。
```

1. **正式发布**

```
RC Gate 已经确认通过。

现在执行：
TF01～TF02

准备正式 v0.1.0。

请完成：
- 固定 App Version
- 固定 Engine Version
- 固定大众麻将 Rule Version
- Release Notes
- Rule Support Scope
- Known Limitations
- 正式 PWA 构建检查
- v0.1.x Patch 流程确认

正式发布前再次运行最终必要测试。

不要修改已经通过 RC 的产品范围和核心行为。

最后输出正式发布检查报告。
```

### 实际使用时最重要的一点

你**不需要每次都复制我上面这么长的提示词**。

第一次现状审查完成之后，Codex 已经知道这个项目的文档体系。以后大部分时候，你发这种长度就够了：

```
继续按照 AGENTS.md 和全部正式上游文档执行。

现在执行 Batch 12：T507～T514。

先核对当前实现，再完成本 Batch 未满足的部分。
严格控制修改范围，不提前执行后续 Batch。

如果发现需求/架构冲突，停止受影响修改并报告。

完成后按 AGENTS.md 要求汇报 Task、修改文件、测试结果、已知限制，并判断本 Batch 是否通过。
```

**真正的需求在文档里，提示词只负责指定“这一轮做到哪里”。**

所以实际开发时，我更推荐你的节奏是：

**第一次现状审查 → Batch 01 → 你把 Codex 结果给我看 → Batch 02 → …… → Batch 29 → Alpha → Beta → RC → 正式版。**

尤其前几个 Batch 建议你把 Codex 的输出发给我一起核对，因为 **M1～M4 决定了整个麻将规则引擎的地基**，这里如果方向偏了，到了 UI 阶段再发现，返工会很大。