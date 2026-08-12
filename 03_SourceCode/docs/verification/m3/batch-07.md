# M3 Batch 07 验证记录

## 1. 基本信息

- 验证日期：2026-08-11
- Milestone：M3 — Structure Engine（IN PROGRESS）
- Batch：Batch 07 / T301～T305
- 分支：`m3-structure-engine`
- 验证基准提交：`90279c1d3c04a2c9f068dccd1788202f36d4a52e`
- Active Requirements Baseline：`docs/product/requirements-baseline-v1.2.md`
- Rule Spec：`docs/rules/common-simple/rule-spec-v1.0.md`
- App Version：`0.0.0`
- Engine Version：`0.0.0`
- 验证环境：Windows / PowerShell / Node.js `v24.12.0` / npm `11.6.2`

> 本记录只证明 Batch 07。T306～T310 尚未实施，因此不代表 M3 Gate 已通过。

## 2. Task 最终状态

| Task | 状态 | 验证摘要 |
|---|---|---|
| T301 | PASS / DONE | 42 个稳定 `TileCode` 与内部计数索引全量 roundtrip，计数展开无损，非法索引被拒绝 |
| T302 | PASS / DONE | 普通结构 DFS 覆盖单解、多解、无解；返回全部不同拆分，不在首解停止 |
| T303 | PASS / DONE | Memoization 与关闭缓存的输出完全一致，重复状态牌例的展开状态数下降 |
| T304 | PASS / DONE | canonical key 与去重会合并不同搜索顺序产生的等价组合，保留不同拆分 |
| T305 | PASS / DONE | 吃、碰、明杠、暗杠作为固定副露进入结果，不参与暗手 DFS，输入快照不被修改 |

## 3. 数据驱动与范围检查

- 普通结构目标由 `HandModelDefinition.targetStructuralTileCount` 和 `requiredMeldCount` 推导；生产实现没有写死 13/14 张或 4 副面子。
- 已声明副露上限与类型读取 `maxDeclaredMelds`、`allowedMeldTypes`；暗手顺子/刻子是 `standard-meld-pair` 能力本身的结构语义，不会把“不可声明吃牌”误解为“暗手不可成顺子”。
- 结构结果保持 `concealedMelds`、`pair`、`declaredMelds` 分离；既有 `HandSnapshot` 与 Meld 对象不会被静默重写。
- 通用 Engine 中没有 `ruleId` 条件分支；未加入 `common-simple` 专属业务常量。
- 未实现七对、十三幺、多结构调度、Winning Tile Placement、Pattern Recognizer、关系解析、计分、合法性门槛、听牌、弃牌分析或业务 UI。

## 4. 实际执行命令与最终结果

| 命令 | 结果 | 证据摘要 |
|---|---|---|
| `npm.cmd run format:check` | PASS | 全部匹配 Prettier；为兼容当前 Windows CRLF checkout，配置 `endOfLine: auto` 后复跑通过 |
| `npm.cmd run lint` | PASS | ESLint 0 error / 0 warning |
| `npm.cmd run typecheck` | PASS | TypeScript project build/typecheck 通过 |
| `npm.cmd test` | PASS | 32 个测试文件、117 个测试通过 |
| `npm.cmd test -- src/domain/engine/structure/tile-count.test.ts src/domain/engine/structure/standard-decomposition.test.ts` | PASS | Batch 07 定向：2 个文件、16 个测试通过 |
| `npm.cmd run test:architecture` | PASS | `Architecture import boundaries verified.` |
| `npm.cmd run build` | PASS | Rule Validation `common-simple@1.0.0 (81/78/3, 6 sources)` 与 Vite/PWA 构建完成 |

首次完整流水线中的 `format:check` 因当前 Windows checkout 的既有 CRLF 行尾对 76 个文件报错；没有批量改写这些无关文件，而是在 `.prettierrc.json` 设置跨平台 `endOfLine: auto`。最终复跑结果为 `PASS`。

## 5. 已知非阻断提示

- Vite 继续提示未来 native config loader 要求显式扩展名；这是 M2 已登记提示，当前构建路径正常。
- PWA 插件继续提示 `inlineDynamicImports` 已弃用；属于既有 M0 最小脚手架，当前构建成功。
- 未执行浏览器 E2E：Batch 07 只修改纯 Domain Engine，不改变浏览器或 UI 行为，正式任务未要求 E2E。
- 未执行 GitHub 托管 CI：本轮按要求不 commit、不 push；本记录只陈述本地验证。

## 6. Batch 结论

```text
T301～T305 = DONE
Batch 07 = PASS
M3 Gate = IN PROGRESS
```

下一推荐 Batch 为 Batch 08 / T306～T310；本记录不自动启动该批次。
