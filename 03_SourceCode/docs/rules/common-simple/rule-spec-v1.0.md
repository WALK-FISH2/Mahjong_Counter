# 大众麻将·通用简化版规则事实规范

**Rule ID:** `common-simple`  
**Rule Version:** `1.0.0`  
**适用产品版本:** `v0.1.0+`  
**文档状态:** `已批准 / Active`  
**文档日期:** `2026-08-10`  
**项目方确认日期:** `2026-08-10`  
**正式仓库路径:** `docs/rules/common-simple/rule-spec-v1.0.md`

> 本文是“麻将番数计算器”中 `大众麻将·通用简化版` 的规则事实规范。  
> 它回答“这套预设到底使用什么牌、允许什么和牌结构、有哪些番型、番值是多少、如何处理起和门槛、花牌、自摸和番型关系”等问题。
>
> 本文不是“中国统一大众麻将官方规则”。中国各地及各游戏平台的“大众麻将”并不存在完全一致的统一版本。本预设采用“主流平台大众玩法共同特征 + 国标番型事实主干 + 删除平台专属机制”的产品化基线。

---

## 1. 规范性定位

### 1.1 规则定位

`大众麻将·通用简化版` 是本产品维护的**代表性通用预设**，其目标是：

1. 为首次使用者提供易理解、低门槛的通用麻将番数计算体验；
2. 使用中国麻将中广泛认知的番型名称与定义；
3. 保留足够完整的番型关系与解释能力；
4. 不绑定单一游戏平台的庄家、加倍、虚拟资产、房间倍数等机制；
5. 与后续 `国标麻将（MCR）` 保持明确区分。

### 1.2 主要依据

本预设使用三层来源：

| 来源 | 作用 | 本规范采用方式 | 可信度 |
|---|---|---|---|
| 《中国麻将竞赛规则》 | 番型名称、定义、番值、计分原则、主要不重复关系 | 作为番型事实主干 | A |
| 腾讯欢乐麻将“大众麻将”公开说明 | “基于国标演变、成胡即可、低门槛、80 多种番型”等大众玩法定位 | 作为主要大众玩法锚点 | B |
| 联众“大众麻将”公开规则 | 大众番种体系、特殊和牌结构、花牌、平台变体 | 用于交叉验证及识别平台特有项 | B |

### 1.3 明确不等同于任何单一来源

本预设：

- **不等同于完整国标麻将**；
- **不等同于腾讯欢乐大众麻将的全部线上玩法**；
- **不等同于联众大众麻将的全部线上玩法**；
- **不等同于 JJ 大众麻将**；
- 不声称代表全国所有线下牌馆的“大众麻将”。

---

## 2. 与国标麻将的核心区别

本预设大量沿用国标番型定义和番值，但至少存在以下明确差异：

| 项目 | 大众麻将·通用简化版 | 国标麻将 |
|---|---|---|
| Rule ID | `common-simple` | 后续独立 Rule ID |
| 最低起和 | **0，结构合法即可和** | 8 分 |
| 当前结构支持 | 普通结构、七对、十三幺 | 完整国标特殊结构 |
| 七星不靠 | v0.1 不支持 | 支持 |
| 全不靠 | v0.1 不支持 | 支持 |
| 组合龙 | v0.1 不支持 | 支持 |
| 牌局底分/三家支付 | 不属于本计算器 | 国标竞赛计分包含 |
| 产品定位 | 通用低门槛番数计算预设 | 独立竞赛规则 |

**禁止**把 `common-simple` 在 UI、文档或代码中描述为“国标麻将”。

---

# 3. 牌组

## 3.1 牌张总数

默认牌组共 **144 张**。

### 序数牌

- 万子：`1m`～`9m`，每种 4 张；
- 筒子：`1p`～`9p`，每种 4 张；
- 条子：`1s`～`9s`，每种 4 张。

共：

```text
27 种 × 4 = 108 张
```

### 字牌

风牌：

- 东 `E`
- 南 `S`
- 西 `W`
- 北 `N`

箭牌：

- 中 `C`
- 发 `F`
- 白 `P`

共：

```text
7 种 × 4 = 28 张
```

### 花牌

季节花：

- 春 `SPRING`
- 夏 `SUMMER`
- 秋 `AUTUMN`
- 冬 `WINTER`

植物花：

- 梅 `PLUM`
- 兰 `ORCHID`
- 竹 `BAMBOO`
- 菊 `CHRYSANTHEMUM`

共：

```text
8 种 × 1 = 8 张
```

### 总数

```text
108 + 28 + 8 = 144
```

---

# 4. 结构计数

## 4.1 结构张与实体张

花牌：

- 不参与 14 张和牌结构；
- 不参与听牌结构；
- 单独记录并在和牌后计番。

杠：

- 实体上为 4 张；
- 结构上视为 1 副面子，即相当于 3 张结构牌。

因此 UI 必须能够同时表达：

- physical tile count；
- structural tile count。

## 4.2 默认结构目标

```yaml
targetStructuralTileCount: 14
readyStructuralTileCount: 13
requiredMeldCount: 4
requiredPairCount: 1
```

---

# 5. 动作能力

本规则允许：

- 吃；
- 碰；
- 明杠；
- 暗杠；
- 补杠 / 加杠；
- 补花；
- 点和；
- 自摸。

其中本项目 v0.1.0 是**单手牌番数计算器**，不处理完整牌局流程中的：

- 抢吃碰优先级；
- 多家同时和牌裁定；
- 庄家轮转；
- 连庄；
- 一炮多响结算；
- 玩家之间的牌局分配。

这些内容不能影响单手牌番数事实。

---

# 6. 支持的和牌结构

## 6.1 标准结构

```text
4 副面子 + 1 对将牌
```

面子可以是：

- 顺子；
- 刻子；
- 杠。

## 6.2 七对

```text
7 个对子
```

要求：

- 无已完成吃牌；
- 无已完成碰牌；
- 无已完成明杠；
- 无已完成暗杠。

四张相同牌在七对结构中的具体处理必须由 RulePackage 明确，不得由 UI 猜测。

本预设采用与国标“七对”定义一致的结构解释。

## 6.3 十三幺

需要以下 13 种幺九字牌各至少 1 张：

```text
1m 9m
1p 9p
1s 9s
E S W N
C F P
```

再以其中任一张形成对子。

## 6.4 v0.1 明确不支持的特殊结构

以下国标特殊结构不进入 `common-simple@1.0.0` 的正式和牌结构：

- 七星不靠；
- 全不靠；
- 组合龙。

原因不是这些番型“不存在”，而是当前 v0.1.0 Domain Engine 已冻结的结构能力暂不包含这些特殊结构。

这些番型必须：

```yaml
enabled: false
supportStatus: NOT_SUPPORTED_IN_V0_1
reasonCode: STRUCTURE_NOT_IMPLEMENTED
```

不得把它们误判成“不符合麻将规则”。

---

# 7. 起和门槛

## 7.1 默认门槛

```yaml
minimumFan: 0
```

只要：

1. 当前牌面属于本规则支持的合法和牌结构；
2. 必要和牌上下文完整；
3. 没有违反当前规则的合法性约束；

即可形成正式和牌结果。

## 7.2 与国标 8 分门槛的区别

本预设**不使用国标的 8 分起和门槛**。

取消门槛只改变：

```text
Legality
```

不改变原始番型自身的番值。

例如：

```text
无番和 = 8
```

仍保持 8 番，不因为“0 番即可和”而改成 0 或 1。

---

# 8. 封顶

默认：

```yaml
cap:
  enabled: false
```

即默认不设统一封顶。

原因：

- 主流“大众麻将”来源不存在可作为全国通用事实的单一封顶值；
- 平台房间封顶通常属于平台/房规行为；
- 本产品允许通过“调整本次规则”在当前计算中应用预设允许的封顶参数。

不得把某个平台房间上限写死到 `common-simple`。

---

# 9. 自摸

## 9.1 默认规则

```yaml
selfDraw:
  enabled: true
  fan: 1
```

普通自摸计：

```text
自摸 +1
```

## 9.2 与不求人的关系

当“不求人”成立时，按国标番型关系处理，不重复把被其必然包含的自摸再次作为独立番型累加。

Relation Resolver 必须处理该关系，不能由 UI 手工过滤。

---

# 10. 花牌

每张春夏秋冬梅兰竹菊：

```text
+1
```

规则：

- 花牌不参与和牌结构；
- 花牌不参与听牌结构；
- 花牌按具体种类记录；
- 每种默认最多一张；
- 和牌成立后作为附加番计入；
- 本预设不存在国标的 8 分起和门槛，因此不存在“花牌是否计入 8 分起和”的产品歧义。

---

# 11. 番型目录

## 11.1 总体政策

番型事实主干使用《中国麻将竞赛规则》的 81 番体系。

其中：

```text
81 个标准番型
- 3 个当前结构暂不支持番型
= 78 个 v0.1 可用番型
```

暂不支持：

- 七星不靠；
- 全不靠；
- 组合龙。

以下表格中的“支持”指 `common-simple@1.0.0` 当前正式计算是否可用。

---

## 11.2 88 番

| Pattern ID | 番型 | 番值 | 支持 | 核心定义 |
|---|---|---:|---|---|
| `bigFourWinds` | 大四喜 | 88 | 是 | 东南西北四副风刻/杠 |
| `bigThreeDragons` | 大三元 | 88 | 是 | 中发白三副箭刻/杠 |
| `allGreen` | 绿一色 | 88 | 是 | 仅由 23468 条及发组成 |
| `nineGates` | 九莲宝灯 | 88 | 是 | 门清同一花色满足 1112345678999 基本形并和同花色任一张 |
| `fourKongs` | 四杠 | 88 | 是 | 四副杠 |
| `sevenShiftedPairs` | 连七对 | 88 | 是 | 同一花色七个连续序数对子 |
| `thirteenOrphans` | 十三幺 | 88 | 是 | 十三种幺九字牌各一张并以其中一种成对 |

## 11.3 64 番

| Pattern ID | 番型 | 番值 | 支持 | 核心定义 |
|---|---|---:|---|---|
| `allTerminals` | 清幺九 | 64 | 是 | 仅由一、九序数牌的刻/杠及将组成 |
| `littleFourWinds` | 小四喜 | 64 | 是 | 三副风刻/杠，第四种风作将 |
| `littleThreeDragons` | 小三元 | 64 | 是 | 两副箭刻/杠，第三种箭牌作将 |
| `allHonors` | 字一色 | 64 | 是 | 全部由风牌、箭牌组成 |
| `fourConcealedPungs` | 四暗刻 | 64 | 是 | 四副暗刻/暗杠 |
| `pureTerminalChows` | 一色双龙会 | 64 | 是 | 同花色两副 123、两副 789，5 作将 |

## 11.4 48 番

| Pattern ID | 番型 | 番值 | 支持 | 核心定义 |
|---|---|---:|---|---|
| `quadrupleChow` | 一色四同顺 | 48 | 是 | 同花色四副相同顺子 |
| `fourPureShiftedPungs` | 一色四节高 | 48 | 是 | 同花色四副依次递增一个序数的刻/杠 |

## 11.5 32 番

| Pattern ID | 番型 | 番值 | 支持 | 核心定义 |
|---|---|---:|---|---|
| `fourPureShiftedChows` | 一色四步高 | 32 | 是 | 同花色四副依次递增一位或两位的顺子 |
| `threeKongs` | 三杠 | 32 | 是 | 三副杠 |
| `allTerminalsAndHonors` | 混幺九 | 32 | 是 | 仅由幺九序数牌与字牌组成的刻/杠及将 |

## 11.6 24 番

| Pattern ID | 番型 | 番值 | 支持 | 核心定义 |
|---|---|---:|---|---|
| `sevenPairs` | 七对 | 24 | 是 | 七个对子 |
| `greaterHonorsAndKnittedTiles` | 七星不靠 | 24 | **否** | 国标特殊不靠结构 |
| `allEvenPungs` | 全双刻 | 24 | 是 | 仅由 2、4、6、8 的刻/杠及将组成 |
| `fullFlush` | 清一色 | 24 | 是 | 只使用一种序数花色，不含字牌 |
| `pureTripleChow` | 一色三同顺 | 24 | 是 | 同花色三副相同顺子 |
| `pureShiftedPungs` | 一色三节高 | 24 | 是 | 同花色三副依次递增一个序数的刻/杠 |
| `upperTiles` | 全大 | 24 | 是 | 全部序数牌来自 7、8、9 |
| `middleTiles` | 全中 | 24 | 是 | 全部序数牌来自 4、5、6 |
| `lowerTiles` | 全小 | 24 | 是 | 全部序数牌来自 1、2、3 |

## 11.7 16 番

| Pattern ID | 番型 | 番值 | 支持 | 核心定义 |
|---|---|---:|---|---|
| `pureStraight` | 清龙 | 16 | 是 | 同花色包含 123、456、789 |
| `threeSuitedTerminalChows` | 三色双龙会 | 16 | 是 | 两花色各有 123 与 789，第三花色 5 作将 |
| `pureShiftedChows` | 一色三步高 | 16 | 是 | 同花色三副依次递增一位或两位的顺子 |
| `allFives` | 全带五 | 16 | 是 | 每副面子与将都包含 5 |
| `triplePung` | 三同刻 | 16 | 是 | 三种花色相同序数的三副刻/杠 |
| `threeConcealedPungs` | 三暗刻 | 16 | 是 | 三副暗刻/暗杠 |

## 11.8 12 番

| Pattern ID | 番型 | 番值 | 支持 | 核心定义 |
|---|---|---:|---|---|
| `lesserHonorsAndKnittedTiles` | 全不靠 | 12 | **否** | 国标特殊不靠结构 |
| `knittedStraight` | 组合龙 | 12 | **否** | 三花色 147/258/369 错位组合形成特殊顺子 |
| `upperFour` | 大于五 | 12 | 是 | 序数牌仅使用 6～9 |
| `lowerFour` | 小于五 | 12 | 是 | 序数牌仅使用 1～4 |
| `bigThreeWinds` | 三风刻 | 12 | 是 | 三副风刻/杠 |

## 11.9 8 番

| Pattern ID | 番型 | 番值 | 支持 | 核心定义 |
|---|---|---:|---|---|
| `mixedStraight` | 花龙 | 8 | 是 | 三种花色的三副顺子组合成 123、456、789 |
| `reversibleTiles` | 推不倒 | 8 | 是 | 仅由国标定义的上下图形无区别牌组成 |
| `mixedTripleChow` | 三色三同顺 | 8 | 是 | 三种花色各一副相同序数顺子 |
| `mixedShiftedPungs` | 三色三节高 | 8 | 是 | 三种花色依次递增序数的三副刻/杠 |
| `chickenHand` | 无番和 | 8 | 是 | 除花牌外不存在其他可计番型 |
| `lastTileDraw` | 妙手回春 | 8 | 是 | 自摸牌墙最后一张牌 |
| `lastTileClaim` | 海底捞月 | 8 | 是 | 和牌墙摸完后的最后一张舍牌 |
| `outWithReplacementTile` | 杠上开花 | 8 | 是 | 杠后补牌自摸和 |
| `robbingTheKong` | 抢杠和 | 8 | 是 | 和他人加杠的牌 |

## 11.10 6 番

| Pattern ID | 番型 | 番值 | 支持 | 核心定义 |
|---|---|---:|---|---|
| `allPungs` | 碰碰和 | 6 | 是 | 四副刻/杠 + 一对将 |
| `halfFlush` | 混一色 | 6 | 是 | 一种序数花色与字牌组成 |
| `mixedShiftedChows` | 三色三步高 | 6 | 是 | 三种花色依次递增的三副顺子 |
| `allTypes` | 五门齐 | 6 | 是 | 万、筒、条、风、箭五类全部出现 |
| `meldedHand` | 全求人 | 6 | 是 | 四副面子均为吃/碰/明杠，单钓他人舍牌和 |
| `twoConcealedKongs` | 双暗杠 | 6 | 是 | 两副暗杠 |
| `twoDragonPungs` | 双箭刻 | 6 | 是 | 两副箭刻/杠 |

## 11.11 4 番

| Pattern ID | 番型 | 番值 | 支持 | 核心定义 |
|---|---|---:|---|---|
| `outsideHand` | 全带幺 | 4 | 是 | 每副面子及将都含幺九牌或字牌 |
| `fullyConcealedHand` | 不求人 | 4 | 是 | 无吃、碰、明杠并自摸和 |
| `twoMeldedKongs` | 双明杠 | 4 | 是 | 两副明杠 |
| `lastTile` | 和绝张 | 4 | 是 | 和到同种四张中其余三张均已明见的最后一张 |

## 11.12 2 番

| Pattern ID | 番型 | 番值 | 支持 | 核心定义 |
|---|---|---:|---|---|
| `dragonPung` | 箭刻 | 2 | 是 | 中、发、白任一刻/杠 |
| `prevalentWind` | 圈风刻 | 2 | 是 | 圈风刻/杠 |
| `seatWind` | 门风刻 | 2 | 是 | 门风刻/杠 |
| `concealedHand` | 门前清 | 2 | 是 | 无吃碰明杠，以点和方式和牌 |
| `allChows` | 平和 | 2 | 是 | 四副顺子、序数牌将，且不是边张/坎张/单钓将 |
| `tileHog` | 四归一 | 2 | 是 | 四张相同牌分别用于非杠组合 |
| `doublePung` | 双同刻 | 2 | 是 | 两种花色相同序数的两副刻/杠 |
| `twoConcealedPungs` | 双暗刻 | 2 | 是 | 两副暗刻/暗杠 |
| `concealedKong` | 暗杠 | 2 | 是 | 一副暗杠 |
| `allSimples` | 断幺 | 2 | 是 | 不含一、九及字牌 |

## 11.13 1 番

| Pattern ID | 番型 | 番值 | 支持 | 核心定义 |
|---|---|---:|---|---|
| `pureDoubleChow` | 一般高 | 1 | 是 | 同花色两副相同顺子 |
| `mixedDoubleChow` | 喜相逢 | 1 | 是 | 两种花色相同序数顺子 |
| `shortStraight` | 连六 | 1 | 是 | 同花色两副顺子组成连续六张序数 |
| `twoTerminalChows` | 老少副 | 1 | 是 | 同花色 123 与 789 |
| `pungOfTerminalsOrHonors` | 幺九刻 | 1 | 是 | 一、九或不属于圈风/门风的风牌刻/杠 |
| `meldedKong` | 明杠 | 1 | 是 | 一副明杠 |
| `oneVoidedSuit` | 缺一门 | 1 | 是 | 只使用两种序数花色，可含字牌 |
| `noHonors` | 无字 | 1 | 是 | 不含风牌、箭牌 |
| `edgeWait` | 边张 | 1 | 是 | 只以 3 和 12，或 7 和 89 构成单一顺子等待 |
| `closedWait` | 坎张 | 1 | 是 | 只等顺子中间张 |
| `singleWait` | 单钓将 | 1 | 是 | 只等将牌 |
| `selfDrawn` | 自摸 | 1 | 是 | 自摸和牌 |
| `flowerTiles` | 花牌 | 1/张 | 是 | 每张花牌 1 番 |

---

# 12. 番型关系

## 12.1 规范性原则

本规则继承《中国麻将竞赛规则》的五类组合计分原则：

1. 不重复；
2. 不拆移；
3. 不得相同；
4. 就高不就低；
5. 套算一次。

这些原则属于 `common-simple@1.0.0` 的正式规则事实。

## 12.2 Relation Resolver 的职责

Recognizer 只能产生：

```text
PatternCandidate
```

Relation Resolver 决定：

- `COUNTED`
- `COVERED`
- `MUTEX`
- `NON_REPEAT`
- `HIGHER_SELECTED`
- `SAME_SET_ALREADY_USED`

禁止 Recognizer 自己删除被覆盖番型。

## 12.3 关系来源

对于本规范继承的国标番型：

> **具体“不计”关系以本规范引用的《中国麻将竞赛规则》番种分值表及计分原则为规范性来源。**

RulePackage 中的 `PatternRelation` 必须逐项由该规范性来源转录，并通过 Rule Test Corpus 验证。

任何平台规则与国标关系不一致时：

- 默认不覆盖本规范；
- 必须先形成新的规则版本或明确的产品变更。

## 12.4 必须实现的关键覆盖关系

以下关系至少必须进入 `common-simple@1.0.0` 的自动测试：

| 高阶番型 | 不得重复计入的典型低阶番型 |
|---|---|
| 大四喜 | 三风刻、圈风刻、门风刻、碰碰和等其必然包含项 |
| 大三元 | 双箭刻、箭刻 |
| 小三元 | 双箭刻、箭刻 |
| 四杠 | 三杠、双明杠、双暗杠、明杠等被其覆盖的杠组合 |
| 连七对 | 七对及其必然包含项 |
| 十三幺 | 五门齐、门前清、单钓将等其必然包含项 |
| 四暗刻 | 三暗刻、双暗刻、碰碰和等其必然包含项 |
| 一色双龙会 | 清一色、平和、老少副、一般高等其必然包含项 |
| 一色四同顺 | 一色三同顺、一般高等重复组合 |
| 一色四节高 | 一色三节高、碰碰和等必然包含项 |
| 三杠 | 双杠/单杠层级中被覆盖的项目 |
| 七对 | 门前清、单钓将等其必然包含项 |
| 清一色 | 缺一门、无字等其必然包含项 |
| 全双刻 | 碰碰和、断幺等其必然包含项 |
| 全大 / 全中 / 全小 | 与其牌值范围必然成立的低阶项目不得重复 |
| 不求人 | 自摸及其必然包含的门清类项目 |
| 双暗杠 | 两次单个暗杠不得重复叠算 |
| 双明杠 | 两次单个明杠不得重复叠算 |
| 双箭刻 | 两次单个箭刻不得重复叠算 |
| 平和 | 与等待方式关系按正式定义判断 |
| 边张 / 坎张 / 单钓将 | 同一和牌张只计一种成立的单一等待番 |
| 无番和 | 一旦存在其他可计番型（花牌除外），无番和不成立 |

> 上表是必须覆盖的回归重点，不替代规范性来源中的完整关系表。

---

# 13. 和牌上下文

以下番型不能仅根据 14 张牌静态推断：

- 自摸；
- 杠上开花；
- 抢杠和；
- 妙手回春；
- 海底捞月；
- 和绝张；
- 圈风刻；
- 门风刻。

因此 RulePackage 必须声明对应 ContextDefinition。

## 13.1 默认和牌方式

默认：

```yaml
winMode: DISCARD
```

即 UI 默认“点炮”。

用户必须主动选择：

```text
自摸
```

系统不得根据牌型猜测。

## 13.2 圈风、门风

如果某结果可能受到圈风/门风影响而用户尚未填写：

- 允许进行结构分析；
- 允许识别与该上下文无关的番型；
- **不得给出最终正式总番数**；
- 结果状态必须是 `INCOMPLETE_CONTEXT` 或等价 Domain 状态。

不得默认“东圈 / 东家”。

---

# 14. 特殊和牌方式

## 14.1 杠上开花

```yaml
pattern: outWithReplacementTile
fan: 8
requiredContext:
  winMode: SELF_DRAW
  afterKongReplacement: true
```

## 14.2 抢杠和

```yaml
pattern: robbingTheKong
fan: 8
requiredContext:
  winMode: DISCARD
  robbingAddedKong: true
```

## 14.3 妙手回春

```yaml
pattern: lastTileDraw
fan: 8
requiredContext:
  winMode: SELF_DRAW
  wallLastDraw: true
```

## 14.4 海底捞月

```yaml
pattern: lastTileClaim
fan: 8
requiredContext:
  winMode: DISCARD
  lastDiscardAfterWallExhausted: true
```

## 14.5 和绝张

必须有足够上下文证明：

```text
该牌型四张中的其余三张均已明见
```

仅凭当前玩家手牌通常不能自动推断。

因此如果产品无法获得完整明牌信息：

- 默认让用户显式确认；
- 不得自动猜测。

---

# 15. 无番和

无番和：

```yaml
patternId: chickenHand
fan: 8
```

成立条件：

- 牌面构成合法和牌；
- 除花牌外，没有其他可计番型。

Resolver 必须在其他番型全部处理完成后判断无番和。

禁止：

```text
先识别“无番和”
→ 再同时计入其他番型
```

---

# 16. 计分模型

本规则只计算：

```text
番型番值合计
```

正式总番计算顺序：

```text
结构合法
→ 枚举全部合法拆分
→ 枚举有意义的胡牌张落点
→ Recognizer 识别
→ Relation Resolver 消除不应重复计入项
→ 合计番值
→ 加入花牌等允许附加项
→ 应用本次规则调整
→ 应用封顶（如本次规则启用）
→ Legality 判断
→ 在全部候选中选择最高合法结果
```

不得包含：

- 底分；
- 庄家倍数；
- 玩家之间支付关系；
- 点炮者支付额；
- 三家支付额；
- 房间倍率；
- 游戏豆；
- 金币；
- 筹码；
- 金额。

---

# 17. 多拆分

当同一牌面存在多个合法拆分时：

1. 必须全部枚举；
2. 每个拆分独立识别番型；
3. 每个拆分独立处理关系；
4. 每个拆分独立计算总番；
5. 比较最终合法结果；
6. 展示最高结果；
7. 并列最高全部保留。

禁止把：

```text
拆分 A 的番型
+
拆分 B 的番型
```

组合到同一结果。

---

# 18. 胡牌张落点

同一胡牌张可能在同一拆分中具有多个语义落点。

例如可能影响：

- 边张；
- 坎张；
- 单钓将；
- 暗刻判定；
- 其他依赖最后一张的番型。

Engine 必须枚举所有有意义落点，并将其视为独立 Candidate。

---

# 19. v0.1 明确排除的平台特有规则

以下行为即使在某些“大众麻将”平台存在，也**不属于本预设**：

- 庄家翻倍；
- 玩家开局选择加倍；
- VIP / 会员倍数；
- 房间倍率；
- 固定彩金；
- 胡后翻牌加番；
- 单独杠分牌局结算；
- 报听平台奖励番；
- 258 将平台奖励番；
- 天听等特定平台扩展；
- 平台活动番；
- 游戏豆/金币结算；
- 连庄金额关系。

这些能力不能因为参考来源中存在而进入 `common-simple@1.0.0`。

---

# 20. Quick Calc 中的规则行为

“快速算番”可使用本规则番型目录与关系，但：

- 不验证实际牌面；
- 用户选中的番型标记为“用户选择 / 未经牌面验证”；
- Relation Resolver 仍处理包含、互斥、不重复；
- minimumFan 仍为 0；
- 默认无封顶；
- 自摸 +1；
- 不能保存为正式牌例；
- 不能生成“已验证牌面”的正式分享结果。

---

# 21. 听牌与弃牌分析

听牌分析必须使用与正式结果完全相同的：

```text
RulePackage
Structure Registry
Pattern Recognizer
Relation Resolver
Scoring
Legality
```

不得实现“简化版能胡判断”。

合法待胡牌定义：

```text
加入该牌后
→ 构成当前规则支持的和牌结构
→ Context 足够
→ 当前规则 Legality 为合法
```

结构能和但 Context 不完整：

```text
PENDING
```

不得计入“确认可胡数量”。

---

# 22. 规则可调整项

`common-simple@1.0.0` 允许“调整本次规则”暴露以下受控参数：

```yaml
minimumFan:
  default: 0

cap:
  enabled: false
  value: null

selfDraw:
  mode: ADD
  value: 1

patterns:
  configurableEnabled: true
  configurableValue: true
```

约束：

- 只影响本次计算；
- 不修改系统 RulePackage；
- 新建牌面、切换规则或恢复预设后清除；
- 如果保存在 Draft/正式牌例/分享中，必须完整保存；
- Pattern Relation 算法不可被任意脚本修改。

---

# 23. 用户番型调整

用户可以：

- 取消系统已识别番型；
- 强制计入系统已识别但因关系被排除的番型。

用户不可以：

- 添加系统未识别番型；
- 新建番型；
- 改变基础合法性；
- 绕过结构合法性。

必须满足：

```text
FanAdjustment does not change BaseLegality
```

---

# 24. 支持状态

RulePackage 内建议：

```yaml
ruleId: common-simple
ruleVersion: 1.0.0
displayName: 大众麻将·通用简化版
family: 大众麻将
status: TESTING
```

在以下条件全部完成前不得升级为 `FULLY_SUPPORTED`：

1. 78 个启用番型全部存在正例；
2. 78 个启用番型全部存在关键反例；
3. 完整 Relation 表转录并通过测试；
4. 多拆分回归通过；
5. 胡牌张落点回归通过；
6. 七对回归通过；
7. 十三幺回归通过；
8. 花牌回归通过；
9. 自摸/点炮上下文回归通过；
10. 杠上开花/抢杠和/海底类回归通过；
11. 无番和回归通过；
12. 人工与来源交叉核验完成；
13. 无已知严重错算、漏算或合法性误判。

---

# 25. Rule Test Corpus 最低要求

## 25.1 每个番型

每个自动识别番型至少：

```text
1 个明确正例
1 个最容易误判的反例
```

## 25.2 高风险关系

至少覆盖：

- 大四喜关系链；
- 大三元关系链；
- 四杠关系链；
- 四暗刻关系链；
- 连七对 / 七对关系；
- 一色双龙会；
- 一色四同顺；
- 一色四节高；
- 清一色；
- 全双刻；
- 不求人 / 自摸；
- 双明杠 / 明杠；
- 双暗杠 / 暗杠；
- 双箭刻 / 箭刻；
- 边张 / 坎张 / 单钓将互斥；
- 无番和与其他番型互斥。

## 25.3 结构测试

至少覆盖：

```text
普通唯一拆分
普通多拆分
七对
十三幺
杠存在时的结构张数
有固定副露
胡牌张多落点
并列最高结果
```

## 25.4 不支持结构

以下牌型即使符合国标定义：

- 七星不靠；
- 全不靠；
- 组合龙；

在 `common-simple@1.0.0` 必须得到明确的：

```text
unsupported structure
```

而不是：

```text
invalid mahjong hand
```

---

# 26. 来源记录

## SRC-A01 中国麻将竞赛规则

用途：

- 和牌结构；
- 81 番体系；
- 番型定义；
- 番值；
- 五类计分原则；
- 不重复关系的规范性依据。

公开授权转载 PDF：

```text
https://mahjong-ca.org/wp-content/uploads/2019/07/mjgz060510.pdf
```

公开文本参考：

```text
https://zh.wikisource.org/zh-hant/中国麻将竞赛规则
```

来源等级：

```text
A
```

## SRC-B01 腾讯欢乐麻将：大众麻将定位

腾讯公开说明将“大众麻将”描述为：

- 基于国标玩法演变；
- 成胡即可；
- 低门槛；
- 使用 80 多种番型计分。

```text
https://majiang.qq.com/webplat/info/news_version3/7207/25932/25972/m16347/201611/523207.shtml
```

用途：

- 支持本预设采用“国标番型主干 + 无 8 番起和门槛”的产品方向。

来源等级：

```text
B
```

## SRC-B02 腾讯欢乐麻将：基本和牌介绍

```text
https://majiang.qq.com/webplat/info/news_version3/7207/31873/31888/35514/m18795/201805/719437.shtml
```

来源等级：

```text
B
```

## SRC-B03 腾讯 TMT 番表

```text
https://tmt.qq.com/act/a20150617hlmj/index.html
```

用途：

- 作为腾讯大众/赛事产品使用国标式番型体系的辅助交叉证据；
- 不将 TMT 的所有赛事扩展自动纳入本预设。

来源等级：

```text
B
```

## SRC-B04 联众大众麻将基本规则

```text
https://www.ourgame.com/game/game-intro-new/h2g/mj2_002.html
```

用途：

- 大众麻将和牌结构交叉验证；
- 识别高番房、庄家翻倍等平台特有机制；
- 这些平台特有机制不进入本预设。

来源等级：

```text
B
```

## SRC-B05 联众大众番种图例

```text
https://www.ourgame.com/game/game-intro-new/h2g/mj2_004.html
```

用途：

- 大众番型体系与花牌等内容交叉验证；
- 不能用“会员番种”等平台扩展覆盖本规范的国标事实主干。

来源等级：

```text
B
```

---

# 27. 来源冲突处理规则

如果未来发现：

```text
腾讯
≠
联众
≠
国标
```

按以下顺序处理。

### 番型定义与关系冲突

优先：

```text
《中国麻将竞赛规则》
```

除非产品明确决定为 `common-simple` 创建差异规则。

### 大众玩法门槛冲突

优先：

```text
腾讯 / 联众大众玩法共同特征
```

因此本版本为：

```text
minimumFan = 0
```

### 平台专属玩法

默认：

```text
不进入 common-simple
```

### 无法确认的事实

不得让 Codex / Engine 猜测。

处理为：

```text
DISPUTED
或
UNVERIFIED
```

并在规则百科中显示来源状态。

---

# 28. 与 Requirements Baseline 的关系

本规则事实文档是：

```text
docs/product/requirements-baseline-v1.2.md
```

中 `v0.1.0 大众麻将·通用简化版` 的规则事实补充。

Baseline 继续决定：

- 产品范围；
- 页面行为；
- 保存/分享行为；
- 版本路线；
- 调整能力；
- v0.1 支持结构范围。

本文决定：

- `common-simple` 具体牌组；
- 和牌结构配置；
- 番型目录；
- 番值；
- 起和门槛；
- 自摸；
- 花牌；
- 默认封顶；
- 规则来源；
- 番型关系的规范性来源。

两者不得互相静默覆盖。

---

# 29. 后续文档同步要求

本文已于 2026-08-10 获项目方批准，并已同步审计和更新：

```text
docs/product/requirements-baseline-v1.2.md
docs/product/requirements-audit.md
docs/product/spec.md
docs/architecture/architecture.md
docs/planning/plan.md
docs/planning/tasks.md
docs/AGENTS.md
```

至少需要：

1. 在 Baseline 中登记本规则事实规范路径和 Rule Version；
2. 修复 T403 对不存在“规则文档”的引用；
3. M2 加入完整 RulePackage Schema 和 RuleSource/Relation 转录任务；
4. M4 将 78 个启用番型的 Rule Test Corpus 纳入 Gate；
5. 明确 3 个当前不支持特殊结构；
6. 规则百科读取同一 Pattern Catalog；
7. Rule Update 使用独立 Rule Version；
8. 发布 Gate 检查 Rule Corpus 完整性。

---

# 30. 未来升级

## common-simple 1.0.x

只允许：

- 定义纠错；
- 关系纠错；
- 测试补充；
- 来源补充；
- 不改变既定产品定位的规则修复。

如果修复会改变既有牌例结果：

- 必须提升 Rule Version；
- 旧牌例保留旧结果；
- 用户主动选择重新计算。

## common-simple 1.1+

如果未来需要增加：

- 七星不靠；
- 全不靠；
- 组合龙；

必须先确认：

1. Domain Engine 已正式支持；
2. 当前版本范围允许；
3. Rule Test Corpus 完整；
4. 不会把 `common-simple` 与后续完整国标规则混为一谈。

---

# 31. 本版本冻结摘要

经批准，`common-simple@1.0.0` 的核心事实冻结为：

```yaml
ruleId: common-simple
ruleVersion: 1.0.0
displayName: 大众麻将·通用简化版

tileSet:
  suitedTiles: true
  honors: true
  flowers: true
  physicalTileCount: 144

handModel:
  targetStructuralTileCount: 14
  readyStructuralTileCount: 13
  requiredMeldCount: 4

structures:
  standard: true
  sevenPairs: true
  thirteenOrphans: true
  greaterHonorsAndKnittedTiles: false
  lesserHonorsAndKnittedTiles: false
  knittedStraight: false

legality:
  minimumFan: 0

scoring:
  model: ADDITIVE
  capEnabled: false

selfDraw:
  fan: 1

flower:
  fanPerTile: 1

patternCatalog:
  source: MCR_81_PATTERN_SYSTEM
  totalReferencePatterns: 81
  enabledPatterns: 78
  disabledForCurrentStructureScope: 3
```

---

# 32. 审批检查清单

项目方批准检查结果（确认日期：2026-08-10）：

- [x] 接受 `common-simple` 是“产品通用预设”，而非官方统一大众麻将；
- [x] 接受 144 张牌并包含 8 张花牌；
- [x] 接受普通结构 + 七对 + 十三幺；
- [x] 接受 v0.1 暂不支持七星不靠、全不靠、组合龙；
- [x] 接受最低起和为 0；
- [x] 接受国标番型定义与番值作为主干；
- [x] 接受自摸 +1；
- [x] 接受花牌每张 +1；
- [x] 接受默认不封顶；
- [x] 接受删除庄家翻倍、平台加倍、胡后翻牌等奖励机制；
- [x] 接受完整“不计关系”以《中国麻将竞赛规则》为规范性来源；
- [x] 接受当前状态先为 `TESTING`，完成 Rule Corpus 后再升为完整支持。

---

**文档结束**
