# M10 Batch 22 — Share / Formatter / Codec

## 1. 结论与实际范围

- 最终验收日期：2026-09-20（Asia/Shanghai）。
- 分支：`m10-share-import-export`；基准 HEAD：`ca44bad19fa38ce465431baee3a8f79f1cd06e29`。本记录对应其上的未提交工作树，不表示 GitHub 已验证本批修改。
- **Batch 22：PASS；T1001～T1006：DONE；T1007：TODO；M10 Gate：IN PROGRESS。**
- 依据：[Tasks](../../planning/tasks.md)、[Architecture](../../architecture/architecture.md)、[M9 Gate](../m9/gate.md) 及项目方批准的本批范围调整。
- Tasks 推荐 Batch 22 原列 T1001～T1007；项目方正式批准本批只完成 T1001～T1006。T1007 只完成 URL 长度判断、明确降级状态与文字复制保留，不能冒充完整单牌例导出。
- T1008～T1019 的状态、依赖和验收内容未改；没有创建最终 `m10/gate.md`，没有开始下一 Batch、commit 或 push。

## 2. Task 验收矩阵

| Task | 最终状态 | 验收证据 | 结果 |
| --- | --- | --- | --- |
| T1001 | DONE | Application 纯 Formatter，简洁/详细文本；Node 无 DOM 测试；三层标签、规则版本、TESTING、调整、排除原因、Explanation；Clipboard 失败手动复制 | PASS |
| T1002 | DONE | 全部 42 个 TileCode 的唯一 Unicode 与中文牌名；暗手、独立胡牌张、吃/碰/直杠/加杠/暗杠、花牌分组 | PASS |
| T1003 | DONE | 独立分享 envelope、严格白名单；legal-win / cannot-win / ready-analysis；禁止状态、revision、RuleRef、Engine、candidate/layer/adjustment 引用校验 | PASS |
| T1004 | DONE | canonical JSON → UTF-8 → zlib-wrapped DEFLATE → Base64URL；64 组固定种子 property；资源限制、恶意输入、原生 API 双浏览器验证 | PASS |
| T1005 | DONE | 摘要展示规则/版本/status、contentType、结果层、临时规则调整、人工调整、完整牌面与警告；confirm/cancel、确认期间文档变化 | PASS |
| T1006 | DONE | 隔离预览 → 统一 Replace Guard/T916 → 输入替换；Draft 未决、取消、保护失败、状态变化、接管、原分享恢复及 Temporary Mode | PASS |
| T1007 | TODO | below/equal/above 完整 URL 边界、不截断、`single-example-fallback-required`、超限时仍能复制文字 | 前置基础 PASS，正式 SingleExampleFile fallback 未实现 |

前置依赖沿用已完成的 M9、T101、T106、T612、T916；未修改这些模型的既有语义或统一 Guard 实现。

## 3. 最终数据契约与职责

### SharePayload / ShareableCalculatorState

- 新长期 wire envelope：`format: mahjong-share`、`version: SHARE_FORMAT_VERSION`，不是 SavedExampleRecord 或 DraftRecord。
- `contentType` 仅有 `legal-win | cannot-win | ready-analysis`。
- `calculator` 显式投影：`schemaVersion / ruleRef / hand / context / temporaryRuleAdjustment / fanAdjustments`。不序列化 Saved ID、source、当前本地 revision、transient input、编辑锁、Preferences、Undo、Worker 或 UI Store。
- `rule` 保留 name/status/contentHash/engineVersion；`view` 保留 layer/candidateId。
- 复用 M9 已验证的结果事实 DTO 作为嵌套展示快照；不复用保存记录 envelope。保留三层结果、全部候选及其落点、关系排除原因、Explanation。规则展示目录仅投影被结果引用的资料，不携带无关完整目录，也不成为第二套可执行规则事实。
- Ready/Discard 保留 preset/sessionRule、primary/alternate、ordinary/ignore-winning-tile，以及 `legal / pending-context / structural-only` 原有语义；不提升 pending/structural 为正式合法。
- 旧结果 DTO 中的 `documentRevision` 在线上格式固定为 0，仅作占位；入站绝不作为本地 revision。替换后建立新的本地 revision/documentEpoch，分析状态未完成，必须重新运行本地 Engine。
- `SHARE_FORMAT_VERSION = 1` 与 `SINGLE_EXAMPLE_FORMAT_VERSION = 1` 是独立常量；数值相同不代表格式互通，`mahjong-example` 在分享 Schema 中被拒绝。
- 新格式不改 Database/Saved/Draft Schema，不需要迁移既有用户数据；未知 Share Format Version 隔离拒绝。已知格式但 Rule/Engine 不兼容只读预览，不自动切换最新 Rule Version。

### Formatter / Tile Text

- 纯 Application 函数，不读取 DOM/innerText，不重新计算规则、合法性或番数。
- Unicode 与中文名并列，字体缺字时中文仍可读；牌组不拍平。
- 简洁版展示当前层、规则版本/status、完整牌面、总计/计入与调整；详细版加入未计入原因、结构/落点、基础合法性、完整 Explanation 和来源。
- cannot-win 可以没有 selected legal candidate；展示解释候选的 fallback 不改变 Engine 枚举、不把不同候选合并。
- 当前复制格式默认值复用 Preferences Port，只读，不在分享过程中写偏好。

## 4. 分享资格、引用与外部信任边界

- 正式出站必须是当前已完成分析，`analysisRevision === document.revision` 且 `analysisDocument === document`；transient/correction/Engine Error/Quick Calc/running/stale 均拒绝。
- 即使查看 preset，也不能绕过实际规则层的 incomplete-context 禁止条件。
- contentType 根据当前计算结果生成，不接受调用者指定；签发 Payload 与捕获的 CalculatorState 绑定。伪造/重新解析得到的未签发 DTO 不能绕过 Application `encode`。
- 摘要确认前及异步压缩结束后再次检查同一状态身份；等待期间牌面或展示层改变，拒绝旧请求。
- cannot-win 的空 candidate 合法；任何非空 ID 必须属于该结果层。RuleRef、Engine、显示层、highest IDs、调整 baseLayer/baseLegality 和候选引用均检查。
- 最终补充：`user-adjusted` 展示 candidateId 必须等于 User Adjustment 所属 candidateId；不能显示另一候选的牌型并搭配本候选调整总数。已有永久回归测试；未改 Engine、既有结果模型或冻结规则。
- Schema/compatibility 通过并不意味着外部声称的分数可信。外部 Result Snapshot 始终标明“分享者提供的历史/展示事实”，不直接进入本地已完成分析；本地正式结果只能由既有 Engine 重新计算。

## 5. Codec、安全限制与能力降级

出站：资格 → 显式 DTO → Schema → canonical JSON → UTF-8 → DEFLATE → Base64URL。

入站：完整 URL/编码长度限制 → Base64URL 校验 → 有界解压 → 严格 UTF-8/JSON unknown → 资源遍历/Schema → compatibility → 隔离预览 → Replace Guard → replace。

- 原生 `CompressionStream('deflate')` / `DecompressionStream('deflate')` 固定 RFC1950 zlib 包装；不是 gzip 或 raw-deflate。没有第三方压缩依赖、静默替代格式或远程压缩服务。
- 缺少压缩 API 返回明确 capability 状态；缺少解压 API 提示 `SHARE_DECOMPRESSION_UNAVAILABLE`；不会伪造成功。
- canonical object key 排序，数组顺序保留；Base64URL 无 padding，解码校验规范形式。
- 项目安全策略（**不是浏览器标准上限**）：

| 常量 | 阈值 |
| --- | --- |
| MAX_SAFE_SHARE_URL_LENGTH | 完整 URL 8,000 字符 |
| MAX_ENCODED_SHARE_LENGTH | 编码片段 8,000 字符 |
| MAX_DECOMPRESSED_SHARE_BYTES | 1,048,576 bytes |
| MAX_JSON_DEPTH | 32 |
| MAX_JSON_NODES | 100,000 |
| MAX_OBJECT_FIELDS | 单对象 256 |
| MAX_ARRAY_ITEMS | 单数组 10,000 |
| MAX_SHARE_STRING_LENGTH | 单字符串 16,384 |

- 解压逐块累计，超限取消读取；非法 UTF-8、损坏 JSON、循环/非 JSON 值、危险键、非有限/越界数值、未知字段/格式均拒绝。
- 测试含 gzip/raw-deflate、截断 zlib、错误 checksum、尾随字节、解压炸弹、深度/节点/字段/数组超限、原型污染键；没有 `JSON.parse(...) as ...`。
- 超长 URL 不截断；只返回 `single-example-fallback-required`，UI 明确正式单牌例导出尚未接入，文字复制继续可用。没有生成 `mahjong-example` 或临时 JSON 文件。
- Base64/DEFLATE 是编码/压缩，不是加密；content hash 不是签名或来源认证。

## 6. T1006 / T916 最终集成边界

1. 隔离预览不把任何外部分享数据写入 Calculator、Draft、Preferences、Saved 或其他持久层。
2. 进入现有 Replace Guard 后，允许并必须保护/flush 当前**本地** Draft，允许现有编辑锁续租；没有绕过或重写 T916。
3. 用户取消、Draft 恢复未决、存储保护失败、确认期间输入改变或 multi-tab takeover，均不替换外部输入。
4. Guard 成功后才把已验证输入替换到 Calculator；外部结果不成为本地正式分析。新输入此后按既有本地 Draft 机制保存。
5. “恢复原分享”也再次经过 compatibility 与同一 Guard；不是无保护恢复。
6. Temporary Mode 下真实录牌/计算、文字复制、可用压缩能力下的出站链接仍可用；无法可靠保护本地 Draft 时入站只能预览，不替换、不虚假保存。

## 7. 实际执行与最终结果

环境：Windows / PowerShell；Node `v24.12.0`、npm `11.6.2`、Playwright `1.62.1`；Chromium `151.0.7922.34`、WebKit `26.5`。E2E 为生产构建 `http://127.0.0.1:4173`，真实 Worker / Compression Streams / IndexedDB，2 workers、当地运行 retries=0。

以下最终验收均包含新增 User Adjustment candidate 防线；不是复用修改前的结果。

| 实际命令 | 最终结果 |
| --- | --- |
| `npm.cmd run format:check` | PASS |
| `npm.cmd run lint` | PASS，0 errors / 0 warnings |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run test` | **96 files / 498 tests PASS**，最终独立重跑 47.70s |
| `npm.cmd run test -- src/application/share src/features/share src/infrastructure/share` | **3 files / 37 tests PASS** |
| `npm.cmd run test -- src/infrastructure/share/share-codec.property.test.ts` | **17 tests PASS**，包含 64 组固定种子 roundtrip/determinism 与畸形/超限/截断/解压滥用 |
| `npm.cmd run test:architecture` | PASS |
| `npm.cmd run build` | PASS；在 `test:e2e` 中再次实际执行 Tile Assets / TypeScript / Vite 构建 |
| `npm.cmd run test -- src/application/encyclopedia src/pages/encyclopedia src/test/rule-cases/common-simple/structure-rule-cases.test.ts src/content/rules/common-simple/rule-package.test.ts` | M8：**6 files / 31 tests PASS** |
| `npm.cmd run test -- --config vitest.encyclopedia.config.ts` | M8 实际构建产物：**1 file / 2 tests PASS** |
| `npm.cmd run test -- src/application/examples src/features/saved-examples/saved-examples.batch-20.test.tsx src/infrastructure/db/broadcast-editor-lock.test.ts src/application/persistence/persistence.batch-21.test.ts src/features/saved-examples/persistence.batch-21.test.tsx src/application/persistence/batch-21a.test.ts src/features/saved-examples/local-data-settings.batch-21a.test.tsx` | M9：**7 files / 96 tests PASS**；Batch 20 25、Batch 21 29、Batch 21A 42 |
| `npm.cmd run test:e2e -- --workers=2` | **80/80 PASS**，Chromium 40/40、WebKit 40/40，3.3m；包括本批分享专项 18/18 |
| `git diff --check` | PASS |

本轮一次同时运行 build/E2E/全量单测/其他检查时，64 组 Codec property 在默认 5 秒预算内超时（其余 497 项通过）。定向执行通过；结束浏览器负载后，未改代码、未增大 timeout、未减少种子/断言，独立重跑原命令得到上述 498/498 PASS。将该次资源竞争下的超时保留在记录，不冒充首次全绿。

### 双浏览器证据

- legal-win 分享摘要确认/取消、Clipboard failure → 手动复制、规则版本/TESTING/当前层。
- cannot-win、三层结果/调整、ready 与 discard 的完整真实 Worker 结果；合法/待条件/仅结构语义保留。
- 已有 Draft 隔离预览、Draft 恢复未决、Guard 取消/失败、确认期间文档变化、双标签接管、原分享恢复。
- Temporary Mode 下真实录牌与计算/复制/编码；入站保护失败时原 Draft 不变。
- 两浏览器原生编码/解码可用；分别模拟 API 缺失验证明确降级；畸形/超限/截断/解压炸弹/不兼容快照不覆盖本地数据。
- 本批各 E2E 均捕获 `pageerror` 和 console error/warning 并断言为空。
- M8 搜索/筛选/示例/deep link/Guard 及 M9 Saved、Trash、Draft、Undo、Broadcast/lease fallback/takeover、quota/IDB failure、Migration/Clear 全量回归通过。
- 截图：[Chromium 原分享恢复](screenshots/batch-22-chromium-restored.png)、[WebKit 原分享恢复](screenshots/batch-22-webkit-restored.png)。截图为辅助展示证据，安全结论来自自动断言；历史 M5/M9 截图被测试重拍后已恢复运行前字节，避免修改历史证据。

## 8. 修改文件

新增：

- `src/application/share/share-models.ts`
- `src/application/share/share-service.ts`
- `src/application/share/share.batch-22.test.ts`
- `src/application/result-text/result-text-formatter.ts`
- `src/application/result-text/tile-symbol.ts`
- `src/schemas/share/share-payload-schema.ts`
- `src/schemas/share/share-input-limits.ts`
- `src/infrastructure/share/share-codec.ts`
- `src/infrastructure/share/share-codec.property.test.ts`
- `src/features/share/ShareActions.tsx`
- `src/features/share/ShareActions.test.tsx`
- `src/features/share/ShareDialog.tsx`
- `src/features/share/SharedOriginPanel.tsx`
- `src/features/share/use-share-confirmation.tsx`
- `src/pages/share/SharePage.tsx`
- `src/test/helpers/share-fixture.ts`
- `e2e/share-batch-22.spec.ts`
- 本报告和两张 M10 截图。

修改：

- `src/app/bootstrap/calculator-bootstrap.ts`：组装 Share Service，复用 Ready Service / RuleRepository / Replace Guard。
- `src/app/routes/AppRoutes.tsx`：隔离分享路由。
- `src/pages/calculator/CalculatorPage.tsx`：复制/摘要/分享入口、Ready document 身份和原分享恢复入口。
- `src/features/analysis-result/AnalysisResult.tsx`：结果操作插槽，不改变计算。
- `src/features/tile-input/tile-symbol.ts`：重导出移动到纯 Application 的既有符号映射。
- `src/schemas/persistence/saved-result-schema.ts`：仅导出现有 candidateSchema 供分享复用，不降低校验。
- `src/test/setup.ts`：window mock 仅在有 window 时设置，使纯 Node 测试不依赖 DOM。
- `docs/planning/tasks.md`：仅 T1001～T1006 状态改为 DONE。

## 9. 范围、限制与下一步

- 无按特定 ruleId 的业务分支；RuleRef 相等检查是引用完整性校验，不是规则特判。
- 没有修改 Domain/Engine、RulePackage、冻结 Baseline/Spec/Rule Spec；Rule content hash 仍为 `dbbbae8810ddfb22a271d4f529e84ac107731e55df319b2e6eec6772539fd14e`，无需 Engine/Rule Version bump。
- 未新增依赖、联网服务、账号、遥测或业务后端；没有 Full Backup、SingleExampleFile、Import/Export、Share Codec 之外的未来能力或 PWA Offline/Update。
- 当前工作树原有 `02_Document/20260803.docx` 修改未触碰，不属于本批。
- 非阻断提示：Vite 未来 native config loader 扩展名提示、产物 chunk 大小提示、PWA 构建依赖 deprecation、终端 NO_COLOR/FORCE_COLOR 提示；没有将终端警告误报为浏览器 console 错误，也未隐藏它们。
- 未执行本批 GitHub 托管 CI（未 commit/push）；未以桌面 Playwright 冒充真实 iOS/Android/微信设备或 M12 全浏览器验收；未测试未实现的 T1007 正式 JSON fallback / T1008～T1019。M10 Gate 不能因此标为 PASS。
- 下一推荐：**Batch 23**，按项目方批准先完成 **T1010 正式单牌例导出 + T1007 接入真实 fallback**，验收后再标记 T1007 DONE；其余范围按最新版 Tasks 和下一轮授权。
- **是否可以继续下一 Batch：YES。** 本轮停止，不自动开始。
