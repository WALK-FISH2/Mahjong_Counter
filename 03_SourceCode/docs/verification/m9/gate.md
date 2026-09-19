# M9 — Persistence Gate

## 1. 结论、范围与环境

- 验收日期：2026-09-18（Asia/Shanghai）。分支：`m9-persistence`。
- 基准 HEAD：`fe5853a500f27a1674ef131dd865869719f5cfd8`；本报告针对其上的本次未提交工作树。
- **Batch 21A：PASS；T901～T919：DONE；M9 Gate：PASS。**
- 本轮只续作 T915～T919，并回归已完成的 M8、Batch 20/21；没有回滚原实现，没有进入 M10，没有 commit / push。
- 当前任务依据：[Tasks](../../planning/tasks.md)。前置证据：[M8 Gate](../m8/gate.md)、[Batch 20](batch-20.md)、[Batch 21](batch-21.md)、[T912](T912.md)、[T913](T913.md)。旧报告描述各自验收时版本，不是当前版本声明。
- App / Engine：`0.0.0`；**DATABASE_SCHEMA_VERSION：2**；**SAVED_EXAMPLE_SCHEMA_VERSION：1**；Calculator / Draft / RuleSnapshot DTO 既有格式不变。
- Rule：`common-simple@1.0.0`；content hash：`dbbbae8810ddfb22a271d4f529e84ac107731e55df319b2e6eec6772539fd14e`，未修改。
- Windows / PowerShell；Node `v24.12.0`、npm `11.6.2`、Playwright `1.62.1`。
- Chromium `151.0.7922.34`、WebKit `26.5`；E2E 使用生产构建 `http://127.0.0.1:4173`、真实 IndexedDB。单元测试的 fake-indexeddb 不冒充浏览器证据。
- 本工作树尚未执行 GitHub 托管 CI；以下为本地实际执行结果。前序批次的 CI PASS 不替代本批托管验证。

## 2. T901～T919 最终复核

| Task | 状态 | 当前证明 | 结论 |
| --- | --- | --- | --- |
| T901 | DONE | 同一个 Dexie Database；savedExamples / trashExamples / draft / ruleSnapshots / rulePackageMetadata / migrationBackups 六表；启动迁移后 open/close/reopen | PASS |
| T902 | DONE | Calculator → typed DTO → IndexedDB → Schema → restore；三层结果、revision、调整、全部拆分/落点 roundtrip 回归 | PASS |
| T903 | DONE | 默认名称复用规则及番型正式数据，排除普通附加项；Batch 20 回归 | PASS |
| T904 | DONE | 当前 revision / 实际规则层保存资格；重名新 ID；非法、stale、Quick Calc、Ready 不正式保存 | PASS |
| T905 | DONE | 只读列表、排序、筛选、搜索；损坏记录保留；双浏览器回归 | PASS |
| T906 | DONE | 保存时结果只读；编辑副本经过 Replace Guard；异步期间状态变化不能覆盖输入 | PASS |
| T907 | DONE | 显式更新 / 另存 / 放弃，expected-record CAS 拒绝并发覆盖；Batch 20 回归 | PASS |
| T908 | DONE | Trash / Restore 事务、modifiedAt 不变；永久删除确认，无过期删除 | PASS |
| T909 | DONE | 唯一 current Draft，500ms debounce、可捕获事件尽力保存；临时录入、规则调整、编辑来源不丢失 | PASS |
| T910 | DONE | 启动明确继续 / 新建；真实刷新恢复，不静默替换 | PASS |
| T911 | DONE | 当前会话 Undo/Redo；恢复与整体替换正确重置历史；不做 Event Sourcing | PASS |
| T912 | DONE | 全量双浏览器重跑 takeover、旧主只读、迟到写入 fence、无 BroadcastChannel fallback 与 lease expiration；详见 T912 历史时序证据 | PASS |
| T913 | DONE | IDB / Quota failure 明确 Temporary Mode；本轮新增真实手动录牌后 Engine 计算的双浏览器回归；不虚假保存 | PASS |
| T914 | DONE | 历史结果优先只读展示、准确旧 RuleRef/hash、MinimalRuleSnapshot、不可兼容只读；不自动换新版本或执行历史 JS | PASS |
| T915 | DONE | 统一版本化 Preferences Port，严格 Schema、安全默认值、损坏提示、旧偏好迁移；Settings / 引导 / Rule Picker 使用同源偏好 | PASS |
| T916 | DONE | 六类替换入口及 Engine Error 使用真实 Draft 保护与会话 History；保护失败或输入变化不替换；刷新恢复 | PASS |
| T917 | DONE | Application SAVED / MODIFIED_AFTER_SAVE；modifiedAt 允许写入及禁止写入矩阵；近似容量，无数量上限 | PASS |
| T918 | DONE | 启动真实迁移、预备份、多版本路径、事务 rollback、只读保留；独立证据 [T918](T918.md) | PASS |
| T919 | DONE | 明确删除范围、双确认、BackupExportPort 失败不清除、事务 fence、成功后安全默认值；独立证据 [T919](T919.md) | PASS |

### 正式 M9 Gate 对照

| Tasks Gate 条件 | 证据 | 结果 |
| --- | --- | --- |
| T901～T919 完成 | 上表、三个 Batch 证据、本轮最终回归 | PASS |
| 保存/恢复/编辑/Trash/Draft 全部通过 | Batch 20 25 项、Batch 21 29 项，及对应真实 IndexedDB E2E | PASS |
| 多标签保护可用 | Chromium / WebKit 双 Tab、takeover、lease、迟到写入拒绝 | PASS |
| Storage failure 不虚假保存成功 | IDB 不可用 / quota 注入、Temporary Mode 手动录牌计算、失败记录不变 | PASS |
| Preferences、Replace Guard 持久化、Saved 状态机、Migration 与清除全部数据通过 | Batch 21A 42 项、每浏览器 5 项新 E2E、T918 / T919 故障矩阵 | PASS |

## 3. 最终设计与数据安全

### Preferences

- Application 统一定义 Preferences Port / 安全默认值；Infrastructure 只在 `mahjong.preferences` 保存轻量偏好，Schema 为版本化白名单。
- 当前 envelope v2 支持已定义的 v1 偏好升级；theme、motion、RuleRef/recentRules、排序、默认复制格式、更新偏好、PWA 提示、引导与测试规则确认走同一来源。
- 不写牌面、Draft、Saved Example、结果或 Undo。`RuleRef` 仅提取 ruleId / ruleVersion，不能误存整个 RuleManifest。
- 损坏或未来版本保留原始字符串，使用安全默认值并提示显式恢复；不以自动写入静默覆盖坏数据。
- 更新/PWA/复制仅持有已要求的偏好，不提前实现 Update、PWA Offline 或 M10 Formatter。

### Replace Guard / Draft / Undo / Engine Recovery

- New Hand、Rule Switch、Share、Import、Encyclopedia Example、Saved Example 都先调用真实唯一 Draft 保护；Share / Import 本轮只验证现有 Port reason，没有实现正式入口功能。
- Draft 保护必须实际持久成功、持有有效编辑权且内容仍对应当前文档；等待期间换文档、失去 lease、存储失败均拒绝替换。
- Engine Error 恢复复用同一 Draft / Command History；不在 UI 私自修改牌面或重新计算规则。
- 清除、启动恢复与会话切换重置 History；刷新不恢复 Undo 历史。未承诺系统强杀时绝对保存。

### Saved 状态与 modifiedAt

- Application 服务管理 UNSAVED / SAVED / MODIFIED_AFTER_SAVE；成功保存绑定当次文档，继续修改进入 MODIFIED_AFTER_SAVE，UI 不从显示数字或对象外观猜测。
- 显式改名并保存、内容覆盖、按新规则显式覆盖才更新时间，全部经过原记录 CAS。
- 只读查看、浏览并列方案、复制/分享的只读边界及 Trash/Restore 不更新时间；没有提前实现正式 Share。
- 容量来自可用的 Storage Estimate，显示“约”或不可用，不显示伪精确值；高占用建议备份/删除，没有人为牌例数量上限。

### Migration / Clear Data

- Migration 在正式 Repository / Draft 启动前执行；旧数据预备份单独提交，升级事务比较备份基线，可信步骤全部成功后 commit，中断 rollback。
- 不可靠数据原位只读保留；高版本不降级、缺失路径不猜测，不能通过重新检测存储绕过只读保护。
- Clear Data 两次确认，列出六表及本应用偏好 key；备份失败不得清除。M9 的正式备份适配入口明确不可用，不生成虚假文件；真实 Full Backup Adapter 留给 M10。
- 清除使用当前 lease/token 事务 fence，拒绝接管后的旧标签；写入新的空 current / writeToken 防止旧 Draft 复活，重置偏好与会话。
- localStorage / IndexedDB 的可捕获失败使用回滚与补偿；没有宣称跨存储原生原子性或操作系统强杀保证。详见 T918 / T919。

## 4. 实际命令与最终结果

| 命令 | 最终结果 |
| --- | --- |
| `npm.cmd run format:check` | PASS |
| `npm.cmd run lint` | PASS，0 errors / 0 warnings |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run test` | **93 files / 461 tests PASS** |
| `npm.cmd run test -- src/application/persistence/batch-21a.test.ts src/features/saved-examples/local-data-settings.batch-21a.test.tsx` | **2 files / 42 tests PASS** |
| `npm.cmd run test -- src/application/persistence/batch-21a.test.ts -t T918` | 6 项迁移专项 PASS；其他用例按过滤跳过，已在全量执行 |
| `npm.cmd run test -- src/application/persistence/batch-21a.test.ts -t T919` | 5 项清除专项 PASS；其他用例按过滤跳过，已在全量执行 |
| `npm.cmd run test -- src/application/examples src/features/saved-examples/saved-examples.batch-20.test.tsx` | Batch 20：2 files / 25 tests PASS |
| `npm.cmd run test -- src/infrastructure/db/broadcast-editor-lock.test.ts src/application/persistence/persistence.batch-21.test.ts src/features/saved-examples/persistence.batch-21.test.tsx` | Batch 21：3 files / 29 tests PASS |
| `npm.cmd run test:architecture` | PASS，Domain / Application import boundaries |
| `npm.cmd run build` | PASS，Tile assets / TypeScript / Vite / PWA 脚手架构建 |
| `npm.cmd run test -- src/application/encyclopedia src/pages/encyclopedia src/test/rule-cases/common-simple/structure-rule-cases.test.ts src/content/rules/common-simple/rule-package.test.ts` | M8：6 files / 31 tests PASS |
| `npm.cmd run test -- --config vitest.encyclopedia.config.ts` | 实际构建产物：1 file / 2 tests PASS |
| `node scripts/run-e2e.mjs --workers=2` | **62/62 PASS：Chromium 31/31，WebKit 31/31** |
| `git diff --check` | PASS |

### 浏览器与故障覆盖

- Batch 21A 新增每浏览器 5 项：偏好持久/损坏恢复、Saved 状态/容量、双确认清除/备份失败、v1→v2 启动迁移、不可靠数据只读保留。
- 既有 Batch 20/21 全部 E2E 重新执行：保存/编辑/另存、真实 Draft 恢复、Trash、历史只读结果、双 Tab takeover、BroadcastChannel 缺失 fallback / lease expiration、Quota 注入。
- IndexedDB 不可用时，不再用会触发持久 Replace Guard 的百科示例代替录牌；真实点击选牌器输入暗手牌及独立胡牌张、补齐上下文并执行 Engine，结果可显示，正式保存暂停，两浏览器均 PASS。
- 迁移专项包含预备份读取失败、真实备份写入 quota 注入、中途更改后抛错 rollback、数据/版本不丢失、高版本/缺路径/不可解析只读。
- 清除专项包含两次取消、备份 Port 失败、成功 Port 顺序、明确不备份成功、清除事务失败、等待期间 takeover 与迟到 Draft 写入拒绝。
- E2E 的 console error/warning、pageerror 检查通过；不是仅页面加载成功。
- 新截图共 6 张，链接见 T918 / T919；既有批次截图恢复原样，未用本轮运行覆盖历史证据。

### 开发中发现并修复

- 旧偏好将 RuleManifest 当作 RuleRef：改为显式两个字段并加回归，没有放宽 Schema。
- matchMedia 缺失环境：特性检测后采用安全外观默认值，保留正常浏览器设置。
- 旧测试的 Saved 会话预期补入 Application 新状态；可访问名称定位改为明确 role/name；没有删除安全断言或增加任意 sleep。
- 迁移 backupId 只在备份事务成功后生成有效证据；Clear Data 存储异常接入统一 Temporary Mode。
- 格式、lint、类型和测试中间问题均修复后重跑，以上为最终结果；没有用先前批次 PASS 替代本轮验证。

## 5. 本轮修改/新增文件

### 修改

- `src/app/app.css`
- `src/app/bootstrap/calculator-bootstrap.ts`
- `src/app/routes/AppRoutes.tsx`
- `src/app/version/index.ts`
- `src/application/analysis-lifecycle/engine-error-recovery.ts`
- `src/application/calculator/replace-calculator.ts`
- `src/application/examples/saved-example-service.ts`
- `src/application/examples/saved-example.batch-20.test.ts`
- `src/application/persistence/draft-controller.ts`
- `src/application/persistence/storage-capability.ts`
- `src/application/preferences/calculator-preferences.ts`
- `src/features/saved-examples/PersistencePanel.tsx`
- `src/features/saved-examples/SavedExampleEditActions.tsx`
- `src/infrastructure/db/mahjong-database.ts`
- `src/pages/settings/SettingsPage.tsx`
- `e2e/saved-examples.spec.ts`
- `docs/planning/tasks.md`：仅 T915～T919 状态与 M9 Gate 勾选/证据链接。

### 新增

- `src/application/persistence/database-migration.ts`
- `src/application/persistence/local-data-management.ts`
- `src/application/persistence/batch-21a.test.ts`
- `src/infrastructure/db/dexie-migration.ts`
- `src/infrastructure/db/dexie-local-data.ts`
- `src/infrastructure/preferences/local-preferences.ts`
- `src/schemas/persistence/preferences-schema.ts`
- `src/features/saved-examples/LocalDataSettings.tsx`
- `src/features/saved-examples/local-data-settings.batch-21a.test.tsx`
- `e2e/persistence-batch-21a.spec.ts`
- `docs/verification/m9/T918.md`
- `docs/verification/m9/T919.md`
- `docs/verification/m9/gate.md`
- `docs/verification/m9/screenshots/T918-{chromium,webkit}-{migration,readonly}.png`（4 张）
- `docs/verification/m9/screenshots/T919-{chromium,webkit}.png`（2 张）

仓库另有原先的 `../02_Document/20260803.docx` 修改，本轮未处理。

## 6. 范围核对与已知限制

- Baseline、Spec、Rule Spec、Domain 语义、RulePackage 规则事实未修改；没有 ruleId 业务特判、历史 JS、eval、远程执行或新的网络服务。
- 规则校验仍为 81 个参考番型 / 78 启用 / 3 特殊结构不支持、6 sources。百科 5 examples 及构建 revision `a105d525f540c182c09abbc57e590d3bbfa3d5902c1aaaa2796443425e1b360b` 不变。
- 无新依赖；没有 M10 Full Backup / Import / Export / Share Codec、PWA Offline、Update 实现。仅保留要求的 Port 与偏好。
- 未实际执行：本工作树 GitHub Actions、真实 Full Backup 文件互操作、微信真机、物理磁盘耗尽、系统强杀/掉电。API quota 和事务错误使用明确故障注入；这些限制不冒充已验证。
- 构建的单 chunk 约 696.56 kB（gzip 206.65 kB），有既有体积提示；Vite 原生加载与 PWA `inlineDynamicImports` 弃用提示、测试颜色环境提示均为非阻断工具提示，非浏览器 console 错误。
- 不能可靠迁移时采用数据库级只读保留，暂不提供单条修复工具；不删除坏数据，不绕过安全状态。

## 7. 后续状态

- T915～T919 的代码、测试和验收全部 PASS 后才同步 `tasks.md` 为 DONE。
- M9 Gate：**PASS**。
- 是否可以进入 M10：**YES**；下一推荐批次为 **Batch 22 / T1001～T1007**，仍须项目方确认。
- 本轮没有开始 M10，没有修改任何 M10 Task 状态，没有 commit / push。
