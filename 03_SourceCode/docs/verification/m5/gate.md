# M5 Gate 验证记录

## 1. 基本信息

- 验证日期：2026-08-13
- Milestone：M5 — Calculator Input UI
- 完成批次：Batch 11、Batch 12、Batch 13、Batch 13A
- 分支：`m5-calculator-input`
- 验证基准提交：`c18fb8ce939e0d6d806f0d3447137d6c0e71e579`
- 执行人：Codex
- Active Requirements Baseline：`docs/product/requirements-baseline-v1.2.md`
- Rule Spec：`docs/rules/common-simple/rule-spec-v1.0.md`
- App / Engine Version：`0.0.0 / 0.0.0`
- Rule：`common-simple@1.0.0`
- RulePackage content hash：`834409f59b957d0611808c3b21cddde8f8da952187f770cd7b5e85b5adc1569d`
- 验证环境：Windows / PowerShell / Node.js `v24.12.0` / npm `11.6.2` / Chromium / WebKit

> 本记录验证当前未提交工作树相对于上述基准提交的 M5 变更。按本轮要求未执行 commit 或 push；Batch 13 的 GitHub Actions 由项目方确认已通过，Batch 13A 当前未提交内容尚未执行 GitHub 托管 CI。

## 2. Task 最终状态

| Task | 状态 | 验证摘要 |
|---|---|---|
| T501 | PASS / DONE | Calculator 响应式单页与桌面布局通过组件测试和双浏览器 E2E |
| T502 | PASS / DONE | 顶部规则栏持续显示当前规则、版本与状态入口 |
| T503 | PASS / DONE | TilePalette 按当前 TileSetDefinition 动态生成，不固定 34 种牌 |
| T504 | PASS / DONE | 全局牌数角标与禁用复用 Domain 计数约束 |
| T505 | PASS / DONE | 暗手牌按录入顺序添加、撤回且不静默更改 |
| T506 | PASS / DONE | 一键整理仅改变视图排序，不覆盖 HandSnapshot 原序 |
| T507 | PASS / DONE | 胡牌张保持独立单选，支持替换与撤销 |
| T508 | PASS / DONE | 14 张已和仅推荐最后录入牌，须由用户明确确认 |
| T509 | PASS / DONE | 吃牌临时录入、连续校验、退出三分支及正式 Hand 隔离通过 |
| T510 | PASS / DONE | 碰牌临时录入、牌数上限、提交复位及正式 Hand 隔离通过 |
| T511 | PASS / DONE | 明杠/暗杠按 openKongPolicy 录入 direct/added，不按 ruleId 分支 |
| T512 | PASS / DONE | 花牌仅在规则支持时出现，独立于普通结构 |
| T513 | PASS / DONE | 暗手、副露、胡牌张和花牌按正式语义分组展示 |
| T514 | PASS / DONE | 副露整组编辑、删除与撤销不产生残缺副露 |
| T515 | PASS / DONE | WinContextPanel 按 ContextDefinition 动态展示和清理互斥项 |
| T516 | PASS / DONE | 缺失必填上下文时返回 incomplete-context，不输出正式结果 |
| T517 | PASS / DONE | 结构张数由 HandModelDefinition 计算并排除花牌 |
| T518 | PASS / DONE | 悬浮操作条覆盖不足、可分析、分析中与结果状态 |
| T519 | PASS / DONE | 待修正问题可定位、解释且阻断正式分析 |
| T520 | PASS / DONE | 六类替换原因共享 Replace Guard；Draft 保护、确认、取消与失败路径通过 |
| T521 | PASS / DONE | Modal、详情、模块历史与浏览器返回优先级有 Application 测试；Calculator Store 和滚动位置跨模块保持通过 E2E |
| T522 | PASS / DONE | New Hand 保留偏好/规则；Rule Switch 三路径、撤销、临时调整清理通过 |
| T523 | PASS / DONE | Rule Picker 数据驱动支持分组、名称/别名搜索、最近使用和状态权限 |
| T524 | PASS / DONE | 首次引导不阻塞且可从 Settings 重播；TESTING 按结果影响版本确认并保留输出身份 |
| T525 | PASS / DONE | Tile Asset Manifest 完整、构建守卫通过；Chromium/WebKit 390×844 视觉证据通过 |

## 3. 实际执行命令与结果

| 命令 | 结果 | 证据摘要 |
|---|---|---|
| `npm.cmd run format:check` | PASS | 所有匹配文件符合 Prettier；首次发现 2 个本轮文件格式差异，机械格式化后复核通过 |
| `npm.cmd run lint` | PASS | ESLint 0 error / 0 warning |
| `npm.cmd run typecheck` | PASS | TypeScript project build/typecheck 通过 |
| `npm.cmd test` | PASS | 58 个测试文件、275 个测试通过 |
| `npm.cmd test -- src/application/calculator/replace-calculator.test.ts src/application/navigation/navigation-state.test.ts src/application/preferences/calculator-preferences.test.ts src/application/rules/rule-picker.test.ts src/assets/tiles/unicode/manifest.test.ts` | PASS | Batch 13A 定向：5 个测试文件、23 个测试通过 |
| `npm.cmd run test:architecture` | PASS | `Architecture import boundaries verified.` |
| `npm.cmd run build` | PASS | Tile Asset Manifest 检查通过；构建期 Rule Validation 输出 `common-simple@1.0.0 (81/78/3, 6 sources)`；Vite 与 PWA 构建完成 |
| `npm.cmd run test:e2e` | PASS | 18/18：Chromium 9/9、WebKit 9/9；覆盖 Batch 11～13A、Hash Router、导航/返回、滚动保持、Replace Guard、Rule Picker、首次引导、牌面输入与 T525 截图 |
| `git diff --check` | PASS | 无空白错误 |

## 4. M5 Gate 条件

| Gate 条件 | 结果 | 证明 |
|---|---|---|
| 用户可完整录入合法牌面 | PASS | T501～T519 单元/组件测试和 Chromium/WebKit Calculator 输入 E2E |
| 临时副露流程符合最新需求 | PASS | T509～T514 的吃/碰/明杠/暗杠/花牌临时态隔离、确认、取消、跨流程守卫和整组编辑测试 |
| UI 不自行计算番型 | PASS | Calculator 仅调用既有 Application/Domain Engine；Architecture Boundary 和范围扫描通过 |
| Rule Picker、首次引导、Replace Guard、返回键和状态保持通过 | PASS | T520～T524 定向单元测试及 Chromium/WebKit Batch 13A E2E |
| Tile Asset Manifest 与小尺寸验收通过 | PASS | `test:tile-assets`、Manifest 单元测试及 `docs/verification/m5/T525.md` 双浏览器截图/人工清单 |

## 5. 架构、规则与范围复核

- Replace Guard 位于 Application 层，六类替换入口共享同一 Guard；替换内容延迟到 Draft 保护和用户确认后才创建，取消或 Draft 失败不会修改当前 CalculatorDocument。
- New Hand 与 Rule Switch 复用 Calculator Store、RuleRepository、RulePackage、Domain 校验和既有 M4 Engine；兼容性判断来自目标 RulePackage 的 TileSetDefinition、HandModelDefinition 与 ContextDefinition，不含 `ruleId` 或 `common-simple` 特判。
- Rule Picker 从 RuleRepository catalog 元数据生成分组、搜索、最近使用及状态权限；首次引导与 TESTING 确认统一通过 Preferences Port，未提前接入 M9 localStorage Repository。
- Calculator Store 保持在 AppRuntime 生命周期内，主模块切换不销毁 CalculatorDocument；Modal 使用浏览器历史栈，Navigation State 对 Modal、详情、模块历史和自然浏览器返回保持确定优先级。
- TileCode 继续是 Domain 业务身份；Unicode Manifest 只提供 Presentation asset reference，并从 canonical `TILE_CODES` 动态生成 42 种牌面映射。
- Presentation 未重新实现结构、番型、关系、计分或合法性；Domain 未引入 React、Zustand、Zod、Dexie、浏览器 API、存储或 UI 文案。
- 未实现 M6 结果调整、听牌、保存、分享或其他后续功能；未修改冻结 Baseline、Spec 或 Rule Spec。

## 6. 已知非阻断事项

- Batch 13A 未 commit、未 push，因此 GitHub 托管 CI 尚未对本轮工作树实际执行；本地等价质量流水线与双浏览器 E2E 全部通过。
- Preferences Port 当前使用内存实现，刷新后不持久化；按 T524 正式边界，localStorage Repository 属于 M9。
- 当前内置 catalog 只有 `common-simple@1.0.0`；Rule Switch 三路径和多状态 Rule Picker 通过数据驱动 fixtures 验证，未伪造额外正式 RulePackage。
- Vite 构建继续提示未来 native config loader 需要显式导入扩展名；当前受支持构建路径成功。
- PWA 插件继续提示 `inlineDynamicImports` 已弃用；这是既有 M0 最小脚手架提示，当前构建成功。
- Playwright 输出 `NO_COLOR` 被 `FORCE_COLOR` 覆盖的环境提示；Chromium/WebKit 全部测试通过，页面 console 检查未发现 error/warning。

## 7. 最终结论

```text
T501～T525 = DONE
Batch 13A = PASS
M5 Gate = PASS
阻断项 = 0
```

可以进入 M6，但本记录不自动启动 M6。
