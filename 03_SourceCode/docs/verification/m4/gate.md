# M4 Gate 验证记录

## 1. 基本信息

- 验证日期：2026-08-12
- Milestone：M4 — Pattern / Score Engine
- 完成批次：Batch 09、Batch 10
- 分支：`m4-pattern-scoring`
- 验证基准提交：`f9162595821ec7d337246a0f1a0b961c932b7cae`
- 执行人：Codex
- Active Requirements Baseline：`docs/product/requirements-baseline-v1.2.md`
- Rule Spec：`docs/rules/common-simple/rule-spec-v1.0.md`
- App Version：`0.0.0`
- Engine Version：`0.0.0`
- Rule：`common-simple@1.0.0`
- RulePackage content hash：`f3325572e156585de7fcf5ce17041644886b6ca0cdc37ff40ad9931a45307cb8`
- Database / Backup / Share / Single Example Schema Version：`1 / 1 / 1 / 1`
- 验证环境：Windows / PowerShell / Node.js `v24.12.0` / npm `11.6.2`

> 本记录验证当前未提交工作树相对于上述基准提交的 Batch 10 变更。按本轮要求未执行 commit 或 push；Batch 09 的 GitHub Actions 由项目方确认已通过，Batch 10 当前未提交内容尚未执行 GitHub 托管 CI。

## 2. Task 最终状态

| Task | 状态 | 验证摘要 |
|---|---|---|
| T401 | PASS / DONE | DerivedFacts 已覆盖结构、牌张、副露、上下文与胡牌张落点事实 |
| T402 | PASS / DONE | Pattern Recognizer Registry 按受控 recognizerKey 调用，未知能力失败关闭 |
| T403 | PASS / DONE | 78 个启用番型具备 Evidence 正例与关键反例；3 个禁用番型不注册可用 Recognizer |
| T404 | PASS / DONE | covers、mutex、non-repeat 与无番和 fallback 关系可解释且确定性解析 |
| T405 | PASS / DONE | Scoring Strategy 使用规则原生单位并按出现次数聚合 |
| T406 | PASS / DONE | cap 前后 extras、达到/未达到封顶及前后封顶项目均通过测试 |
| T407 | PASS / DONE | legal、illegal、incomplete-context 与 minimumFan / 缺失上下文测试通过 |
| T408 | PASS / DONE | 结构、番型 Evidence、关系、计分、封顶、合法性与来源形成结构化 Explanation；snapshot 通过 |
| T409 | PASS / DONE | 仅比较合法候选，保留并列最高，稳定排序且不混合不同拆分 |
| T410 | PASS / DONE | `evaluateHand` 端到端返回 legal-win、structural-win-but-illegal、not-winning、incomplete-context |
| T411 | PASS / DONE | 78×正反例、Rule Spec §12 高风险关系矩阵与 3 个 unsupported structure 均进入默认测试 |

## 3. 实际执行命令与结果

| 命令 | 结果 | 证据摘要 |
|---|---|---|
| `npm.cmd run format:check` | PASS | 全部匹配 Prettier 格式；首次检查发现新增文件未格式化，执行 `npm.cmd run format` 后复核通过 |
| `npm.cmd run lint` | PASS | ESLint 0 error / 0 warning |
| `npm.cmd run typecheck` | PASS | TypeScript project build/typecheck 通过 |
| `npm.cmd test` | PASS | 46 个测试文件、207 个测试通过 |
| `npm.cmd test -- --run src/domain/engine/scoring/cap-and-extras.test.ts src/domain/engine/legality/legality-engine.test.ts src/domain/engine/evaluation/candidate-comparison.test.ts src/domain/engine/evaluation/evaluate-hand.test.ts src/content/rules/common-simple/pattern-recognizers.test.ts src/test/rule-cases/common-simple/pattern-score-rule-cases.test.ts src/test/rule-cases/common-simple/structure-rule-cases.test.ts src/domain/engine/relation/pattern-relation-resolver.test.ts src/domain/engine/scoring/scoring-strategy.test.ts src/domain/engine/pattern/pattern-recognizer.test.ts src/domain/engine/structure/structure-engine.test.ts src/domain/engine/structure/winning-tile-placement.test.ts` | PASS | Batch 10 / M4 定向：12 个测试文件、81 个测试通过 |
| `npm.cmd run test:architecture` | PASS | `Architecture import boundaries verified.` |
| `npm.cmd run build` | PASS | 构建期 Rule Validation 输出 `common-simple@1.0.0 (81/78/3, 6 sources)`；Vite 与 PWA 构建完成 |
| `git diff --check` | PASS | 无空白错误 |

## 4. M4 Gate 条件

| Gate 条件 | 结果 | 证明 |
|---|---|---|
| T401～T411 完成 | PASS | 本记录 §2；`docs/planning/tasks.md` 均为 `DONE` |
| 固定牌例无需 UI 即可输出正确结果 | PASS | `evaluateHand` 端到端 Domain 牌例与 Structure / Pattern / Relation / Score 测试通过 |
| 结果可解释 | PASS | CalculationExplanation 结构化节点与 snapshot 测试通过；包含 RuleRef、Evidence、关系排除、分项计分、cap、合法性和 sourceRefs |
| 多拆分与并列最高通过 | PASS | 全部 Structure Decomposition / Winning Tile Placement 分别评估；高低、非法候选、并列最高和稳定选择测试通过 |
| Engine 在进入完整 UI 前稳定 | PASS | format、lint、typecheck、全量 test、定向 test、Architecture Boundary 与 production build 全部通过 |
| 78 个启用番型、关键关系和 3 个禁用结构通过 Rule Corpus | PASS | 78 个正例 + 78 个关键反例元数据与可执行测试；Rule Spec §12.4 逐行矩阵；3 个 `STRUCTURE_NOT_IMPLEMENTED` 断言通过 |

## 5. 架构、规则与范围复核

- `evaluateHand` 复用 M3 全部拆分与 Winning Tile Placement，每个候选独立执行 Recognizer → Relation → Scoring → Cap / Extra → Legality → Explanation，不在首解停止。
- 通用 Domain Engine 不含 `ruleId` / `common-simple` 业务分支；规则事实只位于 `src/content/rules/common-simple/**`。
- RulePackage 继续是纯数据，仅引用 App 内置受控 capability key；未引入 JavaScript、`eval`、表达式解释器、远程代码或网络执行。
- Pattern Recognition、Relation、Scoring、Legality 保持独立模块；Fan Adjustment 仍属于 M6，本轮未实现，也未改变基础合法性。
- minimumFan、cap、self-draw、flower 与 extras 均由 RulePackage 定义驱动；自摸/花牌不会同时作为 base pattern 与 extra 重复计分。
- Domain 不依赖 React、Zustand、Zod、Dexie、浏览器 API、存储或 UI 文案；Architecture Boundary 实际通过。
- 未实现听牌、弃牌分析、Calculator UI、M5 或后续功能；未修改 Baseline、Spec 或 Rule Spec。

## 6. 已知非阻断事项

- Batch 10 未 commit、未 push，因此 GitHub 托管 CI 尚未对本轮变更实际执行；本地等价质量流水线全部通过。
- Vite 构建继续提示未来 native config loader 需要显式导入扩展名；当前受支持构建路径成功。
- PWA 插件继续提示 `inlineDynamicImports` 已弃用；这是既有 M0 最小脚手架提示，当前构建成功。
- 未执行浏览器 E2E；Batch 10 仅修改 Domain Engine、规则测试内容与文档状态，不改变 Presentation，且正式 Task 未要求 E2E。

## 7. 最终结论

```text
T401～T411 = DONE
Batch 10 = PASS
M4 Gate = PASS
阻断项 = 0
```

可以进入下一推荐 Batch / M5，但本记录不自动启动 M5。
