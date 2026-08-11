# M1 Gate 验证记录

## 1. 基本信息

- 验证日期：2026-08-11
- Milestone：M1 — Mahjong Domain Model
- Batch：Batch 03（T101～T105）+ Batch 04（T106～T110）
- 分支：`m1-domain-model`
- 验证基准提交：`64da289971573b114eb760f7fd9c487749402606`
- App Version：`0.0.0`
- Engine Version：`0.0.0`
- Database Schema Version：`1`
- 当前规则事实引用：`common-simple@1.0.0`
- Active Requirements Baseline：`docs/product/requirements-baseline-v1.2.md`
- 执行环境：Windows / PowerShell，Node.js + npm，本地工作区
- 执行方式：Codex 本地自动验证

> 本记录验证的是当前未提交工作树相对于上述基准提交的 M1 变更。M1 不生成 RulePackage；`common-simple@1.0.0` 仅作为已批准规则事实引用。

## 2. Task 最终状态

| Task | 状态 | 验证摘要 |
|---|---|---|
| T101 | PASS / DONE | 42 个稳定 `TileCode`、牌元数据、唯一性与稳定排序测试通过 |
| T102 | PASS / DONE | Chow/Pung/Open Kong/Concealed Kong 模型及构造测试通过，无多人来源字段 |
| T103 | PASS / DONE | `concealed/melds/flowers/winningTile` 严格分离，原始顺序与 JSON roundtrip 通过 |
| T104 | PASS / DONE | 临时副露状态与正式 Hand 隔离，1～2 张临时吃牌及撤回测试通过 |
| T105 | PASS / DONE | 点炮/自摸、动态上下文及 `unknown`/`false` 区分测试通过 |
| T106 | PASS / DONE | `CalculatorDocument` 可表达全部正式计算输入，完整 JSON roundtrip 与边界测试通过 |
| T107 | PASS / DONE | 跨暗手牌、副露、花牌和胡牌张的实体计数通过；杠计 4、胡牌张计入 |
| T108 | PASS / DONE | 结构张数与实体张数同时返回；杠结构计 3、花牌不计结构 |
| T109 | PASS / DONE | 动态 `enabledTiles/maxCopies`、第五张、牌区、副露结构与稳定 `reasonCode/data` 验证通过 |
| T110 | PASS / DONE | 各计算语义字段修订均递增 revision，原快照不变，安全整数上界测试通过 |

## 3. 实际执行命令与结果

| 命令 | 结果 | 证据摘要 |
|---|---|---|
| `npm.cmd test -- src/domain/mahjong/calculator-document.test.ts src/domain/mahjong/calculator-document-revision.test.ts src/domain/mahjong/hand-count.test.ts src/domain/mahjong/validation.test.ts` | PASS | Batch 04 定向：4 个文件、14 个测试通过 |
| `npm.cmd run format:check` | PASS | 最终复跑：全部匹配 Prettier 格式 |
| `npm.cmd run lint` | PASS | ESLint 0 error / 0 warning |
| `npm.cmd run typecheck` | PASS | TypeScript project build/typecheck 通过 |
| `npm.cmd test` | PASS | 全量 16 个测试文件、47 个测试通过 |
| `npm.cmd run test:architecture` | PASS | `Architecture import boundaries verified.` |
| `npm.cmd run build` | PASS | TypeScript + Vite 生产构建成功，PWA M0 脚手架构建钩子正常 |

中间修正记录：

- lint 首次发现 `validation.ts` 有一个不必要类型断言；移除后复跑通过。
- format 首次指出 `src/domain/index.ts` 格式状态不一致；格式化后复跑通过。
- 上述中间问题均已修复，最终 Gate 只采用复跑后的 `PASS` 结果。

## 4. M1 Gate 条件

| Gate 条件 | 结果 | 证明 |
|---|---|---|
| T101～T110 完成 | PASS | 本记录 §2；`docs/planning/tasks.md` 状态均为 `DONE` |
| Domain 无 React/Storage 依赖 | PASS | lint 与 `npm.cmd run test:architecture` 均通过；新增模块只依赖 Domain 内部模块 |
| 牌数测试通过 | PASS | 多区域计数、杠四张、胡牌张计入、动态最大副本数与第五张拒绝测试通过 |
| 结构张数测试通过 | PASS | 普通手牌、杠、花牌组合的结构/实体张数测试通过 |
| 临时副露测试通过 | PASS | transient chow 不进入正式 Hand，临时选择与撤回测试通过 |
| 动态规则边界未写死 | PASS | 校验从调用方接收 `enabledTiles/maxCopies`；结构计数不包含 13/14 目标常量 |

## 5. Schema、版本与范围评估

- `CalculatorDocument` 是 M1 首次建立的运行时可序列化模型；当前尚无 Saved Example、Draft、Share 或 Import 持久记录使用该模型，因此不存在旧数据迁移对象，本轮无需 Migration。
- 未改变麻将规则事实、和牌合法性、番型或计分结果，不提升 App、Engine 或 Rule Version。
- 未实现 RulePackage、TileSetDefinition、HandModelDefinition、番型识别、计分、和牌/听牌算法或业务 UI。
- Domain 硬校验只消费未来规则层提供的牌集约束投影，不拥有或修改系统规则预设。
- 所有校验只返回稳定 `reasonCode/data`，不返回 UI 文案，也不修改用户牌面。

## 6. 已知非阻断事项

- `TileSetDefinition`、`HandModelDefinition` 及正式 RulePackage 属于 M2；M1 的调用方必须显式提供 `enabledTiles/maxCopies`，目标结构张数也将在 M2 由规则定义。
- T109 在 `tasks.md` 中的 Architecture §99 追踪指针不精确；其实际行为已按 Architecture 的 Hard Validation、Domain 错误码、序列化和规则驱动边界实现。该引用精度问题不影响当前验收，也未在本轮修改正式设计。
- M1 不要求浏览器 E2E、规则牌例或托管 CI；这些验证不用于替代本记录中的 Domain Gate。

## 7. 未执行的验证

- 未执行 Playwright E2E：M1 仅修改纯 Domain，不改变页面或浏览器行为。
- 未执行 Rule Case Corpus：RulePackage、结构引擎和番型引擎尚未进入当前阶段。
- 未执行 GitHub Actions：本轮 Gate 以本地规定命令为证据，未请求 commit 或 push。

## 8. 最终结论

```text
M1 Gate = PASS
T101～T110 = DONE
阻断项 = 0
```

可以进入下一 Batch，但本记录不自动启动后续任务。
