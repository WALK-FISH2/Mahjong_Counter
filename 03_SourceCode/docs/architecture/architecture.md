# 麻将番数计算器技术架构设计

> **Technical Architecture — Mahjong Fan Calculator**

## 文档元数据

- 文档名称：Technical Architecture
- 文档版本：`Architecture 1.0.0`
- 文档状态：已批准 / Active
- 制定日期：2026-08-07
- 项目方确认日期：2026-08-10
- 主要适用版本：`v0.1.0`
- 上游需求基线：[`requirements-baseline-v1.2.md`](../product/requirements-baseline-v1.2.md) — `Baseline 1.2`
- 上游一致性审查：[`requirements-audit.md`](../product/requirements-audit.md) — `PASS`
- 上游项目宪章：[`constitution.md`](../governance/constitution.md) — `Constitution 1.0.0`
- 上游产品规格：[`spec.md`](../product/spec.md) — `Spec 1.0.0`
- v0.1.0 规则事实规范：[`rule-spec-v1.0.md`](../rules/common-simple/rule-spec-v1.0.md) — `common-simple@1.0.0`
- 下游文档：`docs/planning/plan.md`、`docs/planning/tasks.md`、`docs/AGENTS.md`

---

# 1. 架构目标

本架构必须保证：

1. 规则正确性优先，不因性能或开发速度省略合法结构、拆分或番型关系。
2. 多地区规则由规则包与受控能力驱动，不复制多套计算器。
3. 正式结果可解释、可追踪、可复现。
4. 旧牌例保留保存时规则与结果，新版本不得静默覆盖。
5. 核心功能纯前端、Local-first、PWA 可离线。
6. 分享、导入和远程规则数据均按不可信输入处理。
7. 当前版本可扩展但不过度设计，不提前实现自定义规则、癞子和多人结算。
8. 计算 Domain 与 React/UI、存储、路由彻底解耦。
9. 规则引擎可通过标准牌例批量自动测试。
10. 代码边界足够明确，使人工开发者和 Codex 均不易误改规则逻辑。

---

# 2. 总体技术选型

推荐采用：

- **TypeScript**：全项目强类型。
- **React**：页面和交互。
- **Vite**：构建与开发。
- **Hash Router**：静态托管友好，同时让分享内容保留在 URL Fragment。
- **Zustand**：应用状态管理，业务修改只能通过 action/use-case。
- **Dexie**：IndexedDB 封装与数据迁移。
- **Zod**：规则包、分享、导入、备份的运行时 Schema 校验。
- **Web Worker**：胡牌、多拆分、听牌与弃牌分析后台执行。
- **Workbox / Vite PWA**：Service Worker、App Shell 和离线缓存。
- **Vitest**：Domain 和规则单元测试。
- **React Testing Library**：组件行为测试。
- **Playwright**：核心 E2E、响应式、导入分享与离线测试。
- **fast-check**：编解码、牌数限制、结果不变量等性质测试。
- **DEFLATE + Base64URL**：分享链接压缩编码；可采用轻量纯前端库实现。

不在架构中锁定第三方依赖的小版本；实际开发用 lockfile 固定。

---

# 3. 架构风格

采用 **模块化前端单体（Modular Monolith）**。

```text
Browser / PWA
├─ Presentation
│  ├─ Calculator
│  ├─ Encyclopedia
│  ├─ Saved Examples
│  └─ Settings
│
├─ Application
│  ├─ Use Cases
│  ├─ Stores
│  ├─ Undo/Redo
│  └─ Navigation Guards
│
├─ Domain
│  ├─ Mahjong Model
│  ├─ Rule Model
│  ├─ Structure Engine
│  ├─ Pattern Engine
│  ├─ Relation Resolver
│  ├─ Scoring / Legality
│  └─ Wait / Discard Analysis
│
├─ Worker Runtime
│
└─ Infrastructure
   ├─ IndexedDB
   ├─ Cache Storage
   ├─ Rule Repository
   ├─ Share Codec
   ├─ Import / Export
   ├─ Update
   └─ PWA
```

依赖方向：

```text
Presentation → Application → Domain
Infrastructure → 通过接口被 Application 调用
```

`domain/**` 禁止依赖：

- React；
- Zustand；
- Dexie；
- DOM；
- Router；
- Service Worker；
- IndexedDB；
- 网络请求。

---

# 4. 推荐目录结构

```text
src/
├─ app/
│  ├─ routes/
│  ├─ providers/
│  └─ bootstrap/
├─ pages/
│  ├─ calculator/
│  ├─ encyclopedia/
│  ├─ saved-examples/
│  └─ settings/
├─ features/
│  ├─ tile-input/
│  ├─ meld-input/
│  ├─ win-context/
│  ├─ result-view/
│  ├─ rule-switch/
│  ├─ temporary-rule-adjustment/
│  ├─ fan-adjustment/
│  ├─ share/
│  ├─ import-export/
│  └─ update/
├─ domain/
│  ├─ mahjong/
│  ├─ rules/
│  ├─ engine/
│  └─ analysis/
├─ application/
│  ├─ calculator/
│  ├─ examples/
│  ├─ rules/
│  ├─ commands/
│  └─ state/
├─ workers/
├─ infrastructure/
│  ├─ db/
│  ├─ rule-repository/
│  ├─ share/
│  ├─ import-export/
│  ├─ update/
│  └─ feedback/
├─ content/
│  ├─ rules/
│  └─ app-copy/
├─ components/
├─ schemas/
├─ styles/
└─ test/
   ├─ fixtures/
   ├─ rule-cases/
   └─ helpers/
```

---

# 5. 牌编码

长期数据使用稳定字符串代码，不使用图片文件名或数组位置作为身份。

```ts
type TileCode =
  | "m1" | "m2" | "m3" | "m4" | "m5" | "m6" | "m7" | "m8" | "m9"
  | "p1" | "p2" | "p3" | "p4" | "p5" | "p6" | "p7" | "p8" | "p9"
  | "s1" | "s2" | "s3" | "s4" | "s5" | "s6" | "s7" | "s8" | "s9"
  | "east" | "south" | "west" | "north"
  | "red" | "green" | "white"
  | "spring" | "summer" | "autumn" | "winter"
  | "plum" | "orchid" | "bamboo" | "chrysanthemum";
```

计算引擎内部可以映射为 `Uint8Array`、整数索引或 bitmask，但这些优化表示不得成为分享、备份和牌例的长期格式。

---

# 6. 牌面领域模型

```ts
type ChowMeld = {
  id: string;
  type: "chow";
  tiles: readonly [TileCode, TileCode, TileCode];
};

type PungMeld = {
  id: string;
  type: "pung";
  tile: TileCode;
};

type KongMeld = {
  id: string;
  type: "kong";
  tile: TileCode;
  exposure: "open" | "concealed";
  openKind?: "direct" | "added";
};

type Meld = ChowMeld | PungMeld | KongMeld;

type HandSnapshot = {
  concealed: TileCode[];
  melds: Meld[];
  flowers: TileCode[];
  winningTile: TileCode | null;
};
```

关键约束：

- `concealed` 保存原始录入顺序；
- 一键整理只影响展示，不覆盖原始顺序；
- 已完成吃、碰、杠只能进入 `melds`；
- 花牌独立于普通结构；
- 胡牌张始终独立；
- v0.1.0 不记录副露来源玩家、点炮者和一炮多响。

---

# 7. 临时副露录入状态

副露输入必须与正式牌面分开。

```ts
type TransientInputSession =
  | { kind: "none" }
  | { kind: "chow"; selected: TileCode[] }
  | { kind: "pung" }
  | { kind: "open-kong"; openKind?: "direct" | "added" }
  | { kind: "concealed-kong" }
  | { kind: "flower" };
```

流程：

```text
选择“吃/碰/杠/花”
→ 临时录入
→ 校验
→ 成功后写入 Meld/Flower
→ 清除临时状态
→ 默认返回手牌录入
```

未完成吃牌：

- 可在 Draft 中以 `transientInput` 恢复；
- 不得作为正式 `melds`；
- 不计正式结构张数。

---

# 8. CalculatorDocument

当前计算的唯一可序列化事实对象：

```ts
type CalculatorDocument = {
  schemaVersion: number;

  ruleRef: {
    ruleId: string;
    ruleVersion: string;
  };

  hand: HandSnapshot;
  context: WinContext;

  temporaryRuleAdjustment: TemporaryRuleAdjustment | null;
  fanAdjustments: FanAdjustment[];
  transientInput: TransientInputSession;

  source:
    | { kind: "new" }
    | { kind: "draft" }
    | { kind: "saved-example"; exampleId: string }
    | { kind: "shared" }
    | { kind: "imported" }
    | { kind: "encyclopedia-example"; exampleId: string };

  revision: number;
};
```

所有改变计算语义的操作递增 `revision`。

Worker 返回结果必须带同一个 revision。若不匹配当前文档，结果立即作废。

---

# 9. 和牌上下文模型

```ts
type WinMode = "discard" | "self-draw";

type WinContext = {
  mode: WinMode;
  values: Record<string, ContextValue>;
};
```

规则包负责声明上下文字段：

- ID；
- 类型；
- 是否必填；
- 显示条件；
- 互斥关系；
- 适用和牌方式。

例如：

```text
seatWind
roundWind
kongDraw
robbingKong
lastTile
lastDiscard
```

必须区分：

```text
unknown
false
```

门风、圈风等会影响结果时不得用隐式默认值。

---

# 10. RulePackage

规则包必须是**数据，不是代码**。

```ts
type RulePackage = {
  schemaVersion: number;

  manifest: RuleManifest;
  tileSet: TileSetDefinition;
  handModel: HandModelDefinition;
  structures: StructureDefinition[];
  contexts: ContextDefinition[];

  patterns: PatternDefinition[];
  relations: PatternRelationDefinition[];

  scoring: ScoringDefinition;
  legality: LegalityDefinition;
  temporaryAdjustments: TemporaryAdjustmentDefinition[];

  encyclopedia: EncyclopediaDefinition;
  sources: RuleSourceDefinition[];
};
```

`common-simple@1.0.0` 的 RulePackage 必须从 `docs/rules/common-simple/rule-spec-v1.0.md` 转录并通过 Schema 校验，至少固定：

```text
144 张牌（含 8 张花牌）
普通结构 + 七对 + 十三幺
七星不靠 / 全不靠 / 组合龙 = NOT_SUPPORTED_IN_V0_1
81 个参考番型 / 78 个启用番型 / 3 个禁用番型
minimumFan = 0
selfDraw = +1
flower = +1 / 张
cap.enabled = false
```

RulePackage、Encyclopedia 和 Rule Test Corpus 必须引用同一个 Pattern Catalog 与 Rule Version。任何转录差异必须作为构建错误处理，不得由代码自行“纠正”已批准 Rule Spec。

规则包禁止包含：

- JavaScript；
- 动态函数体；
- `eval`；
- 表达式解释器；
- 任意外部脚本；
- 任意网络请求指令。

新规则只能引用应用已内置的受控能力键。

---

# 11. Rule Manifest 与 Capability

```ts
type RuleManifest = {
  ruleId: string;
  ruleVersion: string;
  displayName: string;
  familyId: string;
  region?: string;

  status: "development" | "test" | "full";
  recommended?: boolean;

  engineCompatibility: {
    minEngineVersion: string;
    maxEngineVersion?: string;
    requiredCapabilities: string[];
  };

  releasedAt: string;
  contentHash: string;
};
```

Capability Registry 示例：

```text
structure.standard
structure.sevenPairs
structure.thirteenOrphans
recognizer.pureOneSuit
recognizer.allPungs
scoring.additive
```

规则加载时：

```text
Schema 校验
→ Capability 校验
→ Engine Compatibility 校验
→ 通过后才允许计算
```

缺少能力时可以百科只读，但不得冒险计算。

---

# 12. 动态牌种

```ts
type TileSetDefinition = {
  enabledTiles: TileCode[];
  maxCopies: Partial<Record<TileCode, number>>;
  groups: Array<{
    id: string;
    labelKey: string;
    tiles: TileCode[];
  }>;
};
```

选牌器完全读取 `enabledTiles`。

禁止：

```ts
if (ruleId === "sichuan") hideHonors();
```

因此 27、34、42 或未来其他牌种子集都自然成立。

---

# 13. 结构张数配置

```ts
type HandModelDefinition = {
  targetStructuralTileCount: number;
  readyStructuralTileCount: number;
  requiredMeldCount: number;

  allowedMeldTypes: Array<
    "chow" | "pung" | "open-kong" | "concealed-kong"
  >;

  openKongPolicy: {
    distinction: "undifferentiated" | "distinguished";
    allowedKinds: ReadonlyArray<"direct" | "added">;
  };

  maxDeclaredMelds: number;
  flowerPolicy: "none" | "separate";
};
```

当前普通 14 张规则：

```text
targetStructuralTileCount = 14
readyStructuralTileCount  = 13
requiredMeldCount          = 4
```

UI 可以自然显示“13/14”，但 Engine 不得到处硬编码这些值。

`openKongPolicy` 是明杠录入的数据契约：

- `allowedKinds` 是当前规则允许写入 `OpenKongMeld.openKind` 的白名单；允许 `open-kong` 时不得为空，不允许 `open-kong` 时必须为空；
- `distinguished` 表示规则要求在无法由流程唯一确定时显式区分 `direct / added`；
- `undifferentiated` 表示规则不要求用户额外手动选择。录入“直接开杠”或“由既有碰升级为杠”的流程仍可分别确定并保存实际 `openKind`，不得因此丢失 Domain 语义；
- UI / Application 必须读取本字段，不得根据 `ruleId` 特判。规则包仍只提供纯数据，不携带可执行代码。

`common-simple@1.0.0` 使用 `undifferentiated`，同时允许 `direct` 与 `added`；实际 `openKind` 由录入流程确定，不额外强迫用户选择。

---

# 14. 和牌结构注册表

规则包声明受控 `StructureKey`：

```ts
type StructureKey =
  | "standard-meld-pair"
  | "seven-pairs"
  | "thirteen-orphans"
  | "all-unrelated"
  | "seven-star-unrelated"
  | "knitted-straight";
```

v0.1.0 实现前三种；国标特殊结构随 v0.5.0 增加。

规则包只选择：

```text
启用哪些结构
```

实际算法始终由可信 App 代码实现。

---

# 15. 标准结构拆分算法

普通和牌：

```text
requiredMeldCount 个面子 + 1 对将
```

已声明副露数：

```text
declaredMeldCount = melds.length
```

暗手牌需要：

```text
requiredConcealedMeldCount
= requiredMeldCount - declaredMeldCount
```

算法采用：

```text
Tile Count Array
+ DFS
+ Memoization
+ Canonical Dedup
```

搜索原则：

1. 取最小索引非零牌；
2. 尝试刻子；
3. 序数牌尝试顺子；
4. 尝试将牌；
5. 递归；
6. 枚举全部合法拆分；
7. canonicalize 后去重。

禁止发现第一种可和拆分后直接退出。

---

# 16. 胡牌张落点

同一拆分中，胡牌张可能：

- 进入顺子；
- 进入刻子；
- 作为将；
- 在多个组合中均可解释。

一些番型依赖胡牌张落点，因此完整计算链必须是：

```text
Hand
→ Structure Decomposition
→ Winning Tile Placement
→ Pattern Recognition
```

而不是只判断“这副牌能和”。

---

# 17. Pattern Recognizer

```ts
type PatternDefinition = {
  patternId: string;
  name: string;
  aliases?: string[];

  recognizerKey: string;
  recognizerParams?: unknown;

  value: number | string;
  unit: string;
  enabled: boolean;

  sourceRefs: string[];
  confidence?: "high" | "medium" | "disputed";
};
```

Recognizer 接口：

```ts
type PatternRecognizer = (
  context: PatternRecognitionContext
) => PatternRecognition;
```

Recognizer 只负责：

> 番型是否成立，以及成立依据。

不负责：

- 包含；
- 互斥；
- 不重复；
- 封顶；
- 最终合法性；
- 用户人工调整。

---

# 18. 番型关系

支持受控关系：

```ts
type PatternRelation =
  | {
      type: "covers";
      winner: string;
      covered: string;
    }
  | {
      type: "mutually-exclusive";
      patterns: string[];
      resolution: "explicit-priority" | "highest-value";
      priority?: string[];
    }
  | {
      type: "non-repeat-group";
      groupId: string;
      patterns: string[];
      resolution: "explicit-priority" | "highest-value";
      priority?: string[];
    };
```

优先使用规则明确关系，不设置含糊的全局“高番自动覆盖低番”。

Rule Package 加载和 CI 阶段必须校验：

- patternId 唯一；
- relation 引用存在；
- 不允许无解循环；
- priority 合法。

---

# 19. Scoring Strategy

不同规则的计分策略通过可信注册表实现：

```ts
type ScoringStrategyKey =
  | "additive"
  | "fan-multiplier"
  | "table-based";
```

规则包只提供：

```ts
type ScoringDefinition = {
  strategyKey: string;
  unit: string;
  parameters: unknown;
  cap?: CapDefinition;
  extras?: ExtraScoringDefinition[];
};
```

若后续规则需要新策略：

```text
新增可信 App capability
→ 测试
→ 发布 App
→ 规则包再引用
```

禁止通过远程 JSON 执行公式脚本。

---

# 20. Legality 与 Score 分离

必须独立建模：

```ts
type LegalityResult =
  | { status: "legal" }
  | { status: "illegal"; reasons: LegalityReason[] }
  | {
      status: "incomplete-context";
      missingContextIds: string[];
    };
```

因此可以正确表达：

```text
结构成和
+ 有番型
+ 不达起胡门槛
= 按规则不能胡
```

也可以表达临时规则调整改变起胡门槛后的合法性变化。

---

# 21. 完整计算 Pipeline

```text
CalculatorDocument
        ↓
1. Normalize
        ↓
2. Hard Validation
        ↓
3. Rule Compatibility
        ↓
4. Context Completeness
        ↓
5. Structure Enumeration
        ↓
6. Winning Tile Placement
        ↓
7. Pattern Recognition
        ↓
8. Relation Resolution
        ↓
9. Score Aggregation
        ↓
10. Cap / Extra
        ↓
11. Legality
        ↓
12. Explanation
        ↓
13. Compare All Candidates
        ↓
Highest Legal Candidate(s)
```

每层均应是可独立测试的 Domain 模块。

---

# 22. Candidate 与系统预设计算结果

```ts
type CandidateResult = {
  decomposition: WinningDecomposition;
  winningTilePlacement: WinningTilePlacement;

  recognizedPatterns: RecognizedPattern[];
  countedPatterns: CountedPattern[];
  excludedPatterns: ExcludedPattern[];

  score: ScoreBreakdown;
  legality: LegalityResult;
  explanation: CalculationExplanation;
};
```

系统预设计算结果：

```ts
type SystemEvaluation = {
  ruleRef: RuleRef;
  candidates: CandidateResult[];
  highestLegalCandidateIds: string[];
  selectedCandidateId: string | null;

  status:
    | "legal-win"
    | "structural-win-but-illegal"
    | "not-winning"
    | "incomplete-context";
};
```

候选比较：

- 只比较合法结果；
- 保留所有并列最高；
- 使用稳定 Comparator；
- 不拼接不同拆分番型。

---

# 23. 三层结果

```ts
type LayeredEvaluation = {
  preset: SystemEvaluation;

  sessionRule?: {
    adjustment: TemporaryRuleAdjustment;
    evaluation: SystemEvaluation;
  };

  userAdjustment?: {
    baseLayer: "preset" | "session-rule";
    adjustment: FanAdjustment[];
    result: UserAdjustedScore;
  };
};
```

### System Preset / 系统预设结果

原始规则结果，永远保留。

### Session Rule / 本次规则结果

先生成 immutable `EffectiveRule`，再完整重算。

因此可以改变：

- 合法性；
- 番值；
- 门槛；
- 封顶。

### User Adjustment / 用户调整结果

只作用于已识别番型的计分展示层。

必须满足不变量：

```text
User Fan Adjustment 不得改变 Base Evaluation Legality
```

---

# 24. 临时规则调整

```ts
type TemporaryRuleAdjustment = {
  baseRuleRef: RuleRef;
  values: Record<string, AdjustmentValue>;
};
```

允许字段只来自：

```text
rule.temporaryAdjustments
```

应用：

```text
RulePackage
+ adjustment
→ validate
→ EffectiveRule
→ complete engine pipeline
```

原 RulePackage 视为 immutable，不得写回。

规则切换、新建牌面、恢复预设时清除；Draft、保存牌例、分享时保留。

---

# 25. 番型人工调整

```ts
type FanAdjustment =
  | { patternId: string; action: "exclude" }
  | {
      patternId: string;
      action: "force-include";
      confirmedConflictSignature?: string;
    };
```

只允许操作当前已经识别的 Pattern。

牌面变化后：

- 仍匹配 → 保留；
- 不再识别 → 标记失效，不计分；
- 冲突结构变化 → 需要重新确认。

禁止创建系统未识别番型。

---

# 26. 结构化 Explanation

Domain 输出解释树，不让 Result UI 自己拼规则逻辑。

```ts
type CalculationExplanation = {
  structure: ExplanationNode;
  patternNodes: ExplanationNode[];
  relationNodes: ExplanationNode[];
  scoringNodes: ExplanationNode[];
  legalityNodes: ExplanationNode[];
  sourceRefs: string[];
};
```

同一 Explanation 可用于：

- 结果摘要；
- 完整计算过程；
- 详细复制；
- 保存历史结果。

---

# 27. 听牌分析

对于待胡结构：

```text
遍历当前规则 enabledTiles
→ 跳过已达 maxCopies
→ 候选牌作为 winningTile
→ 调用正式 evaluate
→ 分类
```

分类：

```ts
type WaitCandidate =
  | { tile: TileCode; status: "legal"; best: CandidateResult }
  | {
      tile: TileCode;
      status: "pending-context";
      evaluation: SystemEvaluation;
    }
  | {
      tile: TileCode;
      status: "structural-only";
      reasons: LegalityReason[];
    };
```

听口数只统计 `legal`。

---

# 28. 弃牌后听牌

完整未和：

```text
遍历暗手牌 distinct TileCode
→ 删除一张
→ Wait Analysis
→ legal waits > 0 则产生弃牌候选
```

不得从：

- 副露；
- 花牌；
- 胡牌张；

生成弃牌候选。

相同暗手牌的多个副本可复用同一分析结果，UI 可对所有等价副本显示三角。

---

# 29. 分析缓存

Worker 内使用会话级 LRU Cache。

Key 至少包含：

```text
ruleId
ruleVersion
temporaryRuleAdjustmentHash
normalizedHand
context
winningTile
operation
```

缓存不持久化，不跨 Rule/Engine Version 偷用。

---

# 30. Web Worker

操作：

```ts
type EngineOperation =
  | "evaluate"
  | "wait-analysis"
  | "discard-to-ready";
```

请求/响应都带：

```text
requestId
documentRevision
```

收到结果时：

```text
response.documentRevision !== currentDocument.revision
→ discard
```

取消：

1. 逻辑取消：旧 requestId 永远不再接受；
2. 长任务需要时终止 Worker 并重建。

v0.1.0 不需要复杂 Worker Pool，优先单 Engine Worker。

---

# 31. Store 与业务 Action

推荐拆分：

```text
calculatorStore
settingsStore
ruleStore
savedExampleStore
uiStore
```

Calculator 只能通过 Action 修改：

```text
addConcealedTile
removeConcealedTile
startMeldInput
commitMeld
cancelMeldInput
setWinningTile
setContext
switchRule
applyTemporaryRuleAdjustment
setFanAdjustment
newHand
```

组件不得直接组装或修改 Domain 对象。

---

# 32. Undo / Redo

Undo/Redo 只属于当前会话。

覆盖：

- 加删牌；
- 替换胡牌张；
- 完成/删除副露；
- 上下文切换；
- 自动清除不兼容条件；
- 规则切换；
- 应用临时规则。

刷新后：

- 当前 Draft 可恢复；
- Undo 历史清空。

不做 Event Sourcing。

---

# 33. 待修正状态

统一：

```ts
type CorrectionIssue = {
  issueId: string;
  code: string;
  location: CorrectionLocation;
  messageKey: string;
};
```

存在 blocking issue：

```text
NEEDS_CORRECTION
```

允许：

- 编辑；
- 保存 Draft。

禁止：

- 正式分析；
- 保存牌例；
- 生成正式分享链接。

不得自动删除异常输入。

---

# 34. Hash 路由

推荐：

```text
/#/calculator
/#/rules
/#/rules/{ruleId}
/#/rules/{ruleId}/patterns/{patternId}
/#/saved
/#/saved/{exampleId}
/#/settings
/#/share/{payload}
```

分享 Payload 位于 Fragment，不需要服务器路由重写，也不会作为普通 HTTP 查询参数发送给静态服务器。

规则与 Pattern URL 必须使用稳定 ID，不使用显示名称作为主键。


# 35. 分享 Codec

流程：

```text
SharePayload
→ Zod validate
→ canonical JSON
→ UTF-8
→ DEFLATE
→ Base64URL
→ URL Fragment
```

反向：

```text
Fragment
→ Base64URL decode
→ inflate
→ JSON parse
→ Schema validate
→ compatibility validate
→ preview
→ open
```

要求：

- 明确 share format version；
- 字段顺序 canonicalize；
- 不序列化无关 UI 状态；
- 超过 `MAX_SAFE_SHARE_URL_LENGTH` 时直接改用单牌例 JSON；
- 禁止截断；
- Base64URL 和压缩不得描述为加密。

---

# 36. SharePayload

```ts
type SharePayloadV1 = {
  format: "mahjong-share";
  version: 1;

  contentType:
    | "legal-win"
    | "cannot-win"
    | "ready-analysis";

  calculator: ShareableCalculatorState;
  resultSnapshot?: ResultSnapshot;
};
```

`INCOMPLETE_CONTEXT` 不属于 `SharePayloadV1.contentType`。必要上下文补全并重新得到正式可分享结果前，Application 必须拒绝生成正式分享 Payload。

不包含：

- 其他已保存牌例；
- 草稿历史；
- 主题；
- 无关偏好；
- 用户身份信息。

打开分享时必须先在隔离内存中解码和校验，未确认替换前不得覆盖当前 Draft。

---

# 37. 本地存储分层

## localStorage

仅轻量偏好：

```text
theme
lastRuleRef
readySortMode
defaultCopyFormat
reducedMotionOverride
autoUpdateCheckEnabled
testRuleConfirmations
pwaPromptState
lastUpdateCheckAt
```

## IndexedDB

保存：

```text
savedExamples
trashExamples
draft
ruleSnapshots
rulePackageMetadata
migrationBackups
```

## Cache Storage

保存：

```text
App Shell
静态 JS/CSS/图标
核心规则
核心百科
已明确下载的可选规则包
```

用户牌例不得放入 HTTP Cache。

---

# 38. IndexedDB 数据模型

推荐数据库：

```text
MahjongFanCalculatorDB
```

### savedExamples

```ts
type SavedExampleRecord = {
  id: string;
  name: string;

  createdAt: string;
  modifiedAt: string;

  calculator: PersistedCalculatorState;
  resultSnapshot: SavedResultSnapshot;

  ruleRef: RuleRef;
  engineVersion: string;
  dataSchemaVersion: number;
};
```

`createdAt` 可作为内部审计字段，产品主列表仍按 `modifiedAt`。

### trashExamples

与 SavedExample 基本相同，增加：

```ts
trashedAt: string;
```

移入/恢复回收站不得更新业务 `modifiedAt`。

### draft

唯一记录：

```ts
type DraftRecord = {
  key: "current";
  savedAt: string;
  calculator: CalculatorDocument;
  editingOrigin?: {
    savedExampleId: string;
  };
};
```

### ruleSnapshots

```ts
type RuleSnapshotRecord = {
  snapshotId: string;
  ruleRef: RuleRef;
  contentHash: string;
  payload: MinimalRuleSnapshot;
};
```

---

# 39. Saved Result Snapshot

每个已保存牌例必须保存当时结果，而不仅是牌面。

```ts
type SavedResultSnapshot = {
  presetResult: SerializableEvaluation;
  sessionRuleResult?: SerializableEvaluation;
  userAdjustedResult?: SerializableUserAdjustment;

  highestCandidateIds: string[];
  lastViewedCandidateId?: string;
  lastViewedLayer?: "preset" | "session-rule" | "user-adjusted";

  ruleRef: RuleRef;
  engineVersion: string;
};
```

作用：

- 历史结果永远可查看；
- 新引擎无法运行旧规则时仍可只读；
- 最新规则试算不覆盖原结果。

---

# 40. Minimal Rule Snapshot

旧牌例不必复制整个百科，但要保留必要规则事实：

```text
manifest 基本信息
tile set
hand model
structure capabilities
必要 contexts
相关 patterns
相关 relations
scoring
legality
必要 source 摘要
```

Recognizer 仍来自受信 App Engine。

若旧 Engine 能力已不兼容：

- 展示 Saved Result Snapshot；
- 不下载和执行历史 JS；
- 不假装完成旧规则重算。

---

# 41. 旧牌例打开流程

```text
读取 Saved Example
→ 立即展示保存时 Result Snapshot
→ 检查 Rule Snapshot / Rule Package
→ 检查 Engine Capability
```

若兼容：

- 可以按原版本重算。

若不兼容：

- 进入 `read-only-legacy`；
- 保留原结果；
- 不猜测计算。

若存在最新规则：

- 用户可主动“按最新规则试算”；
- 试算结果不自动覆盖；
- 最终由用户选择更新或另存。

---

# 42. 数据格式版本

必须独立维护：

```text
APP_VERSION
ENGINE_VERSION
DATABASE_SCHEMA_VERSION
BACKUP_FORMAT_VERSION
SINGLE_EXAMPLE_FORMAT_VERSION
SHARE_FORMAT_VERSION
RULE_VERSION
```

禁止仅凭 App Version 猜测所有格式。

构建常量、持久记录和导入导出 Schema 必须使用上述精确名称；`DATA_SCHEMA_VERSION` 不得含糊地同时代表 Database、Backup 和 Single Example。Rule Version 由每个不可变 RulePackage 独立维护，例如 `common-simple@1.0.0`。

---

# 43. 完整备份

```ts
type FullBackup = {
  format: "mahjong-backup";
  version: number;
  exportedAt: string;
  appVersion: string;

  savedExamples: ExportedSavedExample[];
  trashExamples: ExportedSavedExample[];
  draft?: ExportedDraft;
  settings: ExportedSettings;
  ruleSnapshots: ExportedRuleSnapshot[];

  integrity: IntegrityDescriptor;
};
```

v0.1.0～v1.0.0 不生成真实 `customRules` 数据，但 Schema 可预留未来扩展字段。

---

# 44. 覆盖恢复事务

流程：

```text
导入文件
→ 全量 Schema/版本/完整性校验
→ 自动导出当前本地安全备份
→ 迁移导入数据到 staging model
→ 开启 IndexedDB transaction
→ 替换目标表
→ commit
```

任一步失败：

```text
abort
→ 当前数据库保持原样
```

禁止半导入状态。

## 44.1 数据库迁移服务

数据库升级必须通过独立 `MigrationService` / Application Use Case 执行：

```text
读取 DATABASE_SCHEMA_VERSION
→ 判断迁移路径
→ 生成迁移前本地安全备份
→ 在 staging / transaction 中迁移
→ 校验记录与引用
→ commit
```

失败时：

- 回滚到迁移前数据库；
- 保留安全备份；
- 无法可靠迁移的数据进入只读预览；
- 不静默删除 Saved Example、Draft、Settings 或 Rule Snapshot。

Migration Test Harness 只负责证明该服务，不能替代迁移服务本身。

---

# 45. 合并导入

外部 ID 一律视为 foreign ID。

```text
foreign ID
→ generate local ID
→ build mapping
→ rewrite references
→ insert
```

禁止根据 imported ID 覆盖现有牌例。

名称重复照常导入。

可以使用文件 fingerprint 轻提示：

> 此备份可能已经导入过。

但不阻止用户继续。

---

# 46. 单牌例文件

```ts
type SingleExampleFile = {
  format: "mahjong-example";
  version: number;

  name?: string;
  calculator: PersistedCalculatorState;
  resultSnapshot?: SavedResultSnapshot;

  ruleSnapshot: MinimalRuleSnapshot;
  engineVersion: string;
  integrity: IntegrityDescriptor;
};
```

导入：

```text
选择文件
→ 校验
→ 预览
→ 临时打开
→ 用户主动保存（可选）
```

不自动写入 Saved Example。

---

# 47. 外部数据安全

所有分享和 JSON：

```text
unknown
→ Zod parse
→ size/range validation
→ compatibility validation
→ typed value
```

必须限制：

- 文件大小；
- 解压后大小；
- JSON 深度；
- 字段数量；
- 数组长度；
- 牌数；
- 数值范围；
- 规则包大小。

这里的“安全输入上限”与“用户牌例不设业务数量上限”不是同一概念。

禁止：

```ts
JSON.parse(x) as Backup
```

直接强转。

---

# 48. 完整性校验

推荐使用：

```text
SHA-256
```

通过 `crypto.subtle.digest`。

用途：

- 检测数据损坏；
- 校验规则包 manifest；
- 辅助重复导入提示。

SHA-256 Hash **不是来源签名**。不得宣传成防恶意篡改的签名机制。

---

# 49. Rule Repository

Application 仅通过接口访问规则：

```ts
interface RuleRepository {
  getInstalledRule(ref: RuleRef): Promise<RulePackage>;
  listInstalledRules(): Promise<RuleManifest[]>;
  listAvailableRules(): Promise<RuleManifest[]>;
  downloadRule(ref: RuleRef): Promise<void>;
  removeRule(ref: RuleRef): Promise<void>;
}
```

页面和 Calculator Store 不直接操作 Cache Storage 或 fetch Rule JSON。

---

# 50. 规则包目录与不可变版本

推荐：

```text
/rules/index.json
/rules/{ruleId}/{ruleVersion}/manifest.json
/rules/{ruleId}/{ruleVersion}/rule.json
/rules/{ruleId}/{ruleVersion}/encyclopedia.json
```

已发布的 `(ruleId, ruleVersion)` URL 视为不可变。

任何会改变：

- 和牌合法性；
- 番型识别；
- 番值；
- 关系；
- 门槛；
- 封顶；

的修复都发布新 Rule Version。

---

# 51. 规则包安装事务

```text
fetch manifest
→ validate manifest
→ verify capability
→ fetch versioned files
→ hash verify
→ RulePackage Schema validate
→ write staging cache
→ write metadata
→ mark installed
```

失败：

```text
删除 staging
→ 保留原规则
```

不得加载“半套规则”。

---

# 52. 核心规则与可选规则

v0.1.0 的“大众麻将·通用简化版”必须随 App 内置，且使用与后续规则完全相同的 RulePackage Pipeline。

禁止把首版写成：

```ts
if (v0_1) useHardcodedCommonRules();
```

后续规则：

- 可以按需下载；
- 下载成功后离线；
- 未下载且离线时不可使用；
- 不能偷偷替换旧版本。

---

# 53. Rule Update

静态更新索引示意：

```json
{
  "rules": [
    {
      "ruleId": "common-simple",
      "latestVersion": "1.1.0",
      "status": "full",
      "manifestUrl": "..."
    }
  ]
}
```

Rule Update Discovery 与 App `version.json` 检查是两个独立通道，但共享本地更新偏好与低频调度：

- 自动检查可关闭；
- 自动检查每天最多一次；
- Settings 可分别手动检查 App 与 Rule 更新；
- Rule 检查只读取静态规则索引；
- 请求不得携带牌面、牌例、设置或设备唯一标识。

发现新规则版本：

- 提示；
- 展示变化；
- 用户主动升级；
- 当前旧牌例不变化。

---

# 54. App Update

静态：

```text
/version.json
```

至少包含：

```text
appVersion
releasedAt
release notes reference
```

自动检查：

- 每天最多一次；
- 不附带牌面、牌例或设备唯一标识。

发现更新：

```text
立即更新
稍后
查看更新内容
```

更新前先保护 Draft。

Service Worker 必须使用“提示更新”思路，不得让新业务版本静默改变当前计算状态。

---

# 55. PWA Cache 策略

| 资源 | 策略 |
|---|---|
| App Shell | precache / versioned |
| 核心规则 | precache |
| 核心百科 | precache |
| 可选规则包 | 用户明确下载后缓存 |
| 规则更新索引 | 用户/低频更新检查 |
| App version metadata | network-first |
| 用户牌例 | IndexedDB |

可选 Rule Package 不采用会静默换版本的 `stale-while-revalidate`。

---

# 56. 多标签页编辑锁

使用：

- `BroadcastChannel` 优先；
- 浏览器降级机制作为 fallback；
- heartbeat/expiration 避免异常关闭永久锁死。

```text
Tab A = primary editor
Tab B = read only
B 点击“在此窗口继续编辑”
→ takeover
→ A 转 read only
```

锁只保护当前 Calculator/Draft 编辑，不影响百科和只读牌例。

---

# 57. Draft 写入

CalculatorDocument 发生有效变化：

```text
dirty
→ debounce ~500ms
→ save draft
```

另外在：

- `visibilitychange`；
- 路由将替换 Calculator；
- 刷新/离开可捕获时；

尽力立即写入。

浏览器被操作系统强杀时无法保证最后一次同步写入，产品不承诺浏览器无法提供的绝对保证。

---

# 58. Replace Guard

所有可能替换当前计算的功能统一走：

```ts
prepareToReplaceCalculator(reason)
```

包括：

- 新建牌面；
- 分享链接；
- 单牌例导入；
- 打开其他保存牌例编辑；
- 百科示例带入。

负责：

1. 保存 Draft；
2. 检查未保存修改；
3. 必要时确认；
4. 再替换。

禁止每个页面各写一套不一致的丢数据逻辑。

---

# 59. 路由返回与 Modal Stack

返回键优先级：

```text
Modal 打开      → 关闭 Modal
详情页           → 返回列表
模块内部历史      → 返回上层
Calculator Root  → 浏览器自然返回
```

路由切换本身不销毁 Calculator Store。

---

# 60. Temporary Mode

持久化能力：

```ts
type PersistenceMode =
  | "persistent"
  | "temporary";
```

IndexedDB 不可用或配额失败时：

允许：

- 录牌；
- 分析；
- 复制；
- 分享；
- 单牌例导出。

禁止/暂停：

- 保存牌例；
- Draft 恢复；
- 完整导入；
- 其他依赖持久写入的功能。

任何保存按钮都必须在写入成功后才显示成功状态。

---

# 61. 浏览器能力检测

启动检测：

```ts
type BrowserCapabilities = {
  persistentPreferences: boolean;
  indexedDb: boolean;
  cacheStorage: boolean;
  serviceWorker: boolean;
  pwaInstall: boolean;
  webWorker: boolean;
  fileInput: boolean;
  fileSystemAccess: boolean;
  clipboard: boolean;
  webShare: boolean;
};
```

该检测覆盖 Web Worker、IndexedDB、Cache Storage、Service Worker / PWA、Clipboard、Web Share 与 File APIs；检测依据实际能力而非 User-Agent。非核心能力缺失只降级，不阻断计算。

例如：

- Web Worker 不可用 → 在主线程使用同一确定性 Engine，并提示性能/取消能力可能受限；不得返回近似结果；
- IndexedDB 不可用 → 进入 Temporary Mode；
- Cache Storage / Service Worker 不可用 → 仍作为联网网页使用；
- Clipboard 不可用 → 显示可手动复制文本；
- Web Share 不可用 → 仍复制链接；
- PWA 安装不可用 → 仍作为网页使用；
- 高级 File API 不可用 → 回退到 `<input type="file">` 与普通下载。

---

# 62. 隐私架构

默认不建设业务远程 API。

正式应用不应存在：

```text
POST /analytics
POST /hands
POST /history
POST /errors
```

允许网络：

1. 当前静态应用资源；
2. 规则包；
3. 更新元数据；
4. 用户主动点击外部 GitHub/邮件反馈。

牌面、草稿、牌例、设置默认只保存在本地。

---

# 63. Feedback

可以准备：

```ts
type FeedbackInfo = {
  appVersion: string;
  engineVersion: string;
  ruleRef?: RuleRef;
  errorCode?: string;
  browserSummary?: string;

  optionalHand?: HandSnapshot;
  optionalResult?: SerializableEvaluation;
};
```

默认不附：

- hand；
- result。

用户勾选后才加入，提交前展示最终文本。

---

# 64. Error Taxonomy

建议错误码类别：

```text
INPUT_VALIDATION
RULE_INCOMPATIBLE
RULE_PACKAGE_INVALID
ENGINE_CAPABILITY_MISSING
ANALYSIS_ABORTED
ENGINE_INTERNAL
STORAGE_UNAVAILABLE
STORAGE_QUOTA
IMPORT_SCHEMA
IMPORT_VERSION
IMPORT_INTEGRITY
SHARE_DECODE
MIGRATION_FAILED
UPDATE_FAILED
```

生产 UI 展示安全错误码和可操作建议，不直接暴露内部 stack。

---

# 65. UI 组件边界

```text
CalculatorPage
├─ CalculatorHeader
├─ RuleBadge
├─ TilePalette
├─ HandBoard
│  ├─ ConcealedHand
│  ├─ MeldGroupList
│  ├─ FlowerGroup
│  └─ WinningTileSlot
├─ MeldInputDialog / BottomSheet
├─ WinContextPanel
├─ AnalyzeActionBar
└─ AnalysisResult
   ├─ ResultSummary
   ├─ ArrangedHand
   ├─ PatternList
   ├─ LayerSwitcher
   ├─ ExplanationPanel
   ├─ WaitAnalysisPanel
   └─ ResultActions
```

移动和桌面可以采用不同布局容器，但必须调用同一 Application Actions。

---

# 66. “统一展示”不等于“统一数据”

最新产品交互把副露完成后放在统一已录入牌面中展示。

架构必须保持：

```text
concealed
melds
flowers
winningTile
```

四类独立。

不得为了 UI 简单把所有牌拍平成一个 `tiles[]` 再靠 CSS 判断哪些是副露。

---

# 67. 主题与无障碍

主题通过 Design Tokens，而非组件硬编码颜色。

支持：

```text
system
light
dark
```

牌按钮语义示例：

```html
<button aria-label="六万">
  <img alt="" />
</button>
```

避免图片与按钮重复朗读。

分析状态用合适 live region 提示：

```text
正在分析
分析完成
计算失败
```

不能让大量结果在每次微调时全部自动朗读。

---

# 68. Reduced Motion

统一：

```ts
type MotionPreference = "system" | "reduced" | "full";
```

核心流程不得依赖动画完成。

`prefers-reduced-motion` 与用户手动设置共同决定实际动画等级。

---

# 69. 响应式架构

布局按能力区分：

```text
compact
medium
wide
```

原则：

- compact：单列、底部导航、悬浮操作条；
- wide：左右布局；
- 中间尺寸平滑过渡；
- 不因为布局改变计算逻辑。

具体像素断点在 UI 实现与真实设备测试中确定，不写入 Domain。

---

# 70. 麻将牌资产

```text
assets/tiles/{setId}/{tileCode}.svg|png
```

维护资产清单：

```ts
type TileAssetManifest = {
  setId: string;
  author: string;
  license: string;
  source?: string;
  modified: boolean;
};
```

图像仅是 Presentation，TileCode 才是业务身份。

应用身份资产独立维护：

```text
assets/app/icon-*.png|svg
assets/app/favicon.*
```

应用图标必须是原创或合法授权的像素风幺鸡，并由同一资产事实生成 favicon、PWA icons 和默认分享标识。所有应用图标与麻将牌资产都必须进入 Asset Manifest，记录 author、source、license、modified，并在目标最小尺寸执行可读性验收。

---

# 71. 百科架构

计算规则与百科内容同版本但分文件：

```text
rule.json
encyclopedia.json
```

百科：

```ts
type EncyclopediaDefinition = {
  intro: ContentBlock[];
  patternArticles: PatternArticle[];
  examples: EncyclopediaExample[];
  sourceArticles: SourceArticle[];
  knownLimitations: ContentBlock[];
};
```

使用稳定：

```text
patternId
sourceId
exampleId
```

关联，不能用中文显示名作为数据库键。

---

# 72. 百科 Markdown 安全

若采用 Markdown：

允许：

- 标题；
- 段落；
- 列表；
- 表格；
- 强调；
- 受控链接。

默认禁止 raw HTML。

禁止：

- script；
- iframe；
- 内联事件；
- 任意第三方脚本。

规则内容不可信时不得直接 `dangerouslySetInnerHTML`。

---

# 73. 百科示例与测试

百科示例：

```ts
type EncyclopediaExample = {
  exampleId: string;
  title: string;
  hand: HandSnapshot;
  context: WinContext;
  expected: ExpectedResultSummary;
};
```

推荐让百科示例引用已经通过的 Rule Test Fixture。

原则：

```text
Rule Tests = 完整技术测试集
Encyclopedia Examples = 精选可读子集
```

Development Rule 的例子只展示，不带入正式 Calculator。

---

# 74. Quick Calc

Quick Calc 复用：

- Rule Package；
- Pattern Relation Resolver；
- Scoring Strategy；
- 起胡/封顶逻辑。

不调用：

- Hand Structure Engine；
- 自动 Pattern Recognizer；
- Ready Analysis。

```ts
type QuickCalcInput = {
  ruleRef: RuleRef;
  selectedPatternIds: string[];
  context: WinContext;
};
```

结果必须标记：

```text
unverifiedByHand = true
```

不能进入 Saved Example，也不生成牌例分享链接。

---

# 75. Result Text Formatter

复制结果使用独立 Formatter：

```ts
formatResultText({
  format: "simple" | "detailed",
  language: "zh-CN",
  evaluation,
  hand,
  rule
})
```

禁止直接复制 DOM `innerText`。

这样才能稳定保证：

```text
吃牌：🀙 🀚 🀛（一筒 二筒 三筒）
```

以及牌组、版本、调整等结构一致。

---

# 76. 国际化扩展边界

v0.1.0 只有简体中文。

Domain 输出：

```text
reasonCode
data
```

而不是硬编码中文错误字符串。

UI 负责将代码映射成中文。

首版不必引入复杂国际化平台，但计算引擎中禁止散落中文 UI 文案。

---

# 77. 测试架构

## Unit

- Tile validation
- Meld validation
- Structure algorithms
- Winning tile placement
- Recognizers
- Relation resolver
- Scoring
- Legality
- Temporary adjustments
- Fan adjustments
- Serialization
- Migration

## Rule Case

- 每个番型正例；
- 易误判反例；
- 包含；
- 互斥；
- 不重复；
- 门槛；
- 封顶；
- 自摸/点炮；
- 特殊条件；
- 多拆分；
- 并列最高；
- 听牌；
- 弃牌后听牌；
- 历史 Bug。

## Component

- Tile Palette；
- Meld Input；
- Context；
- Result；
- Dialog；
- Saved Example。

## E2E

- 手机；
- 桌面；
- 分享；
- 导入导出；
- Draft；
- 多标签页；
- PWA/离线；
- 更新与迁移。

---

# 78. Rule Test Case

```ts
type RuleTestCase = {
  id: string;
  ruleRef: RuleRef;
  title: string;
  tags: string[];

  calculator: TestCalculatorState;

  expected: {
    status: string;
    score?: unknown;
    mustRecognize?: string[];
    mustNotRecognize?: string[];
    mustCount?: string[];
    mustExclude?: string[];
    highestSolutionCount?: number;
  };

  sourceRefs?: string[];
};
```

规则数据必须能在 CI 中批量跑，不依赖 React。

---

# 79. 历史 Bug 回归

规则 bug 修复流程：

```text
创建能复现 bug 的失败牌例
→ 测试确认失败
→ 修改 Engine/Rule
→ 测试通过
→ 永久保留该测试
```

不能只修代码、不增加回归。

---

# 80. Property-based Tests

推荐关键不变量：

```text
任意合法操作后普通牌数量 <= maxCopies
decode(encode(x)) == canonicalize(x)
load(save(document)) == document
Fan Adjustment 不改变 Base Legality
同输入/规则多次计算结果稳定
```

---

# 81. 性能架构

目标：

- 普通和牌识别与番数计算：目标 ≤ 1 秒；
- 完整听牌/弃牌分析：目标 ≤ 3 秒；
- >0.5 秒：显示分析状态；
- >5 秒：提示耗时并允许取消。

优化手段：

- Count Array；
- DFS Memoization；
- Candidate Dedup；
- Derived Facts 复用；
- Worker；
- LRU Cache；
- distinct discard 分析；
- React selectors；
- 延迟加载非核心页面。

禁止为了性能减少合法候选。

---

# 82. 内存优化

引擎必须完整比较全部合法方案，但不必将所有低分 Candidate 长期保存在 React State。

允许：

```text
完整计算
→ 比较
→ 保留最高/并列最高的完整详情
→ 低分结果释放
```

前提：

- 不影响全局最高；
- 不影响并列；
- 不影响“结构成和但非法”的必要说明。

---

# 83. CI Gate

普通 CI：

```text
lint
typecheck
unit
rule-case tests
component tests
build
```

正式发布增加：

```text
Playwright core E2E
import/export roundtrip
migration tests
offline/PWA smoke
performance regression review
```

其中 Save、Restore、Import、Share、Migration 必须作为五条独立链路分别得到通过记录；不能用单一 smoke 或“无已知严重故障”代替。

规则标为 `full` 前还需要人工规则交叉核对。

---

# 84. Build-time Rule Validation

内置规则在构建时：

```text
Schema validate
→ ID uniqueness
→ relation graph validate
→ capability validate
→ source ref validate
→ example ref validate
→ rule case tests
```

对 `common-simple@1.0.0` 还必须校验：

- 81 个参考 Pattern ID 全部与 Rule Spec 对齐；
- 78 个启用番型都有正例和关键反例；
- 七星不靠、全不靠、组合龙保持禁用并返回 `unsupported structure` 语义；
- minimumFan、自摸、花牌、封顶及平台特有规则排除项没有漂移；
- RulePackage、Encyclopedia 与 Rule Test Corpus 使用同一 Rule Version。

任一关键错误应阻断构建/发布。

---

# 85. 规则版本语义

通常必须 Rule Version bump：

- Pattern recognizer 行为变化；
- Pattern value 变化；
- Pattern relation 变化；
- 起胡门槛变化；
- 封顶变化；
- Context 规则变化；
- 和牌结构变化。

通常只需 App Version：

- CSS；
- 文案；
- 布局；
- 结果完全不变的性能优化。

若 Engine Bug 改变某规则结果：

- Engine Version bump；
- 受影响 Rule Version/兼容声明同步处理；
- 新增回归测试。

---

# 86. Rule ID / Pattern ID

必须稳定，不能用显示名称做唯一主键。

原则示例：

```text
ruleId: common-simple
patternId: pure-one-suit
global ref: common-simple:pure-one-suit
```

`common-simple@1.0.0` 的 Rule ID、Rule Version 和 81 个 Pattern ID 已由 `docs/rules/common-simple/rule-spec-v1.0.md` 冻结，不得在实现阶段自行改名。未来其他规则的具体 ID 可在各自规则事实规范落地时确定，但一旦发布不应随显示名称变化。

大众麻将与国标麻将必须拥有独立 Rule ID。

---

# 87. 数据确定性

同样的：

```text
CalculatorDocument
RulePackage
EngineVersion
```

必须得到相同 `SystemEvaluation`。

不得依赖：

- 当前时间；
- 随机数；
- 网络；
- UI 排列；
- 非稳定对象遍历顺序。

Candidate 使用显式稳定排序。

---

# 88. 时间与 ID

时间持久化使用 ISO 8601。

本地记录 ID 推荐：

```ts
crypto.randomUUID()
```

名称不参与唯一性。

导入时所有外部 ID 重新分配本地 ID。

---

# 89. 安全边界

主要风险：

1. 恶意 JSON；
2. 恶意分享链接；
3. 恶意/损坏 Rule Package；
4. 百科 XSS；
5. 超大 Payload 前端 DoS；
6. 缓存不一致；
7. 数据迁移损坏。

防护：

- Zod；
- Payload limits；
- 不执行动态代码；
- Markdown raw HTML 默认禁止；
- versioned immutable rule URL；
- content hash；
- CSP；
- IndexedDB transactions；
- read-only fallback。

---

# 90. CSP 原则

部署时应尽量采用：

```text
script-src 'self'
connect-src 'self'
img-src 'self' data:
```

并根据实际构建产物调整。

禁止为了省事长期依赖 `unsafe-eval`。

外部反馈链接由用户主动点击，不需要给第三方站点开放脚本权限。

---

# 91. 第三方依赖准入

新增依赖前检查：

- 是否必要；
- Bundle 成本；
- 是否破坏离线；
- 是否默认联网；
- 是否包含遥测；
- 维护情况；
- CSP 影响；
- 能否被更小方案替代。

禁止接入默认自动上传行为数据的 Analytics SDK。

---

# 92. 未来自定义规则边界

当前不实现，但架构保留：

- immutable RulePackage；
- Rule Repository；
- Capability Registry；
- Pattern Recognizer Registry；
- Scoring Strategy Registry；
- stable RuleRef；
- Temporary Adjustment 独立。

不提前开发：

- 自定义规则编辑器；
- 空白规则；
- 任意规则 DSL；
- 用户 JavaScript；
- 可执行公式。

未来自定义规则仍只能引用受信 Capability。

---

# 93. 未来癞子边界

当前所有 `TileCode` 都代表确定牌义。

未来癞子更适合建模为：

```text
physical tile
+
rule-defined wildcard role
```

而不是现在先把“癞子”塞进普通牌类型。

v0.1.0 不实现任何 wildcard resolution，也不显示占位 UI。

---

# 94. v2.0 多人模块边界

未来多人分数结算建议独立：

```text
domain/settlement/
```

Calculator 只输出：

- 手结果；
- 规则结果；
- 分数事实。

Settlement 再处理：

- 玩家；
- 胡牌顺序；
- 分数关系；
- 输赢分。

v0.1.0 Domain 禁止预埋：

```text
Money
Payment
Payout
Stake
Bet
ChipExchange
```

未来也只使用 `Score`、`ScoreDelta` 等计分语义。

---

# 95. 依赖边界规则

建议 ESLint/架构检查明确：

```text
domain/**
MUST NOT import:
  react
  zustand
  dexie
  pages/**
  features/**
  infrastructure/**
```

`features/**` 不得复制 Engine 逻辑。

`infrastructure/**` 不得反向控制 Domain。

---

# 96. TypeScript 约束

推荐：

```text
strict = true
noUncheckedIndexedAccess = true
exactOptionalPropertyTypes = true
```

外部数据始终：

```text
unknown → validate → typed
```

核心 Domain 尽量 pure、readonly、deterministic。

---

# 97. 序列化边界

持久化和分享只使用：

- plain object；
- array；
- string；
- number；
- boolean；
- null。

不要直接保存复杂：

- Class；
- Map；
- Set；
- Function。

内部优化类型必须在边界转换成稳定数据结构。

---

# 98. Rule Source

```ts
type RuleSourceDefinition = {
  sourceId: string;
  title: string;
  publisher?: string;
  date?: string;
  url?: string;

  sourceType:
    | "official"
    | "association"
    | "tournament"
    | "public-local-rule"
    | "corroborating";

  note?: string;
};
```

Pattern 通过 `sourceRefs` 引用来源。

规则解释不能依赖用户实时访问外部网站才能知道“依据是什么”。

---

# 99. Rule Status

状态：

```text
development
test
full
```

规则事实规范中的 `TESTING` 映射为架构状态 `test`，`FULLY_SUPPORTED` 映射为 `full`。`common-simple@1.0.0` 在 78 个启用番型的 Rule Corpus 和人工交叉核验完成前保持 `test`。

`development`：

- 百科可见；
- 不能计算。

`test`：

- 可计算；
- 持续测试版标识；
- 结果保存分享保留版本和状态信息。

`full`：

- 只有完整规则测试与人工审核后才能发布。

---

# 100. Result Action 权限

| 状态 | 保存 | 复制 | 分享 | 调整本次规则 |
|---|---:|---:|---:|---:|
| Legal Win | ✓ | ✓ | ✓ | ✓ |
| Structural Illegal | ✗ | ✓ | ✓ | ✓ |
| Ready / Discard Analysis | ✗ | ✓ | ✓ | ✓ |
| Incomplete Context | ✗ | 可复制暂定信息 | ✗ | ✓ |
| Needs Correction | ✗ | 问题信息 | ✗ | ✗ |
| Engine Error | ✗ | 问题信息 | ✗ | ✗ |
| Quick Calc | ✗ | ✓ | ✗ | 使用当前规则 |

下游 UI 不得写成“只要存在 Result 就显示保存”。

---

# 101. 应用启动流程

```text
1. load build constants
2. detect browser capabilities
3. load preferences
4. open IndexedDB（若可用）
5. load core Rule Registry
6. resolve last rule
7. parse route
8. inspect draft/share context
9. initialize CalculatorDocument
10. render
11. register PWA/update services
```

Share Route 必须先校验，再进入 Replace Guard。

---

# 102. Analysis 状态机

```text
IDLE
→ QUEUED
→ RUNNING
   ├─ SUCCESS
   ├─ CANCELLED
   ├─ ERROR
   └─ STALE
```

输入修改后：

- 当前旧结果立即失效；
- 旧 Worker Result 即使迟到也不得进入 UI；
- 保存按钮必须要求 Analysis Revision 与 Document Revision 一致。

---

# 103. Result Snapshot 与 Revision

Draft 可以可选缓存分析结果，但必须带：

```text
documentRevision
```

恢复时：

- revision 相同 → 可立即展示；
- revision 不同 → 丢弃并重算。

若该优化复杂，v0.1.0 可以只恢复输入后重新计算，不影响产品需求。

---

# 104. 深色主题与像素素材

UI 使用 Design Tokens，不把主题色散落在组件。

像素麻将牌素材：

- 必须独立保存授权元数据；
- 清晰度优先；
- 不因换素材改变 TileCode 或计算逻辑。

---

# 105. 规则更新与旧版本共存

可以同时存在：

```text
common-simple v1
common-simple v2
```

旧牌例依赖 v1 时，v1 资源/最小快照不得自动清理。

新版本只影响用户主动采用后的新计算。

---

# 106. Rule Snapshot 清理

永久删除牌例后：

- 更新 RuleSnapshot 引用；
- 只有无任何依赖时才允许清理；
- 规则快照清理可以延迟执行，避免删除事务过于复杂。

---

# 107. 搜索

百科和已保存列表初期数据量小，纯前端即可。

不引入后端搜索。

后续百科变大可在构建阶段生成静态索引，而不是因此增加服务器。

---

# 108. 浏览器文件能力

导入优先使用标准：

```html
<input type="file">
```

高级 File System Access API 只能增强，不能作为唯一入口，避免破坏移动端/微信浏览器兼容。

---

# 109. Copy / Web Share

复制优先 Clipboard API，失败时显示可手动复制文本。

Web Share API 如果存在，可以增强：

```text
系统分享
```

但“复制结果”和“复制分享链接”始终保留，不依赖 Web Share API。

---

# 110. 静态部署

生产构建只需要静态产物：

```text
dist/
├─ index.html
├─ assets/
├─ manifest.webmanifest
├─ service worker
├─ version.json
└─ rules/
```

不需要：

- Node 业务服务器；
- SQL；
- Redis；
- 用户 Session；
- 后端规则计算 API。

可部署到任意支持 HTTPS 的静态托管/CDN。

---

# 111. 架构验收清单

## Domain

- [ ] Tile/Meld/Hand/Context 独立模型
- [ ] RulePackage 数据驱动
- [ ] Rule Package 禁止执行代码
- [ ] Stable Rule/Pattern IDs
- [ ] Capability Registry
- [ ] 标准结构完整拆分
- [ ] 七对/十三幺独立结构
- [ ] Winning Tile Placement
- [ ] Recognizer 与 Relation/Score 分离
- [ ] Legality 与 Score 分离
- [ ] 三层结果
- [ ] Wait/Discard 复用正式 Engine

## Application

- [ ] CalculatorDocument 单一事实源
- [ ] revision 机制
- [ ] 临时副露输入
- [ ] Replace Guard
- [ ] Undo/Redo 会话级
- [ ] Correction State
- [ ] Result action 权限矩阵

## Persistence

- [ ] localStorage/IDB/Cache 分层
- [ ] 单 Draft
- [ ] Saved Result Snapshot
- [ ] Minimal Rule Snapshot
- [ ] 独立格式版本
- [ ] Migration
- [ ] Merge Import 新 ID
- [ ] 覆盖恢复事务
- [ ] 高版本只读

## PWA / Update

- [ ] 核心规则内置
- [ ] 可选规则显式缓存
- [ ] 不静默升级规则
- [ ] App 更新保护 Draft
- [ ] 更新检查不上传用户数据

## Security / Privacy

- [ ] 外部数据 runtime validation
- [ ] Payload 安全上限
- [ ] 禁止动态代码
- [ ] 百科安全渲染
- [ ] 无自动遥测
- [ ] Base64 不冒充加密
- [ ] Hash 不冒充签名

## Quality

- [ ] Unit
- [ ] Rule Cases
- [ ] Property Tests
- [ ] Component
- [ ] E2E
- [ ] Migration
- [ ] Import/Export roundtrip
- [ ] PWA/offline
- [ ] 历史 Bug Regression

---

# 112. 需求追踪映射

| 架构模块 | 主要需求 |
|---|---|
| Rule Package / Capability | `REQ-RULE-*`, `REQ-INPUT-002`, `REQ-ENGINE-005` |
| Tile / Hand / Meld | `REQ-INPUT-*` |
| Context | `REQ-CONTEXT-*` |
| Structure / Decomposition | `REQ-ENGINE-*` |
| Pattern / Relation / Score | `REQ-RESULT-*` |
| Ready / Discard | `REQ-WAIT-*` |
| Quick Calc | `REQ-QUICK-*` |
| Encyclopedia | `REQ-ENC-*` |
| Saved Examples | `REQ-SAVE-*` |
| Draft / Undo | `REQ-DRAFT-*` |
| Share | `REQ-SHARE-*` |
| Import / Backup | `REQ-DATA-*` |
| Persistence / PWA | `REQ-STORAGE-*` |
| Update | `REQ-UPDATE-*` |
| Privacy / Feedback | `REQ-PRIV-*` |
| Browser / A11y / Test | `REQ-QUAL-*` |
| Future Boundaries | `REQ-OOS-*` |

---

# 113. Plan 阶段必须覆盖

`plan.md` 至少应拆分：

1. 项目骨架、严格 TS、Lint、测试、PWA 基础；
2. Tile/Hand/Meld Domain；
3. RulePackage Schema 与大众麻将规则包；
4. 标准结构、七对、十三幺；
5. Winning Tile Placement；
6. Pattern Recognizer；
7. Relation Resolver；
8. Scoring / Legality / Explanation；
9. Worker；
10. 图形化选牌与临时副露；
11. Context；
12. Result 与三层结果；
13. Quick Calc；
14. Wait/Discard；
15. Encyclopedia；
16. Saved Example；
17. Draft/Undo/Multi-tab/Replace Guard；
18. Share/Copy；
19. JSON Import/Export，包括选择性批量导出；
20. Rule Snapshot/Migration Service；
21. PWA/Offline/Update Discovery；
22. Settings/Privacy/Feedback 与本地偏好持久化；
23. Browser Capability Detection；
24. 产品身份、应用图标和 Tile Asset Manifest；
25. Accessibility；
26. `common-simple@1.0.0` Rule Test Corpus；
27. alpha/beta/rc 发布门槛。

---

# 114. 禁止的实现捷径

后续开发不得：

1. 每个地区复制一套独立计算器。
2. 用显示名称做 Rule/Pattern 主键。
3. 下载执行 Rule JavaScript。
4. 在 React Component 写番型算法。
5. 找到第一种胡法就停止。
6. 混合不同拆分的番型。
7. 用 Fan Adjustment 改变和牌合法性。
8. 直接修改系统 RulePackage。
9. 静默升级旧 Rule Version。
10. 只保存最终番数而不保存输入/版本。
11. JSON 强转后跳过 runtime validation。
12. 导入外部 ID 直接覆盖本地记录。
13. 存储失败却显示保存成功。
14. 自动上传牌面或错误详情。
15. 在 Domain 中加入金额、支付、赔付模型。
16. 为自定义规则、癞子、拍照识牌提前开发占位系统。
17. 将 13/14 散落硬编码为永久 Engine 规则。
18. 依赖 DOM、CSS 或页面状态判断规则结果。
19. 使用随机或近似算法决定正式番数。
20. 把 Base64/压缩称为加密。

---

# 115. 文档批准

本文件已于 2026-08-10 获项目方正式确认，当前状态：

```text
已批准 / Active
```

生效后：

- `plan.md` 以本架构为直接技术依据；
- `tasks.md` 按本架构模块拆分任务；
- `docs/AGENTS.md` 必须约束 Codex 不绕过 Domain/Rule 边界；
- 实现中若发现架构与冻结 Spec 冲突，必须先走需求/架构变更流程。

---

# 116. 核心架构结论

本项目采用：

```text
纯前端 PWA
+
React / TypeScript 模块化单体
+
数据化、不可执行的 RulePackage
+
受控 Capability / Recognizer / Scoring Registry
+
纯函数、确定性的 Domain Engine
+
完整和牌拆分与胡牌张落点枚举
+
Web Worker 后台分析
+
System Preset / Session Rule / User Adjustment 三层结果
+
IndexedDB Local-first 数据
+
Saved Result Snapshot + Minimal Rule Snapshot
+
严格 Share / Import Schema
+
规则级自动测试与历史 Bug 回归
```

核心边界：

> **规则数据可以变化，但规则代码只能来自受信应用版本；UI 可以变化，但规则事实只能由 Domain Engine 决定；历史规则可以过时，但历史牌例不得被静默改写。**
