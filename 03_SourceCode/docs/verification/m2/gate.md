# M2 Gate 验证记录

## 1. 基本信息

- 验证日期：2026-08-11
- Milestone：M2 — Rule System
- 完成批次：Batch 05、Batch 06、Batch 06A、Batch 06B
- 分支：`m2-rule-system`
- 验证基准提交：`191a20722426bbeef82fe95abecf98d2cc791401`
- Active Requirements Baseline：`docs/product/requirements-baseline-v1.2.md`
- Rule Spec：`docs/rules/common-simple/rule-spec-v1.0.md`
- 验证环境：Windows / PowerShell / Node.js `v24.12.0` / npm `11.6.2`

> 本记录验证当前未提交工作树相对于上述基准提交的 M2 变更；未执行 commit、push 或 GitHub 托管 CI。

## 2. Task 最终状态

| Task | 状态 | 验证摘要 |
|---|---|---|
| T201 | PASS / DONE | RulePackage 顶层组合边界已建立 |
| T202 | PASS / DONE | RuleManifest 与 development/test/full 状态行为已建立 |
| T203 | PASS / DONE | TileSetDefinition 可动态表达牌集与副本上限 |
| T204 | PASS / DONE | HandModelDefinition 可动态表达结构目标 |
| T205 | PASS / DONE | ContextDefinition 可表达动态字段、显示条件与互斥 |
| T206 | PASS / DONE | PatternDefinition 与 RuleSource 可追踪且拒绝可执行数据 |
| T207 | PASS / DONE | covers/mutex/non-repeat Schema、成员与环校验通过 |
| T208 | PASS / DONE | Capability Registry 会阻断未知、类型错误与未声明能力 |
| T209 | PASS / DONE | Application port 与内置只读 Infrastructure Repository 已建立；无需 fetch 即可加载 |
| T210 | PASS / DONE | `common-simple@1.0.0` 纯数据骨架与 Rule Spec 的 144、3/3 结构、81/78/3、计分、来源一致 |
| T211 | PASS / DONE | 构建期校验及非法 fixture 阻断通过，详见 `T211.md` |
| T212 | PASS / DONE | StructureDefinition 与 unsupported structure 语义通过 |
| T213 | PASS / DONE | Scoring / Legality / TemporaryAdjustment Schema 通过 |
| T214 | PASS / DONE | RuleSource、canonical hash 与不可变版本基础通过，详见 `T214.md` |

## 3. 实际执行命令与结果

| 命令 | 结果 | 证据摘要 |
|---|---|---|
| `npm.cmd run format:check` | PASS | 全部匹配 Prettier 格式 |
| `npm.cmd run lint` | PASS | ESLint 0 error / 0 warning |
| `npm.cmd run typecheck` | PASS | TypeScript project build/typecheck 通过 |
| `npm.cmd run test` | PASS | 30 个测试文件、101 个测试通过 |
| `npm.cmd run test -- src/content/rules/common-simple/rule-package.test.ts src/infrastructure/rule-repository/built-in-rule-repository.test.ts src/infrastructure/rule-validation/build-time-rule-validator.test.ts` | PASS | Batch 06B 定向：3 个文件、13 个测试通过 |
| `npm.cmd run test:architecture` | PASS | `Architecture import boundaries verified.` |
| `npm.cmd run build` | PASS | 构建插件输出 `common-simple@1.0.0 (81/78/3, 6 sources)`，随后生产构建完成 |

## 4. M2 Gate 条件

| Gate 条件 | 结果 | 证明 |
|---|---|---|
| T201～T214 完成 | PASS | 本记录 §2；`docs/planning/tasks.md` 均为 `DONE` |
| RuleRepository 加载内置大众麻将规则 | PASS | 无网络加载、缓存同一冻结实例、manifest 列表与错误语义测试通过 |
| UI/Engine 可读取动态规则配置 | PASS | Repository 返回 typed RulePackage；测试读取 TileSet、Hand Model、Structure、Pattern 与 Scoring |
| RulePackage 完全是数据 | PASS | 严格 Schema、JSON roundtrip 与可执行字段拒绝测试通过；无 JS/eval/远程执行指令 |
| Rule Spec 一致性 | PASS | 81/78/3、144 张、3 个支持/3 个不支持结构、minimumFan、自摸、花牌、封顶和 6 个来源通过构建校验 |

## 5. 范围与架构复核

- 通用 Domain、Schema、Repository 和 Validator 不根据 `ruleId` 选择业务行为；`common-simple` 事实仅位于专属 content/adapter。
- Application 只依赖 `RuleRepository` port，不直接 fetch、读取 JSON 或访问浏览器存储。
- Domain 不依赖 React、Zustand、Zod、Dexie、浏览器 API、存储或 UI 文案；架构边界检查通过。
- 外部规则输入以 `unknown` 进入严格 Schema，再进行 relation/source/capability/hash 和跨资源一致性校验。
- 未实现 Recognizer、Relation Resolver、计分执行、和牌/听牌算法或业务 UI。
- 未修改冻结需求、Rule Spec 或 M1 Mahjong Domain 语义。

## 6. 已知非阻断事项

- `common-simple` 保持 `test` 状态。当前 Rule Corpus 只建立身份与引用骨架；78 个启用番型正反例、完整关系回归和实际 Recognizer 按正式计划在 M4 完成，未伪造为 M2 能力。
- Vite 对未来 native config loader 的显式扩展名要求发出提示；当前受支持构建路径正常，详见 `T211-build-log.md`。
- PWA 的 `inlineDynamicImports` 弃用提示来自既有 M0 最小脚手架，不属于 Batch 06B，也不阻断 M2。
- GitHub Actions 尚未对本轮未提交变更实际执行；本 Gate 采用本地等价质量命令，不能表述为托管 CI PASS。

## 7. 最终结论

```text
T201～T214 = DONE
M2 Gate = PASS
阻断项 = 0
```

可以进入下一推荐 Batch 07 / T301～T305，但本记录不自动启动 M3。
