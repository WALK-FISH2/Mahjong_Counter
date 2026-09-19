# M9 Batch 20 验证记录

## 1. 范围与环境

- 最终验证日期：2026-09-11（Asia/Shanghai）；2026-09-09 的未提交实现续作，没有回滚或重复初始化项目。
- 执行人：Codex。
- 分支：`m9-persistence`。
- 基准 HEAD：`ac3a3998f1f06a3d0c6ecb2c53e62a4200319827`；结论针对该提交之上的当前工作树，不代表 GitHub 托管 CI 已执行。
- 正式任务依据：[Tasks](../../planning/tasks.md)；仅 `Batch 20 / T901～T907`，未创建临时 Task ID。
- Active Baseline：[Baseline 1.2](../../product/requirements-baseline-v1.2.md)。
- 前置 Gate：[M8](../m8/gate.md)；T612 及 M8 Task 已完成。
- App Version：`0.0.0`；Engine Version：`0.0.0`；Database Schema Version：`1`；Calculator schemaVersion：`1`。
- Rule：`common-simple@1.0.0`；content hash：`dbbbae8810ddfb22a271d4f529e84ac107731e55df319b2e6eec6772539fd14e`，未修改。
- Windows / PowerShell；Node.js `v24.12.0`；npm `11.6.2`；Playwright `1.62.1` 的 Chromium / WebKit 项目，生产构建由 `http://127.0.0.1:4173` 提供。
- 单元持久化测试使用每个 fixture 独立的 `fake-indexeddb` 工厂；E2E 使用真实浏览器 IndexedDB，不把模拟数据库结果当作真实浏览器证据。

## 2. 逐项验收

| Task | 最终状态 | 实现与验证证据                                                                                                                                                                                                                                     | 结论 |
| ---- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| T901 | DONE     | Dexie schemaVersion 1；六个正式 store 的精确名称；open/close/reopen；除 savedExamples 外全部保持空表                                                                                                                                               | PASS |
| T902 | DONE     | CalculatorDocument → 显式 DTO → Schema → IndexedDB → Schema → DTO → Domain/Application mapping；三层结果、revision、RuleRef、EngineVersion、Temporary Rule Adjustment、Fan Adjustment（含失效原因）、全部拆分/落点、并列最高与上次方案的 roundtrip | PASS |
| T903 | DONE     | 规则显示名称 + 1～2 个主要番型；稳定排序；排除自摸、门前清及规则 extras；无主要番型时使用“普通和牌”                                                                                                                                                | PASS |
| T904 | DONE     | 仅当前实际规则层、当前 document revision 的合法正式分析；表单只有名称；重名生成不同 ID；shared/imported 源不自动保存，只能主动新建；保存后停留原页面和结果                                                                                         | PASS |
| T905 | DONE     | modifiedAt 默认倒序；名称搜索、规则筛选、名称排序和时间正序；不可读记录保留并提示；单元、组件及 E2E 验证                                                                                                                                           | PASS |
| T906 | DONE     | 保存时结果默认只读，无 Engine 调用；保留条件、调整、排除原因、来源和版本；编辑通过现有 Replace Guard 建立临时副本；取消/保护失败/等待期间输入变化均不覆盖当前输入                                                                                  | PASS |
| T907 | DONE     | 显式更新、另存、放弃三路径；只读和编辑不自动写记录；事务比较原记录防并发覆盖；新建/另存使用新 ID；Quota 失败回滚                                                                                                                                   | PASS |

T901～T907 的实现、测试和必需质量检查全部通过后才更新 `tasks.md`。该文件只修改这七个 Task 的状态，未更改目标、依赖、验收或后续 Task。

## 3. 最终数据与边界设计

### Persistence DTO

- `PersistedCalculatorState` 显式列出 CalculatorDocument 的可持久字段：schemaVersion、ruleRef、hand、context、temporaryRuleAdjustment、fanAdjustments、transientInput、source、revision。
- `SerializableEvaluation` 保留所有候选的结构拆分、Winning Tile Placement、识别结果、计入/排除关系和原因、ScoreBreakdown、Legality、Explanation、最高候选引用和选择引用；不截断为首解。
- `SavedResultSnapshot` 保存 preset/session/user 三层事实、documentRevision、最高及上次查看引用、RuleRef、EngineVersion。
- `SavedExampleRecord` 保存 ID、名称、createdAt/modifiedAt、calculator、resultSnapshot、ruleRef、engineVersion、dataSchemaVersion。
- 类型复用纯数据叶子模型，不持久化 Zustand actions、React 状态、Worker、Error、Promise、Undo 或 runtime documentEpoch。
- 运行时完成结果另外绑定 `analysisRevision` 和 `analysisDocument`；DTO 保存的是可复现事实，不用对象引用代替序列化数据。

### 展示 Snapshot 不是规则事实库

- `display` 只保留保存时名称、状态、限制文本、pattern 显示名称/数值、单位、来源摘要及条件/调整显示标签。
- 只读详情复用 `AnalysisResult` 的展示路径，不执行识别、关系、计分或合法性计算。
- Snapshot 不具有 RulePackage 的 TileSet、HandModel、Capability 等完整契约，不传入 Engine，不驱动百科，不据此构建 EffectiveRule。
- 编辑副本使用 RuleRepository 中准确已安装的 RuleRef，并核对保存时 content hash；无法取得准确规则则保留原数据、拒绝替换，不下载或执行历史代码。
- MinimalRuleSnapshot 生成、规则缺失后的兼容重算以及旧规则试算仍属于 T914，本批没有实现。

### Dexie schema

数据库：`MahjongFanCalculatorDB`，版本来自独立 `DATABASE_SCHEMA_VERSION`。

| Store               | 索引定义                                                                     | Batch 20 行为        |
| ------------------- | ---------------------------------------------------------------------------- | -------------------- |
| savedExamples       | `id, modifiedAt, name, ruleRef.ruleId, [ruleRef.ruleId+ruleRef.ruleVersion]` | 读取、新建、显式更新 |
| trashExamples       | `id, trashedAt, modifiedAt`                                                  | 仅空表脚手架         |
| draft               | `key`                                                                        | 仅空表脚手架         |
| ruleSnapshots       | `snapshotId, [ruleRef.ruleId+ruleRef.ruleVersion], contentHash`              | 仅空表脚手架         |
| rulePackageMetadata | `[ruleRef.ruleId+ruleRef.ruleVersion]`                                       | 仅空表脚手架         |
| migrationBackups    | `id`                                                                         | 仅空表脚手架         |

### Repository / Port

- Application 定义 `SavedExampleRepository`（list/get/add/update）、ClockPort 和 IdGeneratorPort；组合根注入 Dexie 实现、时间和随机 ID。
- Infrastructure 的 `Table<unknown, string>` 读取后必须经过 Schema；没有 `JSON.parse(...) as DTO` 或外部持久数据的直接强转。
- Schema 使用严格字段白名单，校验版本、枚举、数值、字符串、嵌套/总量边界、RuleRef/revision、结果层对应关系、候选及来源引用、人工调整的基础合法性；拒绝危险键、可执行值和非 HTTP(S) 来源 URL。
- 一个损坏/高版本记录不影响其他正常记录；不删除或覆盖原始数据。不声称已完成 Migration。
- 新建使用 add 与新 ID，重名不查找并覆盖旧记录。更新在同一读写事务中比较完整 expected 原记录；即使两次更新时间相同，也能检测已改变的原记录。失败不留下部分更新。

## 4. 保存资格与编辑安全

- 保存检查 `analysisStatus=completed`、结果非空、`analysisRevision===document.revision`、`analysisDocument===document`。
- 实际规则层固定为 session-rule（存在时）或 preset，不由 UI 当前展示层决定。测试覆盖“preset 合法但 session 非法”仍拒绝保存，以及相反情况可以保存。
- 必须具有独立 winningTile、无未完成临时录入/牌组编辑、通过既有 Domain/Application 正式操作条件；development 规则不可保存。
- Fan Adjustment 仅改变用户讨论结果，不改变基础合法性和保存资格。
- Quick Calc 和 Ready/Discard 展示不提供正式保存；即使之前有合法正式结果也不能从这些入口保存。Engine Error、信息不足、Needs Correction、过期结果和未完成状态拒绝保存。
- runtime `documentEpoch` 在整体替换时变更，避免异步保存完成后错误关联到同 source/revision 的新会话；它不是新的 Domain 字段，也不写入 IndexedDB。
- Replace Guard 复用现有内存 Draft Port；取消、保护失败、异步读取期间输入变化都不覆盖 Calculator。持久 Draft 集成仍属 T909/T916。
- 只读详情及浏览方案不写库；更新原记录必须显式提交，另存不改原记录，放弃恢复临时副本并返回保存时详情。

## 5. 实际执行命令与结果

以下是当前完成态的验证结果，不沿用前次中断前的 18 项测试作为最终结论。

| 命令                                                                                                                                                                                          | 结果 | 实际结果                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------------------------- |
| `npm.cmd run format:check`                                                                                                                                                                    | PASS | 全部匹配 Prettier 格式                                                                  |
| `npm.cmd run lint`                                                                                                                                                                            | PASS | 0 error / 0 warning                                                                     |
| `npm.cmd run typecheck`                                                                                                                                                                       | PASS | TypeScript project build/typecheck 完成                                                 |
| `npm.cmd run test`                                                                                                                                                                            | PASS | 88 files / 390 tests                                                                    |
| `npm.cmd run test -- src/application/examples src/features/saved-examples`                                                                                                                    | PASS | Batch 20：2 files / 25 tests（22 Application/DB + 3 UI）                                |
| `npm.cmd run test:architecture`                                                                                                                                                               | PASS | Domain import boundaries verified                                                       |
| `npm.cmd run build`                                                                                                                                                                           | PASS | Tile Asset Manifest、Rule validation、TypeScript、Vite/PWA 构建成功；81/78/3、6 sources |
| `npm.cmd run test -- src/application/encyclopedia src/pages/encyclopedia src/test/rule-cases/common-simple/structure-rule-cases.test.ts src/content/rules/common-simple/rule-package.test.ts` | PASS | M8 定向回归：6 files / 31 tests                                                         |
| `npm.cmd run test -- --config vitest.encyclopedia.config.ts`                                                                                                                                  | PASS | 1 file / 2 tests；包括实际 dist 文件与源数据逐项比较                                    |
| `node scripts/run-e2e.mjs --workers=2`                                                                                                                                                        | PASS | 36/36；Chromium 18/18、WebKit 18/18；覆盖既有 M0～M8 交互和 Batch 20                    |
| `node scripts/run-e2e.mjs e2e/saved-examples.spec.ts --workers=2`                                                                                                                             | PASS | 增强 Quick Calc / Ready 已有合法结果的限制后复跑：8/8；两浏览器各 4/4                   |
| `git diff --check`                                                                                                                                                                            | PASS | 无空白错误；保留既有 LF/CRLF 提示                                                       |

开发中已修复重复 import、React Refresh 非组件导出和字符串类型 lint 问题。新增 Engine Error 测试最初直接重复分析已完成状态，被现有规则正确拒绝为 ANALYSIS_NOT_READY；测试改为走 invalidate → reanalyse 的真实流程，未削弱产品约束。最终测试结果如上。

### 主要测试覆盖

- DB 六表、open/close/reopen、只有 savedExamples 写入。
- T902 完整数据库往返：三层结果、revision、独立牌面分区、显式胡牌张、Rule/Engine Version、临时规则、人工调整和 stale 原因。
- 使用测试规则数据制造真实并列最高，保存全部候选、全部最高引用和上次查看方案；不靠伪造首解证明多解。
- 当前实际层合法性、Fan Adjustment 基础合法性、revision/identity、迟到结果、Engine Error、未完成/信息不足/Needs Correction。
- 新 ID、重名、shared/imported 显式新建；缺省名稳定性与普通附加项排除。
- 列表查找/排序、只读无重算/无写入、编辑副本、取消/保护失败、输入在异步等待期间改变。
- 更新/另存/放弃、旧记录比较、相同时间戳并发更新冲突、Quota 事务回滚、不可用存储不虚假成功。
- 损坏/高版本/超长/非法数值/RuleRef/revision/引用/多余字段/函数/危险键/脚本 URL 的拒绝与原始记录保留。
- 表单仅名称、键盘焦点约束、错误后保留名称、只读三层结果与条件显示。

## 6. 浏览器与 M8 回归证据

- Chromium / WebKit 使用真实 IndexedDB 完成保存、刷新、列表、只读详情、编辑、显式更新、另存、放弃。
- 两浏览器均验证重名记录不合并，跨 Tab 陈旧原记录不能覆盖，Quick Calc/Ready/非法实际层不能绕过保存资格。
- IDB unavailable 故障注入下仍可完成正式计算、浏览 81 项百科；保存失败有明确提示，未虚假显示成功。此处是保存操作错误保护，不代表 T913 完整 Capability/Temporary Mode 已完成。
- 正常及存储失败流程的页面 console error/warning 与 pageerror 检查通过。
- M8 搜索、筛选、百科示例带入 Replace Guard、Deep Link、刷新、导航及规则同源回归通过。
- 实际百科 bundle revision 仍为 `a105d525f540c182c09abbc57e590d3bbfa3d5902c1aaaa2796443425e1b360b`；生成物保留 81 项番型、5 个示例/Rule Cases 和 6 个来源，未引入第二套规则事实。

截图（自动化流程生成，已检查手机只读和桌面编辑展示）：

- [Chromium 手机只读](screenshots/batch-20-chromium-readonly-mobile.png)
- [WebKit 手机只读](screenshots/batch-20-webkit-readonly-mobile.png)
- [Chromium 桌面编辑](screenshots/batch-20-chromium-editor-desktop.png)
- [WebKit 桌面编辑](screenshots/batch-20-webkit-editor-desktop.png)

## 7. 文件清单

新增：

```text
src/application/examples/index.ts
src/application/examples/persistence-models.ts
src/application/examples/saved-example-name.ts
src/application/examples/saved-example-policy.ts
src/application/examples/saved-example-repository.ts
src/application/examples/saved-example-service.ts
src/application/examples/saved-example-snapshot.ts
src/application/examples/saved-example.batch-20.test.ts
src/schemas/persistence/calculator-state-schema.ts
src/schemas/persistence/saved-result-schema.ts
src/schemas/persistence/saved-example-schema.ts
src/infrastructure/db/mahjong-database.ts
src/infrastructure/db/dexie-saved-example-repository.ts
src/features/saved-examples/SaveExampleDialog.tsx
src/features/saved-examples/SavedExampleEditActions.tsx
src/features/saved-examples/saved-error-message.ts
src/features/saved-examples/snapshot-label.ts
src/features/saved-examples/saved-examples.batch-20.test.tsx
src/pages/saved-examples/SavedExampleDetailPage.tsx
src/test/helpers/persistence-fixture.ts
e2e/saved-examples.spec.ts
vitest.encyclopedia.config.ts
docs/verification/m9/batch-20.md
docs/verification/m9/screenshots/batch-20-chromium-readonly-mobile.png
docs/verification/m9/screenshots/batch-20-webkit-readonly-mobile.png
docs/verification/m9/screenshots/batch-20-chromium-editor-desktop.png
docs/verification/m9/screenshots/batch-20-webkit-editor-desktop.png
```

修改：

```text
package.json
package-lock.json
tsconfig.node.json
src/app/app.css
src/app/bootstrap/calculator-bootstrap.ts
src/app/routes/AppRoutes.tsx
src/application/calculator/calculator-store.ts
src/features/analysis-result/AnalysisResult.tsx
src/pages/calculator/CalculatorPage.tsx
src/pages/saved-examples/SavedExamplesPage.tsx
build/encyclopedia/core-encyclopedia-artifacts.test.ts
docs/planning/tasks.md
```

E2E 会按既有 T525 测试重写两张 M5 截图；本批运行后从本轮运行前备份恢复，未纳入无关差异。父目录 `02_Document/20260803.docx` 的用户原有修改始终未触碰。

## 8. 依赖、版本与已知限制

- 新增 Dexie `4.4.5`（Architecture 已选的本地 IndexedDB 封装，Apache-2.0）；fake-indexeddb `6.2.5`（仅开发测试，Apache-2.0）。直接原生 IDB 更轻但需要另行维护事务/异步封装；此处按已批准方案复用 Dexie。
- 两者不要求业务网络、账号、遥测或云服务；没有新增上传、CSP 放宽或生产远程执行路径。fake-indexeddb 不进入生产 bundle。
- 当前主 JS 构建约 658.38 kB / gzip 196.11 kB；没有把总体 chunk 大小伪称为单个依赖增量。既有 >500 kB chunk 提示仍存在。
- 额外执行 `npm.cmd audit --json`：退出码 1，3 项既有开发依赖告警（vitest 4.1.10、@vitest/mocker 4.1.10、fast-uri 3.1.5；2 moderate / 1 high）。与 HEAD lockfile 对比确认版本未变，不由新增 Dexie/fake-indexeddb 引入；未运行 audit fix 或扩大依赖升级范围。
- `npm.cmd audit --omit=dev --json`：PASS，生产依赖 0 项告警。这不等于对全部依赖提供绝对安全保证；上述开发依赖问题应在独立依赖维护任务处理。
- Vite native config loader 未来兼容提示、PWA inlineDynamicImports 弃用提示、NO_COLOR/FORCE_COLOR 环境提示均为既有构建/工具提示，必需命令成功；浏览器页面 console 检查通过。
- 本批是首次正式持久格式落地；此前 M8 没有正式 Saved 数据。数据库/Engine/Rule 版本常量未变，未改变规则计算事实。未知/更高持久版本保留并拒绝解析，不自动删除或猜测迁移。
- 未实际执行 GitHub 托管 CI、微信真机验证、真实磁盘耗尽、历史版本迁移、断网缓存验收；未声称这些通过。
- T908～T919、Draft 自动持久化、Trash 行为、RuleSnapshot 正式生成、Migration、Import/Export、M10 均未实现；M9 全部能力尚未完成。
- `src/domain`、冻结 Baseline、Spec、Rule Spec 和正式 RulePackage 事实没有修改。通用代码只有引用相等/筛选比较，没有按某个 ruleId 特判业务。

## 9. 最终结论

```text
T901～T907 = DONE
Batch 20 = PASS
M9 Gate = IN PROGRESS
下一推荐 Batch = Batch 21 / T908～T914
是否可以继续 = YES（等待项目方确认，不自动开始）
```

未 commit、未 push。Batch 20 PASS 不代表 M9 Gate 或正式发布 Gate 已通过。
