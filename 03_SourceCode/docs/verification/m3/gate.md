# M3 Gate 验证记录

## 1. 基本信息

- 验证日期：2026-08-12
- Milestone：M3 — Structure Engine
- 完成批次：Batch 07、Batch 08
- 分支：`m3-structure-engine`
- 验证基准提交：`08b36e80a0dfc112d40c2f65aa2882502550ae67`
- 执行人：Codex
- Active Requirements Baseline：`docs/product/requirements-baseline-v1.2.md`
- Rule Spec：`docs/rules/common-simple/rule-spec-v1.0.md`
- App Version：`0.0.0`
- Engine Version：`0.0.0`
- Rule：`common-simple@1.0.0`
- RulePackage content hash：`bde864eedfa5b00b1c5e48e4a4dbc39e8805c9213fb1b0dc79bb10a2fdc09374`
- Database / Backup / Share / Single Example Schema Version：`1 / 1 / 1 / 1`
- 验证环境：Windows / PowerShell / Node.js `v24.12.0` / npm `11.6.2`

> 本记录验证当前未提交工作树相对于上述基准提交的 M3 变更。按本轮要求未执行 commit、push 或 GitHub 托管 CI；所有本地等价质量命令均已实际执行。

## 2. Task 最终状态

| Task | 状态 | 验证摘要 |
|---|---|---|
| T301 | PASS / DONE | 稳定 Tile Count 索引与无损计数转换测试通过 |
| T302 | PASS / DONE | 标准结构 DFS 返回全部合法拆分，不在首解停止 |
| T303 | PASS / DONE | Memoization 与无缓存结果一致，重复状态搜索量下降 |
| T304 | PASS / DONE | 标准结构 canonical key 与确定性去重测试通过 |
| T305 | PASS / DONE | 吃、碰、明杠、暗杠作为固定副露进入结构结果 |
| T306 | PASS / DONE | 七对按 StructureDefinition 参数识别；正例、反例、四张解释、副露非法均通过 |
| T307 | PASS / DONE | 十三幺所需牌集和重复数量由 StructureDefinition 驱动；正反例与副露非法均通过 |
| T308 | PASS / DONE | 所有启用结构均参与枚举；同牌面标准结构与七对同时返回，无结构优先级短路 |
| T309 | PASS / DONE | 将、顺子各位置、刻子、七对及十三幺落点完整枚举，并按实际语义确定性去重 |
| T310 | PASS / DONE | 12 个 `common-simple@1.0.0` 结构标准牌例已登记并由 Vitest 批量执行 |

## 3. 实际执行命令与结果

| 命令 | 结果 | 证据摘要 |
|---|---|---|
| `npm.cmd run format:check` | PASS | 全部匹配 Prettier 格式 |
| `npm.cmd run lint` | PASS | ESLint 0 error / 0 warning |
| `npm.cmd run typecheck` | PASS | TypeScript project build/typecheck 通过 |
| `npm.cmd test` | PASS | 36 个测试文件、145 个测试通过 |
| `npm.cmd test -- --run src/domain/engine/structure/tile-count.test.ts src/domain/engine/structure/standard-decomposition.test.ts src/domain/engine/structure/special-decomposition.test.ts src/domain/engine/structure/structure-engine.test.ts src/domain/engine/structure/winning-tile-placement.test.ts src/test/rule-cases/common-simple/structure-rule-cases.test.ts src/schemas/rule-package/structure-definition-schema.test.ts src/content/rules/common-simple/rule-package.test.ts` | PASS | M3 定向：8 个测试文件、51 个测试通过 |
| `npm.cmd run test:architecture` | PASS | `Architecture import boundaries verified.` |
| `npm.cmd run build` | PASS | 构建期 Rule Validation 输出 `common-simple@1.0.0 (81/78/3, 6 sources)`；Vite 与 PWA 构建完成 |

## 4. M3 Gate 条件

| Gate 条件 | 结果 | 证明 |
|---|---|---|
| T301～T310 完成 | PASS | 本记录 §2；`docs/planning/tasks.md` 均为 `DONE` |
| 所有结构测试通过 | PASS | 全量 145 项与 M3 定向 51 项测试全部通过 |
| 多拆分不会漏解 | PASS | DFS 枚举全部分支；memoization/无缓存结果一致；多解牌例同时保留刻子与顺子拆分；canonical dedup 只移除等价结果 |
| 多结构不会首个成功即停止 | PASS | StructureDefinition 中所有启用且能力可用的结构均被遍历；标准结构与七对同牌面同时返回 |
| Winning Tile Placement 可供番型识别使用 | PASS | 输出为独立的 typed candidate；将、顺子三种位置、刻子和特殊结构落点测试通过；等价结果确定性去重 |
| 首批 Structure Rule Test Corpus 可在 CI 批量执行 | PASS | 12 个带 Rule ID、Rule Version、来源、输入与预期的牌例进入默认 `npm test`；根 CI 工作流执行该命令 |

## 5. 数据驱动与架构复核

- 标准结构目标数量继续由 `HandModelDefinition` 驱动；通用引擎没有固定 13/14 张或 4 副露业务条件。
- 七对的对子数量与四张相同牌解释、十三幺的所需牌集与重复数量均来自经过严格 Schema 验证的 `StructureDefinition.parameters`。
- Engine 只执行可信 App 内置 capability；RulePackage 仍为纯数据，不包含 JavaScript、`eval`、表达式解释器、远程代码或网络指令。
- 通用 Structure Engine 没有 `ruleId` 或 `common-simple` 条件分支；`common-simple` 的结构事实只位于专属 content 与规则测试语料。
- Domain 不依赖 React、Zustand、Zod、Dexie、浏览器 API、存储或 UI 文案；Architecture Boundary 实际通过。
- 未实现 Pattern Recognizer、番型关系、计分、合法性番数门槛、听牌、弃牌分析或业务 UI。
- RulePackage content hash 随新增的冻结结构参数转录而更新；Rule ID、Rule Version 与 Rule Spec 行为事实未改变，构建期完整性校验通过。

## 6. 已知非阻断事项

- GitHub 托管 CI 尚未对本轮未提交变更执行；按要求未 commit、未 push。Structure Corpus 已接入默认 `npm test`，本地等价流水线已通过。
- Vite 继续提示未来 native config loader 需要显式导入扩展名；当前受支持构建路径正常。
- PWA 插件继续提示 `inlineDynamicImports` 已弃用；这是既有 M0 最小脚手架提示，当前构建成功。
- 未执行浏览器 E2E；Batch 08 只修改 Domain、Rule Schema/content 与测试语料，不改变 UI 或浏览器行为，正式 Task 未要求 E2E。
- `common-simple@1.0.0` 仍为 `test` 状态；正式番型识别、关系与计分属于后续 Milestone，本轮未提前实现。

## 7. 最终结论

```text
T301～T310 = DONE
Batch 08 = PASS
M3 Gate = PASS
阻断项 = 0
```

可以进入下一推荐 Batch 09 / T401～T405，但本记录不自动启动 M4。
