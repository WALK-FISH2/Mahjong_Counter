import { useEffect, useMemo, useState } from 'react';

import {
  filterRuleEncyclopediasByStatus,
  getPatternEncyclopediaDetail,
  loadRuleEncyclopedias,
  type LoadedRuleEncyclopedia,
} from '../../application/encyclopedia';
import type { RuleRepository } from '../../application/rules/rule-repository';
import type { EncyclopediaContentBlock } from '../../domain/rules/encyclopedia-definition';
import type { PatternRelationDefinition } from '../../domain/rules/pattern-relation';
import type { RuleStatus } from '../../domain/rules/rule-manifest';
import type { RulePackageDefinition } from '../../domain/rules/rule-package';

export type EncyclopediaPageProps = Readonly<{
  repository?: RuleRepository | undefined;
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

function PatternCatalog({ rulePackage }: Readonly<{ rulePackage: RulePackageDefinition }>) {
  const [selectedPatternId, setSelectedPatternId] = useState(
    () => rulePackage.patterns[0]?.patternId ?? '',
  );
  const selected = getPatternEncyclopediaDetail(rulePackage, selectedPatternId);
  const patternNames = useMemo(
    () => new Map(rulePackage.patterns.map(({ patternId, name }) => [patternId, name])),
    [rulePackage],
  );

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
      <div className="pattern-catalog-layout">
        <ul className="pattern-catalog-list" aria-label="完整番表">
          {rulePackage.patterns.map((pattern) => (
            <li key={pattern.patternId}>
              <button
                aria-pressed={selectedPatternId === pattern.patternId}
                className="pattern-catalog-button"
                onClick={() => setSelectedPatternId(pattern.patternId)}
                type="button"
              >
                <span>
                  <strong>{pattern.name}</strong>
                  <small>{pattern.aliases?.join('、') || '无别名'}</small>
                </span>
                <span>
                  {String(pattern.value)} {pattern.unit}
                  <small>{pattern.enabled ? '已启用' : '当前不支持'}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>

        {selected === undefined ? null : (
          <article className="pattern-detail" aria-labelledby="pattern-detail-title">
            <p className="section-kicker">番型详情</p>
            <h3 id="pattern-detail-title">{selected.pattern.name}</h3>
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

export function EncyclopediaPage({ repository }: EncyclopediaPageProps) {
  const [entries, setEntries] = useState<readonly LoadedRuleEncyclopedia[]>([]);
  const [status, setStatus] = useState<RuleStatus | 'all'>('all');
  const [selectedRuleKey, setSelectedRuleKey] = useState('');
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (repository === undefined) {
      return;
    }
    let active = true;
    loadRuleEncyclopedias(repository).then(
      (loaded) => {
        if (!active) return;
        setEntries(loaded);
        setSelectedRuleKey((current) => current || (loaded[0] ? entryKey(loaded[0]) : ''));
        setLoadState('ready');
      },
      () => {
        if (active) setLoadState('error');
      },
    );
    return () => {
      active = false;
    };
  }, [repository]);

  const filteredEntries = filterRuleEncyclopediasByStatus(entries, status);
  const selectedEntry =
    filteredEntries.find((entry) => entryKey(entry) === selectedRuleKey) ?? filteredEntries[0];

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
                    <button
                      aria-pressed={selectedRuleKey === entryKey(entry)}
                      onClick={() => setSelectedRuleKey(entryKey(entry))}
                      type="button"
                    >
                      <span>
                        <strong>{entry.manifest.displayName}</strong>
                        <small>{entry.manifest.ruleVersion}</small>
                      </span>
                      <span className={`status-badge status-badge--${entry.manifest.status}`}>
                        {STATUS_LABELS[entry.manifest.status]}
                      </span>
                    </button>
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
                rulePackage={selectedEntry.rulePackage}
              />
            </>
          )}
        </>
      ) : null}
    </section>
  );
}
