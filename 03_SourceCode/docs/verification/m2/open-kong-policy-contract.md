# 明杠策略数据契约增量验证记录

## 1. 基本信息

- 验证日期：2026-08-12
- 关联 Milestone：M2 — Rule System
- 关联 Task：T204、T210、T211、T214
- 分支：`m5-calculator-input`
- 验证基准提交：`ed300e4c90627b0a25079b8fc832ff5d459f1eeb`
- Active Requirements Baseline：`docs/product/requirements-baseline-v1.2.md`
- Rule Spec：`docs/rules/common-simple/rule-spec-v1.0.md`
- 验证环境：Windows / PowerShell / Node.js `v24.12.0` / npm `11.6.2`

> 本记录只验证 Batch 12 前置架构缺口的修复；未实施 T507～T514 的 UI 或交互代码，未执行 commit、push 或 GitHub 托管 CI。

## 2. 最终数据契约

```ts
type OpenKongPolicy = Readonly<{
  distinction: "undifferentiated" | "distinguished";
  allowedKinds: readonly ("direct" | "added")[];
}>;

type HandModelDefinition = Readonly<{
  // 既有字段省略
  openKongPolicy: OpenKongPolicy;
}>;
```

Schema 约束：

- `distinction` 和每个 `allowedKinds` 值必须来自受控枚举；
- `allowedKinds` 不得重复；
- `allowedMeldTypes` 允许 `open-kong` 时，`allowedKinds` 不得为空；
- `allowedMeldTypes` 不允许 `open-kong` 时，`allowedKinds` 必须为空；
- 外部规则输入继续经过 `unknown → Zod validation → typed RulePackage`，规则包不包含 JS、`eval` 或远程可执行代码。

`common-simple@1.0.0` 的配置为：

```ts
openKongPolicy: {
  distinction: "undifferentiated",
  allowedKinds: ["direct", "added"],
}
```

该配置允许直接明杠和加杠，不要求用户额外手动选择；录入流程仍可确定并保存实际 `OpenKongMeld.openKind`。

## 3. Content Hash

- 变更前：`f3325572e156585de7fcf5ce17041644886b6ca0cdc37ff40ad9931a45307cb8`
- 变更后：`834409f59b957d0611808c3b21cddde8f8da952187f770cd7b5e85b5adc1569d`

新摘要由 canonical RulePackage payload 实际计算产生；`rule-package.test.ts` 验证 manifest 摘要与计算值一致。Rule ID、Rule Version、Rule Spec 规则事实和 81/78/3 目录均未改变。

## 4. 实际验证结果

| 范围 / 命令 | 结果 | 证据摘要 |
|---|---|---|
| M2 定向：`npm.cmd run test -- src/domain/rules src/schemas/rule-package src/infrastructure/content-integrity src/infrastructure/rule-repository src/infrastructure/rule-validation src/content/rules/common-simple/rule-package.test.ts` | PASS | 14 个测试文件、60 个测试通过；非法空 `allowedKinds` fixture 被 Build-time Rule Validator 阻断 |
| M3 定向：`npm.cmd run test -- src/domain/engine/structure src/test/rule-cases/common-simple/structure-rule-cases.test.ts` | PASS | 6 个测试文件、43 个测试通过 |
| M4 定向：`npm.cmd run test -- src/domain/engine/evaluation src/domain/engine/explanation src/domain/engine/legality src/domain/engine/pattern src/domain/engine/relation src/domain/engine/scoring src/content/rules/common-simple/pattern-recognizers.test.ts src/test/rule-cases/common-simple/pattern-score-rule-cases.test.ts` | PASS | 10 个测试文件、60 个测试通过 |
| `npm.cmd run format:check` | PASS | 所有文件符合 Prettier |
| `npm.cmd run lint` | PASS | ESLint 0 error / 0 warning |
| `npm.cmd run typecheck` | PASS | TypeScript project build/typecheck 通过 |
| `npm.cmd run test` | PASS | 49 个测试文件、223 个测试通过 |
| `npm.cmd run test:architecture` | PASS | `Architecture import boundaries verified.` |
| `npm.cmd run build` | PASS | 构建期规则校验输出 `common-simple@1.0.0 (81/78/3, 6 sources)`，生产构建和 M0 PWA 骨架构建完成 |

## 5. 范围与结论

- 未新增 `ruleId` 业务条件分支；通用 Domain / Schema 只读取策略数据。
- 未修改 Baseline、Spec 或 Rule Spec 的既有需求与规则事实。
- 未实现 Batch 12 的临时副露录入、展示、编辑或删除交互。
- 构建仍有既存 Vite native config loader 扩展名提示和 PWA `inlineDynamicImports` 弃用提示，均未由本契约变更引入且不阻断当前验证。

```text
明杠策略数据契约 = PASS
T511 / T514 架构阻断 = 已解除
可以重新执行 Batch 12 = YES
```
