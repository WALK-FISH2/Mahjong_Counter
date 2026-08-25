# M8 Gate 验证记录

## 1. 基本信息

- 验证日期：2026-08-26
- Milestone：M8 — Rule Encyclopedia
- 完成批次：Batch 18、Batch 19
- 分支：`m8-rule-encyclopedia`
- 验证基准提交：`dce9bc5589c0a76137d5a01c40769923285b320e`
- 执行人：Codex
- Active Requirements Baseline：`docs/product/requirements-baseline-v1.2.md`
- Rule Spec：`docs/rules/common-simple/rule-spec-v1.0.md`
- Rule：`common-simple@1.0.0`
- RulePackage content hash：`dbbbae8810ddfb22a271d4f529e84ac107731e55df319b2e6eec6772539fd14e`
- 核心百科 bundle revision：`a105d525f540c182c09abbc57e590d3bbfa3d5902c1aaaa2796443425e1b360b`
- 验证环境：Windows / PowerShell / Node.js `v24.12.0` / Chromium / WebKit

> 本记录验证当前未提交工作树相对于上述基准提交的 Batch 19 变更。按本轮要求未执行 commit 或 push；项目方已确认 Batch 18 的 GitHub Actions 通过，Batch 19 当前内容尚未执行 GitHub 托管 CI。

## 2. Task 最终状态

| Task | 状态 | 验证摘要 |
|---|---|---|
| T801 | PASS / DONE | 百科数据结构与 RulePackage 版本身份已建立 |
| T802 | PASS / DONE | 规则列表、状态和只读支持范围已建立 |
| T803 | PASS / DONE | 规则详情直接读取 RulePackage、来源和限制 |
| T804 | PASS / DONE | 完整番表直接读取 Engine 使用的 81 个 PatternDefinition |
| T805 | PASS / DONE | 番型详情按稳定 Pattern ref 解析条件、关系与来源 |
| T806 | PASS / DONE | 名称/别名、类别、数值、启用状态及当前 Evaluation 识别集组合筛选通过 |
| T807 | PASS / DONE | 基础、组合、包含/不重复、不能胡反例和地方特殊边界示例均引用共享 Rule Case，预期结果通过真实 Engine 复核 |
| T808 | PASS / DONE | test/full 示例经 Replace Guard 转为临时 CalculatorDocument；必要上下文填入、取消不覆盖、可恢复且不自动保存；development 保持只读 |
| T809 | PASS / DONE | 规则与番型 Hash Router Deep Link 支持直接访问、刷新和浏览器返回 |
| T810 | PASS / DONE | 版本化核心百科 bundle 与 M11 可消费的离线资源清单生成并通过完整性检查 |

## 3. 实际执行命令与结果

| 命令 | 结果 | 证据摘要 |
|---|---|---|
| `npm.cmd run format:check` | PASS | 全部匹配 Prettier 格式 |
| `npm.cmd run lint` | PASS | ESLint 0 error / 0 warning |
| `npm.cmd run typecheck` | PASS | TypeScript project build/typecheck 通过 |
| `npm.cmd run test` | PASS | 86 个测试文件、365 个测试通过 |
| `npm.cmd run test -- --run src/application/encyclopedia src/pages/encyclopedia src/test/rule-cases/common-simple/structure-rule-cases.test.ts src/content/rules/common-simple/rule-package.test.ts build/encyclopedia/core-encyclopedia-artifacts.test.ts` | PASS | Batch 19 定向：6 个测试文件、31 个测试通过 |
| `npm.cmd run test:architecture` | PASS | `Architecture import boundaries verified.` |
| `npm.cmd run build` | PASS | Tile Asset Manifest、Rule validation、TypeScript、Vite/PWA 构建通过；生成两个百科产物 |
| `node scripts/run-e2e.mjs` | PASS | 28/28；Chromium 14/14、WebKit 14/14；覆盖筛选、示例、Deep Link 刷新/返回、Replace Guard 带入及页面 console 检查 |
| `git diff --check` | PASS | 无空白错误；仅有既有工作树行尾转换提示 |

## 4. 核心百科构建产物

| 产物 | 结果 | 完整性证据 |
|---|---|---|
| `dist/encyclopedia/common-simple@1.0.0.json` | PASS | Rule Version `1.0.0`、81 个 Pattern、5 个示例定义、5 个完整 Rule Case、6 个来源 |
| `dist/encyclopedia/offline-resources.json` | PASS | 资源 URL `/encyclopedia/common-simple@1.0.0.json`；bundle revision 与资源 revision 一致 |

两个文件是 T1104 可消费的稳定构建输入。本 Gate 不声称 Service Worker 已缓存它们，也不执行断网验收。

## 5. M8 Gate 条件

| Gate 条件 | 结果 | 证明 |
|---|---|---|
| 番表与 Engine 同源 | PASS | 页面和筛选均直接使用 RuleRepository 返回的 RulePackage PatternDefinition；不存在第二套 UI 番值常量 |
| 来源/争议/限制可查看 | PASS | RulePackage sourceRefs、sourceArticles、confidence 和 knownLimitations 的单元测试及双浏览器 E2E |
| 示例可带入且不自动保存 | PASS | 共享 Rule Case、真实 M4 Evaluation、Replace Guard cancel/replace、临时 source、恢复示例及双浏览器 E2E |
| 核心百科离线 bundle 与资源清单已准备 | PASS | 构建插件、完整性测试和实际 dist 机械检查；正式缓存与断网验收保留给 T1104/M11 |

## 6. 架构与范围复核

- 百科规则事实来自既有 RulePackage、RuleRepository、PatternDefinition、关系、来源和共享 Rule Case；页面没有维护第二套番值或规则表。
- “仅看当前牌面”读取当前 SystemEvaluation 的全部候选拆分及其 relation 识别集，不在 UI 重算番型或合法性；没有当前结果时默认百科浏览不受影响。
- 示例转换由 Application 创建完整 CalculatorDocument，复制 Rule Case 的牌面、胡牌张、规则版本和必要上下文；Replace Guard 在替换前保护草稿，取消不会覆盖现有输入。
- 示例 source 明确为 `encyclopedia-example`，只进入现有 Calculator Store；未调用保存能力。Calculator 可通过同一 Guard 恢复原示例。
- Deep Link 使用稳定的 `ruleId / ruleVersion / patternId`，仍运行在既有 Hash Router；未引入本地数据依赖。
- 核心百科 bundle 只输出 JSON 纯数据和资源清单，不含 JS、eval 或远程可执行规则；M0 Service Worker 仍是脚手架，没有提前实现 M11 正式离线缓存。
- 未按 `ruleId` 在通用 Application、Domain 或 UI 编写业务条件；`common-simple` 事实只存在于专属 content 与构建组合根。
- 未进入 M9，未实现保存、分享、导入、数据库或正式 PWA Offline；未修改冻结 Baseline、Spec 或 Rule Spec。

## 7. 已知非阻断事项

- Batch 19 未 commit、未 push，因此 GitHub 托管 CI 尚未对当前工作树实际执行；本地完整质量流水线和双浏览器 E2E 全部通过。
- 正式 Service Worker 缓存与断网访问属于 T1104/M11；当前 PWA 构建显示 `precache 0 entries` 符合 T810 不提前宣称 Offline 完成的边界。
- Vite 继续提示未来 native config loader 的既有扩展名兼容提示及大于 500 kB 的单一主 chunk；当前受支持构建路径成功。
- PWA 插件继续提示 `inlineDynamicImports` 已弃用；这是既有工程提示，当前构建成功。
- Playwright 输出 `NO_COLOR` 被 `FORCE_COLOR` 覆盖的环境提示；Chromium / WebKit 测试和页面 console 检查均通过。
- E2E 运行期间按既有 T525 测试重写了两张小屏截图；本轮已将其恢复到基准版本，未把无关二进制差异纳入 Batch 19。
- 仓库父目录的 `02_Document/20260803.docx` 存在用户原有修改，本 Batch 未触碰该文件。

## 8. 最终结论

```text
T801～T810 = DONE
Batch 19 = PASS
M8 Gate = PASS
阻断项 = 0
```

可以进入 M9，但本记录不自动启动 M9。
