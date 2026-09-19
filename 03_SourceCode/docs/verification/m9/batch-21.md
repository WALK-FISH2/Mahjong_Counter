# M9 Batch 21 验证记录

## 1. 范围与环境

- 本轮在 2026-09-17 继续中断工作树，于 2026-09-18 完成验收（Asia/Shanghai）。没有回滚或重复初始化已实现部分。
- 分支：`m9-persistence`；基准 HEAD：`c4a41fcf6b7a5fe028a359a74f225937967d781c`。本记录针对未提交工作树，不冒称 GitHub Actions 已验证本轮修改。
- 唯一任务范围：[Tasks](../../planning/tasks.md) 的 `Batch 21 / T908～T914`；前置证据：[Batch 20](batch-20.md)、[M8 Gate](../m8/gate.md)。
- App/Engine：`0.0.0`；Database Schema Version：`1`；Calculator schemaVersion：`1`。新增 Draft/RuleSnapshot DTO formatVersion 为 `1`；未更改正式规则/计算版本。
- Rule：`common-simple@1.0.0`；原 content hash `dbbbae8810ddfb22a271d4f529e84ac107731e55df319b2e6eec6772539fd14e` 不变。
- Windows / PowerShell；Node `v24.12.0`，npm `11.6.2`，Playwright `1.62.1`；Chromium `151.0.7922.34`、WebKit `26.5`。
- E2E 使用生产构建和真实浏览器 IndexedDB，`http://127.0.0.1:4173`；单元/组件测试使用独立 fake-indexeddb，不把模拟库冒称真实浏览器。

## 2. 逐项验收

| Task | 状态 | 证明内容 | 结论 |
| --- | --- | --- | --- |
| T908 | DONE | saved/trash 跨表事务；移入/恢复不改 modifiedAt；长期保留；永久删除需确认；冲突、失败回滚、损坏记录不丢弃 | PASS |
| T909 | DONE | 单一 current Draft；500ms debounce；可捕获离开/visibilitychange/替换尽力写入；DTO 保留临时录入、牌组编辑目标、临时规则、待修正输入、Saved 原记录校验基线 | PASS |
| T910 | DONE | 启动明确继续/新建；选择前不覆盖；继续恢复 Domain/Application 状态；只有明确新建才放弃旧 Draft | PASS |
| T911 | DONE | 会话 Command History；加删牌、胡牌张替换、完成/删除副露、上下文及自动清除、规则切换、临时规则；Undo/Redo 新 revision；刷新历史清空 | PASS |
| T912 | DONE | 双 Tab、takeover、旧主只读、旧 token/迟到写入拒绝、fallback、heartbeat/expiration；详细矩阵及能力边界见 [T912](T912.md) | PASS |
| T913 | DONE | IDB/quota 注入、统一 Temporary Mode、核心计算可用、不虚假保存、暂停恢复/写入、显式重检；详见 [T913](T913.md) | PASS |
| T914 | DONE | 保存时原子持有最小规则快照；规则缺失仍能展示旧结果；兼容性判定；不兼容只读 legacy；无自动最新版本替代或历史 JS | PASS |

上述代码、测试和质量检查全部通过后，仅将 `tasks.md` 的 T908～T914 从 TODO 改为 DONE。没有修改目标、依赖、验收或 T915～T919；没有创建最终 `m9/gate.md`。

## 3. 最终数据与职责边界

### 3.1 DTO / Schema / Repository

- 复用 Batch 20 的 PersistedCalculatorState、SavedExampleRecord、SavedResultSnapshot、SerializableEvaluation；没有新增第二套 Calculator 持久模型。
- `TrashExampleRecord` 只在原记录上增加 trashedAt。
- `DraftRecord` 为单一 `key=current`，包含 formatVersion、savedAt、calculator DTO、editingMeldId、editingOrigin、writeToken、lease。editingOrigin 保留 Saved 原记录完整 expected 基线，刷新后仍能识别并发修改，而不是只恢复一个 ID 后默许覆盖。
- `RuleSnapshotRecord` 包含 snapshotId、formatVersion、RuleRef、独立内容 hash、MinimalRuleSnapshot。现有 Saved 数据格式不增加必填字段：通过保存时已存在的 ruleContentHash 派生稳定引用 `s:<original-rule-hash>`。
- Infrastructure 的表值仍为 unknown。所有读取经严格 Schema、版本/引用/资源边界校验，再返回 typed DTO；没有外部数据 `as` 强转。
- Application 定义 DraftRepository、TrashRepository、RuleSnapshotPort、EditorSignalPort、EditorLockPort；Infrastructure 实现 Dexie / BroadcastChannel / Web Locks；UI 展示状态、收集显式选择，不自行执行麻将规则。

### 3.2 六个 store 不变

沿用 Database Schema Version 1 和原索引，未新增第七张表：

| Store | 本 Batch 行为 |
| --- | --- |
| savedExamples | 沿用保存/显式更新，和新规则快照同事务提交 |
| trashExamples | 移入、恢复、明确永久删除；无自动过期 |
| draft | 唯一 current 内容、lease、writeToken |
| ruleSnapshots | 保存牌例时按原规则内容标识去重保存；历史解析校验 |
| rulePackageMetadata | 保持既有脚手架，不提前实现安装/迁移 |
| migrationBackups | 保持空表脚手架，不提前实现 T918 |

### 3.3 Draft / Undo / 并发

- 有效文档变化约 500ms debounce；相同内容不重复写。visibilitychange、hashchange、pagehide 和替换发生时尽力捕获。
- 多标签最终持久写入权由 IndexedDB 事务 lease/token + writeToken 确认；通知只是加快同步，不能绕过 fence。
- 主标签限制同时在 Calculator Actions 和 Replace Guard 检查；旧标签不是仅视觉禁用。接管不静默恢复内容，必须经过明确启动选择。
- Command History 只在内存；不做 Event Sourcing，不进入 Draft、Saved 或 RuleSnapshot；恢复/Undo/Redo 清除旧分析结果绑定并生成新 revision。
- 本 Batch 只完成 T909 的尽力保存，以及 T912 必需的编辑权检查。T916 的完整持久 Replace Guard / Engine Recovery Port 集成仍未实施；原保护入口仍复用已有 Port，没有提前将所有替换入口标成持久保护验收通过。

### 3.4 Storage failure

- Storage Capability 是统一事实来源。Saved/Trash/Draft/RuleSnapshot 的基础设施错误都能通知 Temporary Mode。
- 用户收到持续提示；保存、更新、另存、Draft 恢复和写入暂停。错误不会返回“成功”。
- 主编辑器仍可录牌、执行现有完整 Engine；重新检测成功后显示草稿选择，不自动覆盖旧记录。
- Draft ownership conflict、业务 CAS conflict、损坏记录与 storage outage 区分处理，不通过降级绕过并发保护。

### 3.5 T914 历史规则与结果

- MinimalRuleSnapshot 是原 RulePackage 纯数据计算部分的复制：manifest、TileSet、HandModel、structures、contexts、patterns、relations、scoring、legality、temporaryAdjustments、sources；排除大篇百科内容。
- 记录所有原计算事实以支持兼容的显式编辑，而不是另维护一份手写番表。Snapshot 不安装到规则目录，不驱动当前百科，也不冒充最新版 RulePackage。
- Saved 详情始终先渲染保存时 Result Snapshot（名称/状态/警告仍仅为展示事实），不会因打开页面调用 Engine。
- 使用准确原 RuleRef 和原 hash。已安装原规则缺失时才读取快照；校验快照自身 hash、RuleRef、原规则 hash、Schema、source/relations 引用和内置 Capability。
- EngineVersion 不同或规则/能力不兼容时明确 read-only-legacy，保留保存时结果，禁用编辑。不查询最新规则替代，不下载/执行 JS、eval 或历史脚本。
- 兼容快照仅在用户明确选择编辑并通过 Replace Guard 后，交给当前受信任 Engine；不自动重算或写回历史记录。
- 单元测试删除/模拟移除准确原安装版本后，通过真实持久快照取回原版并保持原结果；组件测试验证缺失安装包及不兼容两分支的只读展示、无分析调用、无 latest 查询；E2E 验证真实 IndexedDB 中不兼容 Engine 记录的只读结果。

## 4. 实际运行命令及最终结果

| 命令 | 结果 | 实际计数/内容 |
| --- | --- | --- |
| `npm.cmd run format:check` | PASS | 全部匹配 Prettier |
| `npm.cmd run lint` | PASS | 0 errors / 0 warnings |
| `npm.cmd run typecheck` | PASS | TypeScript project 检查 |
| `npm.cmd run test` | PASS | 91 files / 419 tests |
| `npm.cmd run test -- src/infrastructure/db/broadcast-editor-lock.test.ts src/application/persistence src/features/saved-examples/persistence.batch-21.test.tsx` | PASS | Batch 21：3 files / 29 tests |
| `npm.cmd run test -- src/application/examples src/features/saved-examples/saved-examples.batch-20.test.tsx` | PASS | Batch 20：2 files / 25 tests |
| `npm.cmd run test:architecture` | PASS | Architecture import boundaries verified |
| `npm.cmd run build` | PASS | Tile assets、TypeScript、Vite/PWA；规则 81/78/3、6 sources |
| `npm.cmd run test -- src/application/encyclopedia src/pages/encyclopedia src/test/rule-cases/common-simple/structure-rule-cases.test.ts src/content/rules/common-simple/rule-package.test.ts` | PASS | M8：6 files / 31 tests |
| `npm.cmd run test -- --config vitest.encyclopedia.config.ts` | PASS | 1 file / 2 tests；实际 dist 与正式源数据比较 |
| `node scripts/run-e2e.mjs --workers=2` | PASS | 52/52；Chromium 26/26、WebKit 26/26；其中 Batch 21 场景各 8 项 |
| `node scripts/run-e2e.mjs e2e/persistence-batch-21.spec.ts e2e/saved-examples.spec.ts --grep 'T912\|T913\|IndexedDB unavailable' --workers=2` | PASS | 独立并发/故障专项 12/12；两浏览器各 6 项。实际 shell 参数为不带反斜线的 `T912|T913|IndexedDB unavailable` |
| `git diff --check` | PASS | 无空白错误 |

### 回归与失败处理记录

- 首先重跑原失败类别 8 项，全部 PASS；新增安全断言后再次进行全量和独立专项，最终如上，不以旧结果代替新验收。
- takeover 原竞态和迟到异步 read 的二次获取修复有确定性测试；迟到旧 write 被事务拒绝。
- Temporary Mode 原失败为 UI 保存入口语义与旧断言不符，改为验证无正式保存入口，未删除计算/提示/原记录不变断言；另补齐非 Draft 存储故障的状态同步。
- 首轮全量 E2E 46/50：旧 Batch 19 测试刷新后未处理 T910 启动选择；Batch 12 的全局 `role=status` 定位被新增持久状态提示变为多义。更新测试显式继续草稿并限定 Calculator 编辑区，保留原内容和导航断言；最终 52/52。
- 开发中格式和一处重复 import lint 问题已修复，最终重跑通过；没有隐藏中间失败、跳过测试、增加重试次数或放宽数据保护。
- 规则 hash 不变；百科 bundle revision 仍为 `a105d525f540c182c09abbc57e590d3bbfa3d5902c1aaaa2796443425e1b360b`。81 项番型、5 个示例/Rule Cases、6 个来源的 M8 源码及构建产物检查通过。
- Batch 20 三层结果/revision roundtrip、实际层合法性、CAS 更新、重名新 ID、只读/编辑/另存/放弃回归通过；原 Saved 格式保持可读。

## 5. 修改/新增文件

新增代码和测试：

```text
src/application/persistence/persistence-models.ts
src/application/persistence/draft-repository.ts
src/application/persistence/draft-controller.ts
src/application/persistence/command-history.ts
src/application/persistence/storage-capability.ts
src/application/persistence/rule-snapshot-port.ts
src/application/persistence/historical-rule-compatibility.ts
src/application/persistence/persistence.batch-21.test.ts
src/infrastructure/db/persistence-operation.ts
src/infrastructure/db/dexie-draft-repository.ts
src/infrastructure/db/dexie-rule-snapshots.ts
src/infrastructure/db/browser-editor-signal.ts
src/infrastructure/db/browser-editor-lock.ts
src/infrastructure/db/broadcast-editor-lock.ts
src/infrastructure/db/broadcast-editor-lock.test.ts
src/schemas/persistence/batch-21-schema.ts
src/features/saved-examples/PersistencePanel.tsx
src/features/saved-examples/persistence.batch-21.test.tsx
src/pages/saved-examples/TrashExamplesPage.tsx
src/test/helpers/batch-21-fixture.ts
e2e/persistence-batch-21.spec.ts
```

修改既有代码/测试：

```text
src/app/app.css
src/app/bootstrap/calculator-bootstrap.ts
src/app/routes/AppRoutes.tsx
src/application/calculator/calculator-store.ts
src/application/calculator/replace-calculator.ts
src/application/examples/saved-example-repository.ts
src/application/examples/saved-example-service.ts
src/infrastructure/db/mahjong-database.ts
src/infrastructure/db/dexie-saved-example-repository.ts
src/pages/calculator/CalculatorPage.tsx
src/pages/saved-examples/SavedExampleDetailPage.tsx
src/pages/saved-examples/SavedExamplesPage.tsx
e2e/app-shell.spec.ts
e2e/saved-examples.spec.ts
```

文档与证据：

```text
docs/planning/tasks.md (仅 T908～T914 状态)
docs/verification/m9/batch-21.md
docs/verification/m9/T912.md
docs/verification/m9/T913.md
docs/verification/m9/screenshots/T912-chromium-broadcast.png
docs/verification/m9/screenshots/T912-chromium-fallback.png
docs/verification/m9/screenshots/T912-webkit-broadcast.png
docs/verification/m9/screenshots/T912-webkit-fallback.png
docs/verification/m9/screenshots/T913-chromium-quota.png
docs/verification/m9/screenshots/T913-webkit-quota.png
```

既有 M5 / Batch 20 截图在运行后恢复为本轮运行前备份，避免带入无关图片差异；保留父目录 `02_Document/20260803.docx` 的用户原有修改，未触碰该文件。

## 6. 数据安全、范围和已知限制

- 数据库 store/index/version 不变；本批首次启用原空表中的 Draft/Trash/RuleSnapshot。旧 Saved 无规则快照仍可读；未知/高版本/损坏数据保留并拒绝解析，不伪造 Migration。
- Saved 与 RuleSnapshot 原子写入；Trash 跨表移动原子；原记录 CAS 防止覆盖他人更新。永久删除仅删除已确认 Trash 记录，不做提前 Snapshot GC。
- 保存资格仍绑定当前 revision、当前文档和实际规则层；Fan Adjustment 不能改变基础合法性；Temporary Mode/非主编辑器不能绕过保存资格。
- 没有新增依赖、后端、网络服务、账号或遥测；未修改 Domain、Engine、RulePackage 规则事实、冻结 Baseline、Spec、Rule Spec；没有按固定 ruleId 编写分支。
- T915～T919、Migration、Backup/Import/Export、M10、正式 PWA Offline 均未实现。保存状态机、容量显示和完整 Replace Guard 持久 Port 集成不能以本批基础能力冒充完成。
- 自动保存为 best effort；系统强杀、进程冻结等不可捕获退出不保证最后一次输入落盘。历史持久数据不会因此被静默删除。
- 多标签保障覆盖 [T912 的实际能力矩阵](T912.md)；当 IndexedDB、Web Locks、BroadcastChannel 同时全部不可用时无协调介质，仅隔离临时计算且停止持久化，不承诺该极端组合的跨标签唯一编辑器。
- 未执行 GitHub 托管 CI、微信/移动真机、真实磁盘耗尽、真实进程强杀、历史数据库 Migration、M10 导入导出或 M11 断网验收；不将这些计入 PASS。
- 既有 Vite native loader 提示、>500kB chunk 提示、PWA inlineDynamicImports 弃用及 NO_COLOR/FORCE_COLOR 提示仍在；必需命令成功、页面 console 检查通过。最终主 JS 约 682.73kB / gzip 202.19kB，不为本批扩大依赖或打包重构范围。

## 7. 最终结论

```text
T908～T914 = DONE
Batch 21 = PASS
M9 Gate = IN PROGRESS
T915～T919 = TODO
下一推荐 Batch = Batch 21A / T915～T919
是否可以继续 = YES（等待确认，不自动执行）
```

未 commit、未 push；未开始 Batch 21A；未创建最终 M9 Gate PASS。
