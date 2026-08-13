# M6 Gate 验证记录

## 1. 基本信息

- 验证日期：2026-08-13
- Milestone：M6 — Result / Adjustment
- 完成批次：Batch 14、Batch 15、Batch 15A
- 分支：`m6-results-adjustments`
- 验证基准提交：`85fccdd8afad419fec7e78d6669799703fddcdab`
- 执行人：Codex
- Active Requirements Baseline：`docs/product/requirements-baseline-v1.2.md`
- Rule Spec：`docs/rules/common-simple/rule-spec-v1.0.md`
- App / Engine Version：`0.0.0 / 0.0.0`
- Rule：`common-simple@1.0.0`
- RulePackage content hash：`834409f59b957d0611808c3b21cddde8f8da952187f770cd7b5e85b5adc1569d`
- 验证环境：Windows / PowerShell / Node.js `v24.12.0` / npm `11.6.2` / Chromium / WebKit

> 本记录验证当前未提交工作树相对于上述基准提交的 M6 变更。按本轮要求未执行 commit 或 push；项目方已确认 Batch 15 的 GitHub Actions 通过，Batch 15A 当前未提交内容尚未执行 GitHub 托管 CI。

## 2. Task 最终状态

| Task | 状态 | 验证摘要 |
|---|---|---|
| T601 | PASS / DONE | AnalysisResult 按 Domain outcome union 渲染，不以分数猜测合法性 |
| T602 | PASS / DONE | 正式结果摘要保留最高结果、计入与未计入番型 |
| T603 | PASS / DONE | 最高拆分按候选展示并高亮胡牌张 |
| T604 | PASS / DONE | Explanation 展示结构、识别、关系、计分、合法性与来源 |
| T605 | PASS / DONE | 并列最高候选保留且可切换 |
| T606 | PASS / DONE | 临时规则 UI 只暴露 RulePackage 声明字段 |
| T607 | PASS / DONE | EffectiveRule 不修改系统 RulePackage |
| T608 | PASS / DONE | 本次规则调整触发完整重算并可改变基础合法性 |
| T609 | PASS / DONE | Fan Adjustment 仅操作已识别番型 |
| T610 | PASS / DONE | 用户可取消或强制计入已识别番型并查看关系原因 |
| T611 | PASS / DONE | 失效人工调整保留但不参与当前计分 |
| T612 | PASS / DONE | 系统预设结果、本次规则结果、用户调整结果三层清晰分离 |
| T613 | PASS / DONE | 自动测试证明 Fan Adjustment 不改变基础合法性 |
| T614 | PASS / DONE | Outcome 对应 Save / Copy / Share 权限矩阵通过 |
| T615 | PASS / DONE | Quick Calc 复用 Relation、Scoring、Extras、Legality、门槛与封顶，并输出 `unverifiedByHand = true` |
| T616 | PASS / DONE | Calculator 弱化入口、手选番型、上下文及持续未验证标识通过，不进入主导航 |
| T617 | PASS / DONE | Quick Calc 仅临时查看和复制，不提供保存、正式分享、听牌或多拆分入口 |

## 3. 实际执行命令与结果

| 命令 | 结果 | 证据摘要 |
|---|---|---|
| `npm.cmd run format:check` | PASS | 全部匹配 Prettier 格式 |
| `npm.cmd run lint` | PASS | ESLint 0 error / 0 warning |
| `npm.cmd run typecheck` | PASS | TypeScript project build/typecheck 通过 |
| `npm.cmd test` | PASS | 67 个测试文件、310 个测试通过 |
| `npm.cmd test -- src/application/calculator/quick-calc.test.ts src/features/quick-calc/QuickCalcPanel.test.tsx src/application/calculator/result-action-policy.test.ts src/domain/engine/scoring/cap-and-extras.test.ts` | PASS | Batch 15A 定向：4 个测试文件、17 个测试通过；覆盖关系、互斥、门槛、封顶、自摸、花牌、Rule Version、权限及复制 |
| `npm.cmd run test:architecture` | PASS | `Architecture import boundaries verified.` |
| `npm.cmd run build` | PASS | Tile Asset Manifest 通过；Rule Validation 输出 `common-simple@1.0.0 (81/78/3, 6 sources)`；Vite / PWA 构建成功 |
| `npm.cmd run test:e2e` | PASS | 22/22；Chromium 11/11、WebKit 11/11；Quick Calc 入口、上下文、关系排除、未验证标识、复制/手动复制降级、禁用正式操作及返回 Calculator 均通过，页面 console 无 error/warning |
| `git diff --check` | PASS | 无空白错误 |

## 4. M6 Gate 条件

| Gate 条件 | 结果 | 证明 |
|---|---|---|
| 三层结果边界清晰 | PASS | T608～T612 单元/组件/E2E；系统预设、本次规则、用户调整分别保存与展示 |
| Fan Adjustment 永远不改变合法性 | PASS | T609、T613 性质测试与全量回归 |
| 完整结果过程可解释 | PASS | T602～T605 的 Explanation、候选与关系展示测试 |
| Quick Calc 可用且未验证标识、保存/分享限制全部通过 | PASS | T615～T617 定向测试和 Chromium/WebKit E2E |

## 5. Quick Calc 边界与范围复核

- Quick Calc 输入只有当前 `RuleRef`、手选启用番型和必要 `WinContext`；规则切换后组件按 Rule ID / Rule Version 重建。
- Application 直接复用既有 Relation Resolver、Scoring Strategy、extra scoring、cap 与 Legality；未调用 Hand Structure Engine、自动 Pattern Recognizer、Wait、听牌或多拆分。
- `common-simple@1.0.0` 的 minimumFan 0、自摸 +1、花牌每次手选 +1 与默认无封顶均从 RulePackage 数据和受控 scoring capability 得出。
- Quick Calc 结果恒定携带 `unverifiedByHand: true`，界面和复制文字持续显示“用户选择，未经牌面验证”。
- 权限矩阵对 Quick Calc 固定为 Save=false、Copy=true、Share=false；界面不渲染保存牌例、正式分享、听牌或拆分入口。Clipboard 不可用时提供只读手动复制框。
- 通用实现不包含按 `ruleId` / `common-simple` 的业务分支；RulePackage 仍为纯数据，未引入脚本、`eval`、远程执行或新依赖。
- 未修改冻结 Baseline、Spec 或 Rule Spec，未进入 M7，未实现保存或分享能力。

## 6. 已知非阻断事项

- Batch 15A 未 commit、未 push，因此 GitHub 托管 CI 尚未对本轮工作树实际执行；本地完整质量流水线及 Chromium/WebKit E2E 全部通过。
- Vite 构建继续提示未来 native config loader 需要显式导入扩展名；当前受支持构建路径成功。
- PWA 插件继续提示 `inlineDynamicImports` 已弃用；这是既有 M0 最小脚手架提示，当前构建成功。
- Playwright 输出 `NO_COLOR` 被 `FORCE_COLOR` 覆盖的环境提示；双浏览器测试和页面 console 检查均通过。
- 仓库父目录的 `02_Document/20260803.docx` 存在用户原有修改，本 Batch 未触碰该文件。

## 7. 最终结论

```text
T601～T617 = DONE
Batch 15A = PASS
M6 Gate = PASS
阻断项 = 0
```

可以进入 M7，但本记录不自动启动 M7。
