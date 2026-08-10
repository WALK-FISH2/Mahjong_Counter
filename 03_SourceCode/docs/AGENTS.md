# AGENTS.md

> 麻将番数计算器仓库级 AI / Codex 开发约束  
> **适用对象：Codex、ChatGPT、其他 AI Agent，以及按照 AI 提示执行修改的人工开发者**

- 文档状态：已批准 / Active
- 正式文档链内容确认日期：2026-08-10
- Baseline 1.2 版本治理批准日期：2026-08-11
- 正式路径：`docs/AGENTS.md`
- 适用版本：v0.1.0 及其后续受控开发

## 1. 文件目的

本文件规定 AI Agent 在“麻将番数计算器”仓库中必须遵守的工作方式、代码边界、测试要求、文档读取顺序和变更流程。

本文件不是产品需求本身，也不能替代上游正式文档。

任何 Agent 在修改代码前，必须先理解本文件以及任务所依赖的上游文档。

---

# 2. 文档权威与读取顺序

正式文档优先级：

```text
docs/governance/constitution.md
    ↓
docs/product/spec.md
    ↓
docs/architecture/architecture.md
    ↓
docs/planning/plan.md
    ↓
docs/planning/tasks.md
    ↓
docs/AGENTS.md
```

同时：

- `docs/product/requirements-baseline-v1.2.md` 是当前批准需求的事实总账；
- `docs/product/requirements-audit.md` 是需求一致性审查记录；
- `docs/rules/common-simple/rule-spec-v1.0.md` 是 `common-simple@1.0.0` 的正式规则事实规范；
- `constitution.md` 是最高级工程与产品治理约束。

在开始任何实现前，至少阅读：

```text
docs/AGENTS.md
docs/planning/tasks.md
```

然后阅读当前 Task 明确引用的：

```text
docs/product/requirements-baseline-v1.2.md
docs/product/spec.md
docs/architecture/architecture.md
docs/planning/plan.md
```

若当前工作涉及 `common-simple` 规则，必须同时读取 `docs/rules/common-simple/rule-spec-v1.0.md`。若涉及数据迁移、分享、PWA、离线、安全或发布，也必须读取对应正式章节，不得只凭任务标题猜测需求。

---

# 3. 当前冻结开发目标

当前主要开发目标：

```text
v0.1.0
大众麻将·通用简化版
+
完整通用胡牌番数计算器基础能力
```

当前不要自行开发：

- 自定义规则编辑器；
- 空白规则编辑器；
- 癞子、财神、百搭；
- 拍照识牌；
- 结果图片；
- 账号；
- 云同步；
- 多语言；
- 多草稿；
- 收藏、标签、文件夹；
- 跨规则自动比较；
- 文本记谱录牌；
- 牌河、其他玩家明牌；
- 剩余牌数量、概率；
- 一炮多响；
- 多玩家牌局结算；
- 金额、支付、赔付、现金、筹码兑换等功能。

如果现有代码中已经存在上述半成品，不得擅自继续扩展；先报告并说明与当前范围的关系。

## 3.1 `common-simple@1.0.0` 冻结规则事实

实现和测试不得偏离 `docs/rules/common-simple/rule-spec-v1.0.md`：

- 使用 144 张牌；
- 支持普通结构、七对、十三幺；
- v0.1.0 不支持七星不靠、全不靠、组合龙；
- 以国标 81 番体系作为番型定义与番值主干，其中 78 个启用、3 个禁用；
- `minimumFan = 0`；
- 自摸 `+1`；
- 花牌每张 `+1`；
- 默认不封顶；
- 不包含平台特有庄家翻倍、房间加倍、胡后翻牌等奖励规则。

任何番型目录、RulePackage、百科、测试语料或 Release Gate 与这些事实不一致时，必须停止受影响实现并报告，不能用代码反向修改规则事实。

## 3.2 Quick Calc 是 v0.1.0 正式范围

Quick Calc 是 Calculator 内的弱化次级入口，不是儿童需求或未来功能。它必须复用当前 RulePackage 的关系、计分、合法性、门槛和封顶能力，但不调用牌面结构、自动识别、听牌或多拆分；输出持续标记“用户选择，未经牌面验证”，只能临时查看和复制文字，不能保存牌例或生成牌例分享链接。

---

# 4. Agent 总工作流程

每轮工作必须遵循：

```text
1. 阅读 docs/AGENTS.md
2. 找到当前 Task / Batch
3. 阅读该 Task 依赖的上游文档
4. 检查现有代码
5. 判断是否存在需求或架构冲突
6. 如有冲突，暂停受影响修改并报告
7. 如无冲突，给出预计修改范围
8. 实施最小必要修改
9. 增加或更新测试
10. 运行相关测试
11. 检查 lint / typecheck / build
12. 汇报完成内容、测试结果、已知限制和下一步
```

禁止：

```text
先大改代码
→ 再回头找文档证明合理
```

---

# 5. 发现冲突时必须暂停

如果发现：

- 新需求与冻结需求冲突；
- `spec.md` 与 `architecture.md` 冲突；
- 现有代码行为与正式文档冲突；
- Task 无法在当前架构下正确实现；
- 规则资料与现有 RulePackage 冲突；
- 需要删除冻结功能才能继续；
- 需要新增后端、遥测、云存储等重大能力；

必须：

1. 明确指出冲突；
2. 给出涉及文件和需求/章节；
3. 说明现有行为；
4. 说明按文档应该是什么；
5. 说明影响；
6. 提供可选方案；
7. 等待项目方决定。

不得自行选择“更合理”的方案。

---

# 6. 当前 Task 是默认执行入口

AI 开发默认从：

```text
docs/planning/tasks.md
```

中选择当前未完成 Task。

任务状态：

```text
TODO
IN_PROGRESS
BLOCKED
REVIEW
DONE
CANCELLED
```

只有满足 Task 的全部：

- 实现内容；
- 验收标准；
- 测试要求；
- 相关质量检查；

才可以建议标记 `DONE`。

不要因为“主要代码写完了”就标记完成。

---

# 7. 推荐 Batch 执行原则

`tasks.md` 已提供推荐 Batch。

默认：

- 一次完成一个 Batch；
- 每个 Batch 结束后 Review；
- 不一次跨多个 Milestone 大改。

如果现有仓库已经实现部分 Task：

- 先核对；
- 满足验收就标记已完成；
- 不要为了“重新按文档实现”而无意义重写。

如果现有实现只满足部分：

- 保留可用部分；
- 补齐缺口；
- 避免大规模推翻。

---

# 8. 代码架构边界

核心依赖方向：

```text
Presentation
    ↓
Application
    ↓
Domain
```

Infrastructure 通过明确接口被 Application 调用。

## Domain 禁止依赖

`src/domain/**` 禁止直接依赖：

- React；
- Zustand；
- Dexie；
- DOM；
- Router；
- Service Worker；
- IndexedDB；
- localStorage；
- 网络请求；
- 页面组件；
- CSS；
- UI 文案。

如果 Domain 需要输出错误，应输出：

```text
reasonCode
data
```

而不是直接返回一整段 UI 中文文案。

---

# 9. 不得在 UI 中实现麻将规则

React Component 只负责：

- 展示；
- 收集输入；
- 触发 Application Action；
- 展示 Domain Result。

禁止在组件中写：

```ts
if (三张一样) {
  // 直接认定某番型
}
```

禁止用：

- CSS class；
- DOM 数量；
- 当前页面；
- 当前设备；
- 当前展示顺序；

决定麻将规则结果。

所有规则判断必须进入 Domain Engine。

---

# 10. RulePackage 必须是数据，不得是执行代码

规则包只允许包含可验证数据。

禁止：

- JavaScript 函数字符串；
- `eval`；
- `new Function`；
- 任意表达式执行器；
- 任意脚本 URL；
- 用户上传脚本；
- 动态加载第三方规则代码。

规则包只能通过受控 ID 引用应用内置能力，例如：

```text
structure.standard
structure.sevenPairs
recognizer.pureOneSuit
scoring.additive
```

新规则需要新算法时：

```text
先实现 App Capability
→ 测试
→ 发布 App 版本
→ 再让 RulePackage 引用
```

---

# 11. 规则必须数据驱动

以下内容不得散落硬编码到页面：

- 当前牌种；
- 是否有字牌；
- 是否有花牌；
- 结构目标张数；
- 听牌张数；
- 副露组数上限；
- 和牌结构；
- 番型启用状态；
- 番值；
- 起胡门槛；
- 封顶；
- 自摸算法；
- 特殊和牌条件；
- 番型关系；
- 临时规则可调整项；
- 原生单位。

例如禁止：

```ts
if (ruleId === "sichuan") {
  hideHonors = true;
}
```

应该读取：

```text
rule.tileSet.enabledTiles
```

---

# 12. 大众麻将与国标麻将必须严格独立

`大众麻将·通用简化版`：

- 是 v0.1.0 默认规则；
- 是独立 RulePackage；
- 不是国标麻将；
- 不得因为后续实现国标而重命名或覆盖。

国标麻将未来必须有：

- 独立 ruleId；
- 独立 RuleVersion；
- 独立 Pattern Catalog；
- 独立来源；
- 独立测试集。

---

# 13. 手牌数据边界

正式牌面必须保持：

```text
concealed
melds
flowers
winningTile
```

分离。

不要为了 UI 集中展示把所有牌拍平成一个数组。

吃、碰、明杠、暗杠完成后虽然视觉上进入“已录入牌面”，数据层仍必须保留独立牌组语义。

副露不能被普通拆分算法重新拆进暗手牌。

---

# 14. 副露录入必须使用临时状态

当前产品交互：

- 手牌和胡牌张是长期固定录入区域；
- 吃、碰、明杠、暗杠、花牌通过临时录入。

吃牌：

```text
选择“吃”
→ 三个临时牌位
→ 逐张选择
→ 可撤回前两张
→ 第三张校验同花色连续
→ 合法才提交正式 Meld
→ 返回手牌录入
```

未完成吃牌：

- 不进入正式 Hand；
- 不计结构张数；
- 不得保存成正式副露。

不要恢复旧设计中的“吃牌固定区域”“碰牌固定区域”等长期区域。

---

# 15. 胡牌张必须独立

正式胡牌结果必须有独立 `winningTile`。

如果用户将 14 张全部放进手牌：

- 系统可以推荐最后录入牌；
- 不能自动认定；
- 必须由用户明确确认胡牌张。

胡牌张变化可能影响：

- 边张；
- 坎张；
- 单钓；
- 其他依赖胡牌落点的番型。

因此不能只把胡牌张当作普通第 14 张处理。

---

# 16. 所有合法拆分必须完整枚举

结构引擎必须：

- 枚举所有允许和牌结构；
- 枚举普通结构所有合法拆分；
- 枚举胡牌张所有有意义落点；
- 分别计算；
- 比较最高合法结果；
- 保留并列最高。

禁止：

- 找到第一种胡法立即停止；
- 使用固定结构优先级；
- 只取“最常见”拆分；
- 为性能跳过候选；
- 把不同拆分的番型混合。

---

# 17. 正式计算必须确定性

同样的：

```text
CalculatorDocument
RulePackage
EngineVersion
```

必须得到相同结果。

禁止正式结果依赖：

- 随机数；
- 当前时间；
- 网络返回；
- UI 顺序；
- 不稳定对象遍历。

如果为了排序需要 tie-break，必须使用稳定 Comparator。

---

# 18. Pattern Recognizer 职责单一

Recognizer 只负责：

```text
这个番型是否成立
+
为什么成立
```

Recognizer 不负责：

- 与其他番型互斥；
- 包含；
- 不重复计分；
- 封顶；
- 起胡；
- 最终总数；
- 用户人工调整。

关系由 Relation Resolver 处理。

计分由 Scoring 处理。

合法性由 Legality 处理。

---

# 19. 合法性与分值必须分离

禁止使用：

```ts
score > 0
```

判断“能不能胡”。

必须能够表达：

```text
结构成和
+ 有一些番型
+ 但未达到起胡门槛
= 当前规则不能胡
```

也必须支持：

```text
System Preset -> illegal
Session Rule Adjustment -> legal
```

---

# 20. 三层结果绝不能混淆

必须严格区分：

## System Preset Result / 系统预设结果

系统预设规则结果。

## Session Rule Result / 本次规则结果

“调整本次规则”后的完整重新计算结果。

该层可以改变合法性。

## User Adjustment Result / 用户调整结果

用户取消或强制计入**系统已识别**番型后的讨论性结果。

该层不能改变基础合法性。

必须建立测试不变量：

```text
Fan Adjustment 不得改变 Base Legality
```

禁止把用户调整结果显示成系统预设结果。

---

# 21. 不允许人工新增系统未识别番型

v0.1.0～v1.0.0：

允许：

- 取消已识别番型；
- 强制计入已识别但因关系未计入的番型。

不允许：

- 输入一个系统没识别的番型并改变结果；
- 创建自定义番型；
- 手写任意番值。

如果用户提出此功能，先标记为远期需求，不能直接实现。

---

# 22. 结果必须可解释

正式结果不能只返回：

```text
16番
```

至少保留结构化信息：

- 结构；
- 拆分；
- 胡牌张落点；
- 已识别番型；
- 计入番型；
- 未计入番型；
- 未计入原因；
- 番值；
- 关系；
- 计算顺序；
- 门槛；
- 封顶；
- 规则版本；
- 引擎版本；
- 来源。

UI、复制、保存应尽量复用同一结构化 Explanation。

---

# 23. 规则 Bug 必须加入永久回归

任何会导致：

- 错算；
- 漏算；
- 合法性误判；
- 听牌错误；
- 多拆分错误；

的 Bug：

```text
先固定复现牌例
→ 添加失败测试
→ 修代码
→ 测试通过
→ 永久保留测试
```

不允许只修代码。

---

# 24. 测试规则

规则相关修改最低要求：

- 正例；
- 反例；
- 必要的关系测试；
- 历史回归。

重大 Engine 修改还要检查：

- 普通结构；
- 七对；
- 十三幺；
- 多拆分；
- 并列最高；
- 听牌；
- 弃牌后听牌。

运行新测试后也必须确认既有 Rule Cases 未被破坏。

---

# 25. 版本规则

必须区分：

```text
App Version
Engine Version
Rule Version
Database Schema Version
Backup Format Version
Share Format Version
Single Example Format Version
```

影响规则结果的修复必须评估：

- 是否提升 Engine Version；
- 是否提升受影响 Rule Version；
- 是否影响旧牌例；
- 是否需要 Migration。

不要只修改代码而不考虑版本语义。

---

# 26. 旧牌例不得静默覆盖

已保存牌例必须保留：

- 原牌面；
- 胡牌张；
- 和牌条件；
- RuleRef；
- EngineVersion；
- Result Snapshot；
- 临时规则；
- Fan Adjustment；
- 并列最高。

新版本打开时：

- 默认先展示保存时结果；
- 可以提供最新规则试算；
- 不自动覆盖；
- 用户主动选择更新/另存。

---

# 27. 用户数据 Local-first

默认：

- 无账号；
- 无云同步；
- 无业务后端；
- 无 Analytics；
- 无自动错误上传；
- 无牌面上传。

不要加入：

```text
analytics SDK
crash reporting SDK
remote history
cloud save
user profile
```

除非未来需求和 Constitution 正式变更。

---

# 28. 外部输入全部不可信

包括：

- Share URL；
- JSON Backup；
- Single Example；
- Rule Package；
- Encyclopedia Markdown。

必须：

```text
unknown
→ runtime validation
→ typed value
```

禁止：

```ts
JSON.parse(x) as SomeTrustedType
```

必须检查：

- Schema；
- 字段白名单；
- 数值范围；
- 牌数；
- 数组大小；
- 文件大小；
- 解压后大小；
- 版本；
- 关系引用。

校验失败不能破坏当前 Draft。

---

# 29. 分享编码不是加密

分享使用：

```text
Canonical JSON
→ Compression
→ Base64URL
```

禁止在 UI、文档和代码注释中称为：

```text
加密分享
安全加密
```

它只是编码/压缩。

分享前必须允许用户看到摘要，因为链接内包含完整牌面数据。

`INCOMPLETE_CONTEXT` 只允许复制暂定信息，不得生成正式 SharePayload 或牌例分享链接。Quick Calc、Needs Correction 和 Engine Error 同样不得生成正式牌例分享。

---

# 30. Hash 不是签名

SHA-256 可用于：

- 检测损坏；
- 校验 manifest 内容；
- 辅助重复导入。

不得声称 Hash 可以证明：

- 发布者身份；
- 数据绝对可信；
- 内容未被恶意来源替换。

未来如需真实性校验，另行设计签名机制。

---

# 31. 数据写入必须事务安全

必须事务化：

- 完整备份覆盖恢复；
- 批量合并导入；
- Rule Package 安装状态切换；
- 数据迁移；
- 保存记录与 RuleSnapshot 引用关系等需要一致性的操作。

覆盖恢复前先生成安全备份。

失败：

```text
rollback
```

不要留半完成状态。

---

# 32. 存储失败不能假装成功

IndexedDB 不可用、Quota 不足等：

进入 Temporary Mode。

仍允许：

- 录牌；
- 计算；
- 复制；
- 分享；
- 单牌例导出。

暂停：

- 保存牌例；
- Draft 恢复；
- 持久化导入。

禁止先 Toast：

```text
保存成功
```

然后后台失败。

---

# 33. Draft 只有一个

当前产品只有一份当前 Draft。

不要新增：

- Draft 列表；
- 自动历史；
- 最近计算历史。

Draft：

- 自动保存当前状态；
- 不进入 Saved Examples；
- 可恢复未完成牌面；
- 可恢复临时规则调整；
- 可恢复待修正状态；
- Undo 历史不持久化。

---

# 34. 已保存牌例只有主动保存

用户未点击：

```text
保存牌例
```

不得创建正式保存记录。

不允许：

- 自动历史；
- 每次计算都进 Saved；
- 自动覆盖同名记录。

名称允许重复，内部 ID 区分。

---

# 35. 多标签页只允许一个主编辑器

一个 Tab 为 Calculator 主编辑器。

其他 Tab：

- 可以浏览；
- 默认只读 Calculator；
- 可主动 takeover。

不要让两个 Tab 同时无保护写同一个 Draft。

---

# 36. Worker 结果必须做 revision 校验

每次分析带：

```text
requestId
documentRevision
```

收到结果：

```text
response.revision !== current.revision
→ discard
```

不能因为 Worker 返回了“正确结果”就忽略它已经对应旧牌面。

---

# 37. 分析取消必须真正阻止旧结果进入 UI

至少实现逻辑取消：

```text
requestId invalidated
```

耗时分析需要时可以：

- terminate Worker；
- recreate Worker。

取消后禁止迟到结果重新显示。

---

# 38. 性能优化不能降低正确性

允许：

- Memoization；
- Cache；
- Worker；
- Dedup；
- Count Array；
- bitmask；
- 预计算；
- distinct tile 优化。

禁止：

- 只算“可能最高”的拆分；
- 超时后返回当前 best 作为正式结果；
- 省略七对/十三幺；
- 随机抽样；
- 近似算法。

---

# 39. Encyclopedia 与 Engine 必须同源

番表中的：

- 番值；
- enabled；
- 关系；
- source；

必须读取与 Engine 同一 RulePackage 数据。

禁止 UI 另维护：

```ts
const FAN_TABLE = ...
```

造成百科和计算器不一致。

---

# 40. Markdown/规则内容安全

不可信 Markdown：

- 默认禁止 raw HTML；
- 不执行 script；
- 不插 iframe；
- 不执行事件处理器。

避免使用 `dangerouslySetInnerHTML` 渲染外部内容。

若确实必须使用 HTML，先有严格 sanitization 和对应安全测试。

---

# 41. 路由和分享必须保护当前 Draft

打开：

- Share；
- Import；
- Encyclopedia Example；
- 另一个 Saved Example；
- New Hand；

都必须走统一 Replace Guard。

未确认替换前：

- 当前 Draft 不能丢；
- 新数据不能提前写 Draft。

---

# 42. 不要直接删除异常输入

规则切换、导入等产生异常状态时：

```text
保留
→ 标记
→ 解释
→ 让用户修正
```

除非用户明确选择“移除不兼容项”。

系统不应为了“让分析继续”而静默删牌。

---

# 43. 浏览器与响应式

核心流程必须同时考虑：

- 手机；
- 桌面；
- Safari/WebKit；
- Android Chromium；
- 微信内置浏览器。

必须统一检测 Web Worker、IndexedDB、Cache Storage、Service Worker / PWA、Clipboard、Web Share 和 File APIs。不得只凭 User-Agent 猜测能力；非核心浏览器能力缺失时优雅降级，且不得阻断核心计算。

例如：

- Web Worker 失败 → 使用同一确定性 Engine 的主线程降级，不得返回近似结果；
- IndexedDB 失败 → 进入 Temporary Mode；
- Cache Storage / Service Worker 失败 → 继续作为联网网页；
- Clipboard 失败 → 手动复制框；
- Web Share 不存在 → 继续复制链接；
- PWA 不支持 → 继续作为网页；
- 高级文件 API 不支持 → 使用 `<input type="file">`。

---

# 44. 可访问性不是最后可选优化

相关 UI 修改时必须保持：

- 键盘可操作；
- 焦点可见；
- Dialog 焦点正确；
- Tile 有可访问名称；
- 不只依赖颜色；
- 分析完成/错误可被读屏获知；
- Reduced Motion 生效；
- 移动点击区域足够。

不要等正式发布前一次性补救所有语义。

---

# 45. 主题和视觉不能进入 Domain

主题：

```text
system
light
dark
```

像素风麻将牌：

- 只是 Presentation；
- 不作为业务 ID；
- 不改变计算逻辑。

颜色、图标、动画变化不得影响 Rule Result。

---

# 46. 禁止金钱化模型

代码中不要新增：

```text
Money
Currency
Payment
Payout
Bet
Stake
ChipExchange
```

未来多人模块使用：

```text
Score
ScoreDelta
PlayerScore
```

产品永久不做现金、支付、赔付和博彩服务。

---

# 47. 新依赖准入

新增第三方依赖前说明：

- 为什么需要；
- 是否有更轻方案；
- Bundle 影响；
- 是否联网；
- 是否有遥测；
- 是否影响离线；
- CSP 影响；
- 许可证/维护风险。

不要为了一个小功能引入大型框架。

特别禁止默认上报数据的 Analytics SDK。

---

# 48. 不要为未来功能过度设计

当前只需保留合理扩展边界。

禁止提前开发：

- 自定义规则 DSL；
- 用户脚本；
- 复杂插件系统；
- 多玩家模型；
- 癞子求解器；
- AI 图像识别框架。

“以后可能需要”不是增加当前复杂度的充分理由。

---

# 49. 规则变更 Review 要求

任何会改变计算结果的修改，汇报时必须说明：

```text
受影响 Rule ID
受影响 Rule Version
受影响 Pattern / Structure
相关资料来源
新增/修改测试
是否改变历史结果
是否需要 Engine Version bump
是否需要 Rule Version bump
```

纯 UI 修改不需要制造 Rule Version。

---

# 50. Schema 变更 Review 要求

修改：

- CalculatorDocument；
- SavedExample；
- Draft；
- Backup；
- Share；
- RulePackage；
- Single Example；

任何持久格式时，必须说明：

- 旧数据兼容性；
- Migration；
- 高版本行为；
- Roundtrip 测试；
- 是否会影响历史数据。

禁止“先改类型，旧数据以后再处理”。

---

# 51. 每轮测试最小要求

修改哪层，就运行对应测试。

## Domain / Engine

至少：

```text
typecheck
unit tests
rule case tests
```

## UI

至少：

```text
typecheck
component tests
相关 E2E 或 smoke
```

## Persistence / Import

至少：

```text
unit
roundtrip
migration/transaction tests
```

## PWA / Update

仅修改 M0 PWA 工程脚手架时至少：

```text
build
scaffold/config smoke
```

修改 M11 正式 Manifest、图标、生产 Service Worker、缓存、Offline 或 Update 时至少：

```text
build
offline smoke
update behavior test
```

每个 Batch 结束建议运行：

```text
lint
typecheck
test
build
```

如果时间成本较高，可以说明哪些全量测试尚未执行，但不能声称“全部通过”。

---

# 52. 不得伪造测试结果

如果没有实际运行测试：

不要说：

```text
测试通过
```

应明确：

```text
未运行：原因...
建议运行：...
```

如果测试失败：

- 不隐藏；
- 给出失败项；
- 判断是否由当前修改引起；
- 不能为了绿灯随意删除测试。

---

# 53. Task 完成报告格式

每轮完成后建议按以下格式汇报：

```text
完成 Task
- Txxx ...
- Txxx ...

主要修改
- 文件 A：...
- 文件 B：...

新增/更新测试
- ...

测试结果
- lint: pass/fail/not run
- typecheck: pass/fail/not run
- unit: pass/fail/not run
- rule cases: pass/fail/not run
- build: pass/fail/not run

发现的问题
- 无
或
- ...

是否可进入下一 Batch
- 是 / 否，原因...
```

避免只回答：

```text
已完成。
```

---

# 54. 修改范围必须克制

Agent 应优先：

```text
最小必要改动
```

不要：

- 顺手大改目录；
- 顺手升级所有依赖；
- 顺手重写全部 CSS；
- 顺手替换状态管理；
- 顺手重构无关模块；
- 顺手修改所有文案。

大规模重构必须与当前 Task 有明确关系。

---

# 55. 不得把 TODO 当完成

冻结需求如果只是：

```ts
// TODO: later
```

或者：

```text
按钮可点击但弹“敬请期待”
```

不算完成。

远期功能反而不应出现不可用占位入口。

---

# 56. 现有代码优先核对，不要机械覆盖

如果开始开发时仓库已有代码：

先回答：

- 当前代码已经实现什么；
- 哪些符合 Task；
- 哪些冲突；
- 哪些可以保留；
- 哪些需要修改。

不得因为文档建议了目录结构就机械把现有可用代码全部移动重写。

Architecture 描述的是边界和目标，不是要求每个文件名一模一样。

---

# 57. Architecture 可调整，实现行为不可擅改

如果发现：

- 某第三方库不合适；
- 某目录更合理；
- 某内部数据结构可优化；

可以提出架构调整。

前提：

- 不改变 Spec；
- 不破坏 Constitution；
- 不削弱测试；
- 不影响数据兼容性。

重大调整应记录 ADR/文档变更后再实施。

---

# 58. 当前开发优先级

发生资源冲突时：

```text
P0 规则正确性
P0 数据完整性
P0 核心计算流程
P1 结果可解释
P1 保存/恢复
P1 手机可用性
P1 听牌分析
P2 百科/分享/PWA
P2 可访问性完善
P3 视觉精修
P3 非核心动画
```

这是开发先后顺序，不代表低优先级项可以从正式版本删除。

---

# 59. 正式发布阻断项

以下任何一项已知存在时，Agent 不得建议正式发布：

- 严重错算；
- 严重漏算；
- 和牌合法性误判；
- Rule Cases 未通过；
- 保存/恢复严重故障；
- 导入/迁移可能静默破坏数据；
- 手机核心流程不可用；
- 桌面核心流程不可用；
- 微信内置浏览器核心流程不可用；
- 牌例严重丢失；
- 核心计算卡死或无法完成。

除此之外，正式发布前必须对以下五条链路分别形成通过记录：

```text
Save
Restore
Import
Share
Migration
```

五项必须全部通过；“当前没有已知严重故障”不能替代正向验收，任一项未执行、失败或结果不明都阻断正式发布。

---

# 60. Alpha / Beta / RC 纪律

## Alpha

允许继续修正大问题，但所有冻结主功能应已存在。

## Beta

重点收集真实规则和兼容问题。

## RC

禁止：

- 新功能；
- 大规模重构；
- 高风险 UI 改版。

RC 只做发布阻断修复和低风险高价值缺陷修复。

---

# 61. Git 操作原则

除非用户明确要求：

- 不重写 Git 历史；
- 不强推；
- 不删除远端分支；
- 不自动提交；
- 不自动 push；
- 不修改仓库保护规则。

如果用户要求生成提交内容，可以建议：

```text
commit message
```

但是否实际 commit/push 取决于当前工具权限和用户请求。

---

# 62. Secrets

禁止：

- 把 API Key 写进源码；
- 把 Token 写进 RulePackage；
- 把 Secrets 提交到 Git；
- 为本项目无后端需求引入无意义密钥。

如果发现 Secret：

- 不继续传播；
- 报告位置；
- 建议移出仓库并轮换。

---

# 63. 静态部署约束

当前正式产品应保持可部署为静态站点/PWA。

不要因为实现方便加入：

- Node 业务服务器；
- SQL；
- Redis；
- Session；
- 用户 API。

如果某功能“必须后端才能做”，先检查它是否根本不在当前需求范围。

---

# 64. 文件和数据命名

推荐：

- 代码标识英文；
- 产品文案简体中文；
- Rule/Pattern ID 稳定英文；
- 文件名英文；
- 规则说明中文。

避免把中文显示名称作为稳定外部 ID。

---

# 65. Code Review 自检

提交 Review 前自查：

```text
是否改变了用户行为？
是否需要更新 Spec？
是否改变计算结果？
是否需要 Rule Version？
是否改变 Schema？
是否需要 Migration？
是否新增网络请求？
是否上传用户数据？
是否新增外部依赖？
是否破坏离线？
是否增加规则硬编码？
是否新增未批准功能？
是否补了测试？
```

任何“是”都应在汇报中说明。

---

# 66. 当前文档链完成状态

正式文档链：

```text
docs/product/requirements-baseline-v1.2.md
docs/product/requirements-audit.md
docs/rules/common-simple/rule-spec-v1.0.md
docs/governance/constitution.md
docs/product/spec.md
docs/architecture/architecture.md
docs/planning/plan.md
docs/planning/tasks.md
docs/AGENTS.md
```

本文件是最后一层执行约束。

正式文档链内容已由项目方于 2026-08-10 确认；`Baseline 1.2` 的版本治理已于 2026-08-11 获项目方批准。本文件当前状态为 `已批准 / Active`。Rule Spec 是 `common-simple` 的规则事实规范，不改变 Constitution → Spec → Architecture → Plan → Tasks → AGENTS 的治理权威顺序。

后续开发时：

```text
需求变更 → Baseline
产品行为 → Spec
技术设计 → Architecture
实施阶段 → Plan
具体执行 → Tasks
仓库操作方式 → AGENTS
```

不要反向用代码修改事实标准。

---

# 67. Agent 最终原则

在任何不确定情况下，优先选择：

```text
明确报告
> 静默猜测

保留数据
> 自动删除

正确完整计算
> 快速近似结果

已有冻结需求
> 实现便利

最小必要修改
> 无关重构

自动测试证明
> 口头声称正确
```

> **如果一个实现看起来“更省事”，但会让麻将规则变得不可解释、用户数据更难复现、旧牌例更容易被覆盖，或者需要绕过正式需求文档，那么它就不是本项目允许的捷径。**
