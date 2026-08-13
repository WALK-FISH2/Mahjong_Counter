# M7 Gate 验证记录

## 1. 基本信息

- 验证日期：2026-08-13
- Milestone：M7 — Ready / Discard Analysis
- 完成批次：Batch 16、Batch 17、Batch 17A
- 分支：`m7-ready-analysis`
- 验证基准提交：`103fe66a8da6c75b205f4cc98a43c0f2e309737b`
- 执行人：Codex
- Active Requirements Baseline：`docs/product/requirements-baseline-v1.2.md`
- Rule Spec：`docs/rules/common-simple/rule-spec-v1.0.md`
- App / Engine Version：`0.0.0 / 0.0.0`
- Rule：`common-simple@1.0.0`
- RulePackage content hash：`834409f59b957d0611808c3b21cddde8f8da952187f770cd7b5e85b5adc1569d`
- 验证环境：Windows / PowerShell / Node.js `v24.12.0` / npm `11.6.2` / Chromium / WebKit

> 本记录验证当前未提交工作树相对于上述基准提交的 Batch 17A 变更。按本轮要求未执行 commit 或 push；项目方已确认 Batch 17 的 GitHub Actions 通过，Batch 17A 当前内容尚未执行 GitHub 托管 CI。

## 2. Task 最终状态

| Task | 状态 | 验证摘要 |
|---|---|---|
| T701 | PASS / DONE | Worker Protocol 定义 evaluate / wait / discard、requestId 与 documentRevision |
| T702 | PASS / DONE | Worker Runtime 执行正式 Engine 并返回结构化响应 |
| T703 | PASS / DONE | Worker Client 拒绝 stale response，cancel 后重建 Worker |
| T704 | PASS / DONE | Calculator Worker Evaluator 接入正式分析且取消不发布结果 |
| T705 | PASS / DONE | Wait Analysis 遍历 RulePackage 启用候选牌并复用完整 Engine |
| T706 | PASS / DONE | Discard-to-ready 按 distinct 暗手牌枚举弃牌并复用 Wait Analysis |
| T707 | PASS / DONE | Worker Session Cache 使用 Rule / Document / Operation 内容键且有界 |
| T708 | PASS / DONE | Calculator 展示当前听牌与弃牌后听牌入口，不在 UI 推断结果 |
| T709 | PASS / DONE | legal / pending-context / structural-only 分类及未计入原因可见 |
| T710 | PASS / DONE | 点炮 / 自摸双模式结果独立计算并展示差异 |
| T711 | PASS / DONE | 高番优先 / 听口优先稳定排序通过 |
| T712 | PASS / DONE | 固定普通、复杂、听牌、弃牌性能牌例和可复现基线已记录 |
| T713 | PASS / DONE | 首次正式结果后相关修改防抖重算；旧结果立即失效且 stale revision 不发布 |
| T714 | PASS / DONE | Engine Error 保留输入并通过 DraftProtectionPort / UndoPort 提供 Retry、Undo、Copy Issue Info，不输出猜测结果 |
| T715 | PASS / DONE | Legal Win 的弱化入口建立独立弃牌分析视图，正式结果保持且可返回 |

## 3. 实际执行命令与结果

| 命令 | 结果 | 证据摘要 |
|---|---|---|
| `npm.cmd run format:check` | PASS | 全部匹配 Prettier 格式 |
| `npm.cmd run lint` | PASS | ESLint 0 error / 0 warning |
| `npm.cmd run typecheck` | PASS | TypeScript project build/typecheck 通过 |
| `npm.cmd test` | PASS | 82 个测试文件、350 个测试通过 |
| `npm.cmd test -- src/application/analysis-lifecycle/analysis-lifecycle-coordinator.test.ts src/application/analysis-lifecycle/engine-error-recovery.test.ts src/application/engine-worker/engine-worker-client.test.ts src/application/ready-analysis/ready-analysis-service.test.ts src/features/analysis-result/AnalysisResult.test.tsx src/features/analysis-result/EngineErrorRecoveryPanel.test.tsx src/features/ready-analysis/ReadyAnalysisPanel.test.tsx` | PASS | Batch 17A 定向覆盖连续快速修改、防抖次数、stale / Worker error、Retry 成败、Draft / Undo / Clipboard、合法和牌有/无弃牌候选及返回正式结果 |
| `npm.cmd run test:architecture` | PASS | `Architecture import boundaries verified.` |
| `npm.cmd run test:performance:m7` | PASS | 1 个固定性能基准通过；普通和牌 p95 0.936ms、复杂拆分 1.002ms、听牌 2.548ms、弃牌分析 21.008ms |
| `npm.cmd run build` | PASS | Tile Asset Manifest 通过；Rule Validation 输出 `common-simple@1.0.0 (81/78/3, 6 sources)`；Vite / PWA 构建成功 |
| `npm.cmd run test:e2e` | PASS | 24/24；Chromium 12/12、WebKit 12/12；覆盖双模式 Ready / Discard、首次正式结果后自动重算、合法和牌独立弃牌分析及返回，页面 console 无 error/warning |
| `git diff --check` | PASS | 无空白错误 |

## 4. M7 Gate 条件

| Gate 条件 | 结果 | 证明 |
|---|---|---|
| 13 张听牌可用 | PASS | T705、T708～T711 Domain / Application / UI 测试与双浏览器 E2E |
| 14 张弃牌后听牌可用 | PASS | T706、T708～T711 完整弃牌枚举、排序、UI 与双浏览器 E2E |
| Worker stale / cancel 正确 | PASS | T701～T704、T713 的 requestId / documentRevision / cancel / stale 定向测试 |
| 不显示剩余张数或概率 | PASS | UI 单元测试、E2E 与范围审查；仅展示候选、分类、最高合法结果和听口数量 |
| 防抖自动重算通过 | PASS | T713 连续快速修改、防抖次数、旧结果失效及 stale response 测试；E2E 验证临时规则修改自动重算 |
| Engine Error 恢复通过 | PASS | T714 Worker error、Retry 成败、DraftProtectionPort、UndoPort、复制及手动复制降级测试 |
| 合法和牌继续分析通过 | PASS | T715 有/无弃牌候选、独立视图、正式结果保持与返回测试及 Chromium / WebKit E2E |

## 5. 架构与范围复核

- 自动重算由 Application `AnalysisLifecycleCoordinator` 订阅 Calculator Store；只在首次正式结果后协调胡牌张、上下文、临时规则和番型调整的 revision 变化，300ms 防抖后调用既有正式分析。
- Store 输入动作先使旧结果失效；Coordinator 同时取消旧 Worker。只有当前 `documentRevision` 的响应可再次进入正式结果，取消或 stale 响应不会误报为当前 Engine Error。
- Engine Error 恢复是 Application 服务而非 React Error Boundary：错误时正式结果为 null，DraftProtectionPort 保护当前文档，UndoPort 可恢复前一语义状态，复制内容只含版本、RuleRef、revision 和稳定错误码，不包含牌面，也没有上传行为。
- Legal Win 继续弃牌分析把独立胡牌张移入派生的只读分析 HandSnapshot，并复用既有 Worker、EffectiveRule、Discard-to-ready、Wait Analysis 与排序；原 CalculatorDocument、正式结果和用户选择不被覆盖。
- UI 只渲染 Application / Domain 输出，不推断听牌、番数或合法性；未增加 `ruleId` / `common-simple` 条件分支，未修改 RulePackage、冻结 Baseline、Spec 或 Rule Spec。
- 未进入 M8，未实现保存、分享、百科、剩余牌数或概率。

## 6. 已知非阻断事项

- Batch 17A 未 commit、未 push，因此 GitHub 托管 CI 尚未对本轮工作树实际执行；本地完整质量流水线、性能基线及 Chromium / WebKit E2E 全部通过。
- Draft 当前使用 M5 已有的内存端口；正式持久化集成按 Task 定义由 T916 验证，不阻断 T714。
- Vite 构建继续提示未来 native config loader 需要显式导入扩展名；当前受支持构建路径成功。
- PWA 插件继续提示 `inlineDynamicImports` 已弃用；这是既有工程提示，当前构建成功。
- Playwright 输出 `NO_COLOR` 被 `FORCE_COLOR` 覆盖的环境提示；双浏览器测试和页面 console 检查均通过。
- 仓库父目录的 `02_Document/20260803.docx` 存在用户原有修改，本 Batch 未触碰该文件。

## 7. 最终结论

```text
T701～T715 = DONE
Batch 17A = PASS
M7 Gate = PASS
阻断项 = 0
```

可以进入 M8，但本记录不自动启动 M8。
