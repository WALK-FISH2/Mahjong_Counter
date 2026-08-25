import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  canBringEncyclopediaExampleIntoCalculator,
  createEncyclopediaExampleReplacement,
  filterEncyclopediaPatterns,
  filterRuleEncyclopediasByStatus,
  getPatternCategory,
  getRecognizedPatternIds,
  getPatternEncyclopediaDetail,
  listEncyclopediaExamples,
  type EncyclopediaRuleCase,
  loadRuleEncyclopedias,
  type EncyclopediaExampleDetail,
  type LoadedRuleEncyclopedia,
  type PatternEnabledFilter,
} from '../../application/encyclopedia';
import type { RuleRepository } from '../../application/rules/rule-repository';
import type {
  EncyclopediaContentBlock,
  EncyclopediaExampleCategory,
} from '../../domain/rules/encyclopedia-definition';
import type { PatternRelationDefinition } from '../../domain/rules/pattern-relation';
import type { RuleStatus } from '../../domain/rules/rule-manifest';
import type { RulePackageDefinition } from '../../domain/rules/rule-package';
import type { CalculatorRuntime } from '../../app/bootstrap/calculator-bootstrap';
import { confirmTestingRule } from '../../application/preferences';

export type EncyclopediaPageProps = Readonly<{
  repository?: RuleRepository | undefined;
  runtime?: CalculatorRuntime | undefined;
  ruleCases?: readonly EncyclopediaRuleCase[] | undefined;
}>;

const STATUS_OPTIONS: readonly Readonly<{
  value: RuleStatus | 'all';
  label: string;
}>[] = [
  { value: 'all', label: '全部状态' },
  { value: 'full', label: '已完整支持' },
  { value: 'test', label: '测试版' },
  { value: 'development', label: '开发中' },
];

const STATUS_LABELS: Readonly<Record<RuleStatus, string>> = {
  development: '开发中',
  test: '测试版',
  full: '已完整支持',
};

const EXAMPLE_CATEGORY_LABELS: Readonly<Record<EncyclopediaExampleCategory, string>> = {
  basic: '基础示例',
  combination: '组合示例',
  counterexample: '反例',
  'local-special': '地方特殊示例',
};

const EXAMPLE_CATEGORIES = Object.keys(
  EXAMPLE_CATEGORY_LABELS,
) as readonly EncyclopediaExampleCategory[];

const STRUCTURE_LABELS: Readonly<Record<string, string>> = {
  'standard-meld-pair': '普通结构',
  'seven-pairs': '七对',
  'thirteen-orphans': '十三幺',
  'seven-star-unrelated': '七星不靠',
  'all-unrelated': '全不靠',
  'knitted-straight': '组合龙',
};

function entryKey(entry: LoadedRuleEncyclopedia): string {
  return `${entry.manifest.ruleId}@${entry.manifest.ruleVersion}`;
}

function rulePath(entry: LoadedRuleEncyclopedia): string {
  return `/rules/${encodeURIComponent(entry.manifest.ruleId)}/${encodeURIComponent(entry.manifest.ruleVersion)}`;
}

function patternPath(entry: LoadedRuleEncyclopedia, patternId: string): string {
  return `${rulePath(entry)}/patterns/${encodeURIComponent(patternId)}`;
}

function expectedExampleText(example: EncyclopediaExampleDetail): string {
  const { expected } = example.ruleCase;
  if (expected.description !== undefined) return `预期：${expected.description}`;
  if (expected.status === 'NOT_WINNING') return '预期：不是合法和牌结构';
  return `预期：结构成立（${expected.structureKeys.join('、')}）`;
}

function ContentBlocks({ blocks }: Readonly<{ blocks: readonly EncyclopediaContentBlock[] }>) {
  return blocks.map((block, index) =>
    block.type === 'paragraph' ? (
      <p key={`paragraph-${index}`}>{block.text}</p>
    ) : (
      <ul key={`list-${index}`}>
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    ),
  );
}

function physicalTileCount(rulePackage: RulePackageDefinition): number {
  return rulePackage.tileSet.enabledTiles.reduce(
    (total, tile) => total + (rulePackage.tileSet.maxCopies[tile] ?? 0),
    0,
  );
}

function formatCap(rulePackage: RulePackageDefinition): string {
  const cap = rulePackage.scoring.cap;
  if (cap === undefined || !cap.enabled) {
    return '默认不封顶';
  }
  return cap.value === null
    ? '已启用（无固定值）'
    : `${String(cap.value)} ${rulePackage.scoring.unit}`;
}

function formatSelfDraw(rulePackage: RulePackageDefinition): string {
  const definition = rulePackage.scoring.extras?.find(({ extraId }) => extraId === 'selfDraw');
  return definition === undefined
    ? '未定义附加计分'
    : `${definition.mode === 'ADD' ? '+' : ''}${String(definition.value)} ${rulePackage.scoring.unit}`;
}

function safeHttpUrl(url: string | undefined): string | undefined {
  if (url === undefined) {
    return undefined;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}

function relationText(
  relation: PatternRelationDefinition,
  names: ReadonlyMap<string, string>,
): string {
  const name = (patternId: string) => names.get(patternId) ?? patternId;
  if (relation.type === 'covers') {
    return `${name(relation.winner)} 包含且不重复计入 ${name(relation.covered)}`;
  }
  const joined = relation.patterns.map(name).join('、');
  return relation.type === 'mutually-exclusive'
    ? `${joined} 互斥，仅按关系策略保留一项`
    : `${joined} 属于同一不重复计分组`;
}

function RuleDetail({ entry }: Readonly<{ entry: LoadedRuleEncyclopedia }>) {
  const { manifest, rulePackage } = entry;
  const supportedStructures = rulePackage.structures.filter(({ enabled }) => enabled);
  const unsupportedStructures = rulePackage.structures.filter(({ enabled }) => !enabled);

  return (
    <section className="encyclopedia-card" aria-labelledby="rule-detail-title">
      <div className="encyclopedia-heading-row">
        <div>
          <p className="section-kicker">规则详情</p>
          <h2 id="rule-detail-title">{manifest.displayName}</h2>
        </div>
        <span className={`status-badge status-badge--${manifest.status}`}>
          {STATUS_LABELS[manifest.status]}
        </span>
      </div>

      <ContentBlocks blocks={rulePackage.encyclopedia.intro} />

      <dl className="encyclopedia-facts">
        <div>
          <dt>规则版本</dt>
          <dd>{manifest.ruleVersion}</dd>
        </div>
        <div>
          <dt>地区</dt>
          <dd>{manifest.region ?? '未限定'}</dd>
        </div>
        <div>
          <dt>牌种范围</dt>
          <dd>
            {rulePackage.tileSet.enabledTiles.length} 种，{physicalTileCount(rulePackage)} 张实体牌
          </dd>
        </div>
        <div>
          <dt>起和门槛</dt>
          <dd>
            {rulePackage.legality.minimumFan} {rulePackage.scoring.unit}
          </dd>
        </div>
        <div>
          <dt>封顶</dt>
          <dd>{formatCap(rulePackage)}</dd>
        </div>
        <div>
          <dt>自摸</dt>
          <dd>{formatSelfDraw(rulePackage)}</dd>
        </div>
        <div>
          <dt>支持范围</dt>
          <dd>
            {supportedStructures
              .map(({ structureKey }) => STRUCTURE_LABELS[structureKey] ?? structureKey)
              .join('、')}
          </dd>
        </div>
        <div>
          <dt>当前不支持</dt>
          <dd>
            {unsupportedStructures
              .map(({ structureKey }) => STRUCTURE_LABELS[structureKey] ?? structureKey)
              .join('、') || '无'}
          </dd>
        </div>
      </dl>

      <section aria-labelledby="rule-limitations-title">
        <h3 id="rule-limitations-title">已知限制</h3>
        <ContentBlocks blocks={rulePackage.encyclopedia.knownLimitations} />
      </section>

      <section aria-labelledby="rule-sources-title">
        <h3 id="rule-sources-title">来源与可信度</h3>
        <ul className="encyclopedia-source-list">
          {rulePackage.sources.map((source) => {
            const article = rulePackage.encyclopedia.sourceArticles.find(
              ({ sourceId }) => sourceId === source.sourceId,
            );
            const href = safeHttpUrl(source.url);
            return (
              <li key={source.sourceId}>
                <strong>{source.title}</strong>
                <span>
                  {source.sourceId} · {source.sourceType}
                </span>
                {article === undefined ? null : <ContentBlocks blocks={article.blocks} />}
                {href === undefined ? null : (
                  <a href={href} rel="noreferrer" target="_blank">
                    查看来源
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </section>
  );
}

function PatternCatalog({
  entry,
  selectedPatternId,
  currentPatternIds,
}: Readonly<{
  entry: LoadedRuleEncyclopedia;
  selectedPatternId?: string | undefined;
  currentPatternIds: ReadonlySet<string>;
}>) {
  const { rulePackage } = entry;
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [minimumValue, setMinimumValue] = useState<number | null>(null);
  const [maximumValue, setMaximumValue] = useState<number | null>(null);
  const [enabled, setEnabled] = useState<PatternEnabledFilter>('all');
  const [currentRecognizedOnly, setCurrentRecognizedOnly] = useState(false);
  const categories = useMemo(
    () =>
      [...new Set(rulePackage.patterns.map(getPatternCategory))].sort((left, right) => {
        const leftValue = Number.parseFloat(left);
        const rightValue = Number.parseFloat(right);
        return rightValue - leftValue || left.localeCompare(right, 'zh-CN');
      }),
    [rulePackage],
  );
  const filteredPatterns = useMemo(
    () =>
      filterEncyclopediaPatterns(
        rulePackage.patterns,
        { query, category, minimumValue, maximumValue, enabled, currentRecognizedOnly },
        currentPatternIds,
      ),
    [
      category,
      currentPatternIds,
      currentRecognizedOnly,
      enabled,
      maximumValue,
      minimumValue,
      query,
      rulePackage.patterns,
    ],
  );
  const fallbackPatternId = filteredPatterns[0]?.patternId ?? '';
  const detailPatternId = selectedPatternId ?? fallbackPatternId;
  const selected = getPatternEncyclopediaDetail(rulePackage, detailPatternId);
  const patternNames = useMemo(
    () => new Map(rulePackage.patterns.map(({ patternId, name }) => [patternId, name])),
    [rulePackage],
  );
  const groupedPatterns = categories
    .map((categoryName) => ({
      categoryName,
      patterns: filteredPatterns.filter((pattern) => getPatternCategory(pattern) === categoryName),
    }))
    .filter(({ patterns }) => patterns.length > 0);

  return (
    <section className="encyclopedia-card" aria-labelledby="pattern-catalog-title">
      <div className="encyclopedia-heading-row">
        <div>
          <p className="section-kicker">Engine 同源</p>
          <h2 id="pattern-catalog-title">完整番表</h2>
        </div>
        <span>{rulePackage.patterns.length} 个参考番型</span>
      </div>
      <p className="encyclopedia-note">
        番型名称、番值和启用状态直接读取当前 Engine 使用的 PatternDefinition。
      </p>
      <div className="pattern-filter-panel" aria-label="番型搜索与筛选">
        <label>
          名称或别名
          <input
            aria-label="名称或别名"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索番型"
            type="search"
            value={query}
          />
        </label>
        <label>
          类别
          <select
            aria-label="番型类别"
            onChange={(event) => setCategory(event.target.value)}
            value={category}
          >
            <option value="">全部类别</option>
            {categories.map((categoryName) => (
              <option key={categoryName} value={categoryName}>
                {categoryName}
              </option>
            ))}
          </select>
        </label>
        <label>
          最低番值
          <input
            aria-label="最低番值"
            min="0"
            onChange={(event) =>
              setMinimumValue(event.target.value === '' ? null : event.target.valueAsNumber)
            }
            type="number"
            value={minimumValue ?? ''}
          />
        </label>
        <label>
          最高番值
          <input
            aria-label="最高番值"
            min="0"
            onChange={(event) =>
              setMaximumValue(event.target.value === '' ? null : event.target.valueAsNumber)
            }
            type="number"
            value={maximumValue ?? ''}
          />
        </label>
        <label>
          启用状态
          <select
            aria-label="番型启用状态"
            onChange={(event) => setEnabled(event.target.value as PatternEnabledFilter)}
            value={enabled}
          >
            <option value="all">全部</option>
            <option value="enabled">已启用</option>
            <option value="disabled">当前不支持</option>
          </select>
        </label>
        <label className="pattern-current-filter">
          <input
            checked={currentRecognizedOnly}
            onChange={(event) => setCurrentRecognizedOnly(event.target.checked)}
            type="checkbox"
          />
          仅看当前牌面已识别番型
        </label>
      </div>
      <div className="pattern-catalog-layout">
        <ul className="pattern-catalog-list" aria-label="完整番表">
          {groupedPatterns.flatMap(({ categoryName, patterns }) => [
            <li className="pattern-category-heading" key={`category-${categoryName}`}>
              {categoryName}
            </li>,
            ...patterns.map((pattern) => (
              <li key={pattern.patternId}>
                <Link
                  aria-current={detailPatternId === pattern.patternId ? 'page' : undefined}
                  className="pattern-catalog-button"
                  to={patternPath(entry, pattern.patternId)}
                >
                  <span>
                    <strong>{pattern.name}</strong>
                    <small>{pattern.aliases?.join('、') || '无别名'}</small>
                  </span>
                  <span>
                    {String(pattern.value)} {pattern.unit}
                    <small>{pattern.enabled ? '已启用' : '当前不支持'}</small>
                  </span>
                </Link>
              </li>
            )),
          ])}
        </ul>

        {filteredPatterns.length === 0 ? (
          <p className="empty-state">没有符合当前搜索与筛选条件的番型。</p>
        ) : null}

        {selected === undefined ? null : (
          <article className="pattern-detail" aria-labelledby="pattern-detail-title">
            <p className="section-kicker">番型详情</p>
            <h3 id="pattern-detail-title">{selected.pattern.name}</h3>
            <Link to={rulePath(entry)}>返回规则详情</Link>
            <dl className="encyclopedia-facts">
              <div>
                <dt>别名</dt>
                <dd>{selected.pattern.aliases?.join('、') || '无别名'}</dd>
              </div>
              <div>
                <dt>数值</dt>
                <dd>
                  {String(selected.pattern.value)} {selected.pattern.unit}
                </dd>
              </div>
              <div>
                <dt>启用状态</dt>
                <dd>{selected.pattern.enabled ? '已启用' : '当前不支持'}</dd>
              </div>
              <div>
                <dt>版本</dt>
                <dd>{rulePackage.manifest.ruleVersion}</dd>
              </div>
              <div>
                <dt>可信度</dt>
                <dd>{selected.pattern.confidence ?? '未标注'}</dd>
              </div>
              <div>
                <dt>识别器标识</dt>
                <dd>{selected.pattern.recognizerKey}</dd>
              </div>
            </dl>

            <section aria-labelledby="pattern-condition-title">
              <h4 id="pattern-condition-title">成立条件与识别说明</h4>
              <ContentBlocks blocks={selected.article} />
            </section>

            <section aria-labelledby="pattern-relations-title">
              <h4 id="pattern-relations-title">包含、互斥与不重复关系</h4>
              {selected.relations.length === 0 ? (
                <p>当前 RulePackage 未定义与其他番型的直接关系。</p>
              ) : (
                <ul>
                  {selected.relations.map((relation, index) => (
                    <li key={`${relation.type}-${index}`}>
                      {relationText(relation, patternNames)}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="pattern-sources-title">
              <h4 id="pattern-sources-title">来源</h4>
              <ul>
                {selected.sources.map((source) => (
                  <li key={source.sourceId}>
                    {source.title}（{source.sourceId}）
                  </li>
                ))}
              </ul>
            </section>
          </article>
        )}
      </div>
    </section>
  );
}

function ExampleGallery({
  entry,
  runtime,
  ruleCases,
}: Readonly<{
  entry: LoadedRuleEncyclopedia;
  runtime?: CalculatorRuntime | undefined;
  ruleCases: readonly EncyclopediaRuleCase[];
}>) {
  const navigate = useNavigate();
  const [pendingExample, setPendingExample] = useState<EncyclopediaExampleDetail | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const examples = useMemo(
    () => (ruleCases.length === 0 ? [] : listEncyclopediaExamples(entry.rulePackage, ruleCases)),
    [entry.rulePackage, ruleCases],
  );
  const canBringIntoCalculator =
    runtime !== undefined && canBringEncyclopediaExampleIntoCalculator(entry.manifest);

  const replaceWithExample = async (example: EncyclopediaExampleDetail): Promise<void> => {
    if (runtime === undefined || !canBringEncyclopediaExampleIntoCalculator(entry.manifest)) return;

    const catalogEntry = (await runtime.ruleRepository.listRuleCatalog()).find(
      ({ manifest }) =>
        manifest.ruleId === entry.manifest.ruleId &&
        manifest.ruleVersion === entry.manifest.ruleVersion,
    );
    const result = await runtime.replaceGuard.prepareToReplaceCalculator(
      'encyclopedia-example',
      () => true,
      async () => {
        if (entry.manifest.status === 'test' && catalogEntry !== undefined) {
          await confirmTestingRule(
            runtime.preferencesPort,
            entry.manifest,
            catalogEntry.resultImpactVersion,
          );
        }
        return createEncyclopediaExampleReplacement(
          runtime.store.getState().document,
          entry.rulePackage,
          example,
        );
      },
    );
    setPendingExample(null);
    if (result.status === 'replaced') {
      void navigate('/calculator');
    } else if (result.status === 'draft-protection-failed') {
      setNotice('当前计算保护失败，示例未带入。');
    }
  };

  return (
    <section className="encyclopedia-card" aria-labelledby="encyclopedia-examples-title">
      <p className="section-kicker">Rule Case 同源</p>
      <h2 id="encyclopedia-examples-title">牌例</h2>
      <p className="encyclopedia-note">
        示例牌面和预期结果读取已通过验证的 Rule
        Case；带入后仅形成临时、可编辑的计算状态，不会自动保存。
      </p>
      {notice === null ? null : <p role="alert">{notice}</p>}
      <div className="encyclopedia-example-grid">
        {EXAMPLE_CATEGORIES.map((category) => {
          const categoryExamples = examples.filter(
            ({ definition }) => definition.category === category,
          );
          return (
            <section key={category} aria-labelledby={`example-category-${category}`}>
              <h3 id={`example-category-${category}`}>{EXAMPLE_CATEGORY_LABELS[category]}</h3>
              {categoryExamples.length === 0 ? (
                <p className="empty-state">当前规则暂无此类示例。</p>
              ) : (
                <ul>
                  {categoryExamples.map((example) => (
                    <li key={example.definition.exampleId}>
                      <h4>{example.definition.title}</h4>
                      <p>{example.ruleCase.title}</p>
                      <p>{expectedExampleText(example)}</p>
                      <button
                        disabled={!canBringIntoCalculator}
                        onClick={() => setPendingExample(example)}
                        type="button"
                      >
                        {entry.manifest.status === 'development'
                          ? '开发中规则仅供查看'
                          : '带入计算器'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {pendingExample === null ? null : (
        <div
          aria-labelledby="example-replace-title"
          aria-modal="true"
          className="dialog-backdrop"
          role="dialog"
        >
          <section className="dialog-card">
            <p className="section-kicker">替换保护</p>
            <h2 id="example-replace-title">带入百科示例？</h2>
            <p>这会保护并替换当前计算状态；示例只作为临时计算内容，不会自动保存。</p>
            {entry.manifest.status === 'test' ? (
              <p>当前规则为测试版；继续即确认以该测试规则进行本次计算。</p>
            ) : null}
            <div className="dialog-actions">
              <button
                className="danger-action"
                onClick={() => void replaceWithExample(pendingExample)}
                type="button"
              >
                确认带入
              </button>
              <button
                className="secondary-action"
                onClick={() => setPendingExample(null)}
                type="button"
              >
                取消
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

export function EncyclopediaPage({ repository, runtime, ruleCases }: EncyclopediaPageProps) {
  const params = useParams<{
    ruleId?: string;
    ruleVersion?: string;
    patternId?: string;
  }>();
  const [entries, setEntries] = useState<readonly LoadedRuleEncyclopedia[]>([]);
  const [status, setStatus] = useState<RuleStatus | 'all'>('all');
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const activeRepository = runtime?.ruleRepository ?? repository;

  useEffect(() => {
    if (activeRepository === undefined) {
      return;
    }
    let active = true;
    loadRuleEncyclopedias(activeRepository).then(
      (loaded) => {
        if (!active) return;
        setEntries(loaded);
        setLoadState('ready');
      },
      () => {
        if (active) setLoadState('error');
      },
    );
    return () => {
      active = false;
    };
  }, [activeRepository]);

  const filteredEntries = filterRuleEncyclopediasByStatus(entries, status);
  const selectedEntry =
    params.ruleId === undefined || params.ruleVersion === undefined
      ? filteredEntries[0]
      : filteredEntries.find(
          ({ manifest }) =>
            manifest.ruleId === params.ruleId && manifest.ruleVersion === params.ruleVersion,
        );
  const currentPatternIds = getRecognizedPatternIds(
    runtime?.store.getState().analysisResult ?? null,
  );
  const availableRuleCases = runtime?.encyclopediaRuleCases ?? ruleCases ?? [];

  return (
    <section className="page-shell encyclopedia-page" aria-labelledby="encyclopedia-title">
      <header className="encyclopedia-hero">
        <p className="section-kicker">规则、来源与计算事实同版本</p>
        <h1 id="encyclopedia-title">规则百科</h1>
        <p>查看规则支持范围、完整番表、番型条件、关系与资料来源。</p>
      </header>

      {loadState === 'loading' ? <p role="status">正在加载规则百科…</p> : null}
      {loadState === 'error' ? <p role="alert">规则百科加载失败，请刷新后重试。</p> : null}

      {loadState === 'ready' ? (
        <>
          <section className="encyclopedia-card" aria-labelledby="rule-list-title">
            <div className="encyclopedia-heading-row">
              <div>
                <p className="section-kicker">规则目录</p>
                <h2 id="rule-list-title">规则列表与状态</h2>
              </div>
              <label className="encyclopedia-status-filter">
                支持状态
                <select
                  aria-label="支持状态"
                  onChange={(event) => setStatus(event.target.value as RuleStatus | 'all')}
                  value={status}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {filteredEntries.length === 0 ? (
              <p className="empty-state">当前没有符合该状态的规则。</p>
            ) : (
              <ul aria-label="规则列表" className="rule-encyclopedia-list">
                {filteredEntries.map((entry) => (
                  <li key={entryKey(entry)}>
                    <Link
                      aria-current={
                        selectedEntry !== undefined && entryKey(selectedEntry) === entryKey(entry)
                          ? 'page'
                          : undefined
                      }
                      to={rulePath(entry)}
                    >
                      <span>
                        <strong>{entry.manifest.displayName}</strong>
                        <small>{entry.manifest.ruleVersion}</small>
                      </span>
                      <span className={`status-badge status-badge--${entry.manifest.status}`}>
                        {STATUS_LABELS[entry.manifest.status]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {selectedEntry === undefined ? null : (
            <>
              <RuleDetail entry={selectedEntry} />
              <PatternCatalog
                key={entryKey(selectedEntry)}
                entry={selectedEntry}
                selectedPatternId={params.patternId}
                currentPatternIds={currentPatternIds}
              />
              <ExampleGallery
                entry={selectedEntry}
                runtime={runtime}
                ruleCases={availableRuleCases}
              />
            </>
          )}
          {selectedEntry === undefined && params.ruleId !== undefined ? (
            <p role="alert">该规则或版本不存在，或已被当前状态筛选隐藏。</p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
