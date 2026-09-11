import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  restoreEvaluation,
  type SavedExampleRecord,
  type SavedExampleService,
} from '../../application/examples';
import { AnalysisResult } from '../../features/analysis-result/AnalysisResult';
import { ExampleDialog } from '../../features/saved-examples/SaveExampleDialog';
import { savedErrorMessage } from '../../features/saved-examples/saved-error-message';
import type { EvaluationLayer } from '../../domain/engine/adjustment';
import { snapshotLabel, snapshotValue } from '../../features/saved-examples/snapshot-label';

function Detail({
  record,
  service,
}: Readonly<{ record: SavedExampleRecord; service: SavedExampleService }>) {
  const snapshot = record.resultSnapshot;
  const [layer, setLayer] = useState<EvaluationLayer>(
    snapshot.lastViewedLayer === 'user-adjusted' ? 'user-adjustment' : snapshot.lastViewedLayer,
  );
  const [candidateId, setCandidateId] = useState(
    snapshot.lastViewedLayer === 'user-adjusted'
      ? (snapshot.userAdjustedResult?.result.candidateId ?? snapshot.lastViewedCandidateId)
      : snapshot.lastViewedCandidateId,
  );
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const evaluation =
    layer === 'preset'
      ? snapshot.presetResult
      : (snapshot.sessionRuleResult ?? snapshot.presetResult);
  const display =
    layer === 'preset'
      ? snapshot.display.preset
      : (snapshot.display.sessionRule ?? snapshot.display.preset);
  return (
    <>
      <h2>{record.name}</h2>
      <p>
        只读查看 · {snapshot.display.ruleName} · {record.ruleRef.ruleVersion} · 引擎{' '}
        {record.engineVersion}
      </p>
      <p>
        最后修改：
        <time dateTime={record.modifiedAt}>
          {new Date(record.modifiedAt).toLocaleString('zh-CN')}
        </time>
      </p>
      {snapshot.display.ruleStatus === 'test' && <p>保存时规则状态：持续测试版</p>}
      {snapshot.display.warnings.length > 0 && (
        <details>
          <summary>保存时的警告与限制</summary>
          <ul>
            {snapshot.display.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </details>
      )}
      <details>
        <summary>保存时的条件与调整</summary>
        <p>和牌方式：{record.calculator.context.mode === 'self-draw' ? '自摸' : '点和'}</p>
        <dl>
          {Object.entries(record.calculator.context.values).map(([id, value]) => {
            const label = snapshot.display.contextLabels.find((item) => item.contextId === id);
            const option =
              value.status === 'known'
                ? label?.options.find((item) => item.value === value.value)
                : undefined;
            return (
              <div key={id}>
                <dt>{snapshotLabel(label?.labelKey ?? id)}</dt>
                <dd>
                  {value.status === 'unknown'
                    ? '未知'
                    : option === undefined
                      ? snapshotValue(value.value)
                      : snapshotLabel(option.labelKey)}
                </dd>
              </div>
            );
          })}
        </dl>
        <h3>临时规则调整</h3>
        {record.calculator.temporaryRuleAdjustment === null ? (
          <p>无</p>
        ) : (
          <dl>
            {Object.entries(record.calculator.temporaryRuleAdjustment.values).map(([id, value]) => (
              <div key={id}>
                <dt>
                  {snapshotLabel(
                    snapshot.display.adjustmentLabels.find((item) => item.adjustmentId === id)
                      ?.labelKey ?? id,
                  )}
                </dt>
                <dd>{snapshotValue(value)}</dd>
              </div>
            ))}
          </dl>
        )}
        <h3>番型人工调整</h3>
        {record.calculator.fanAdjustments.length === 0 ? (
          <p>无</p>
        ) : (
          <ul>
            {record.calculator.fanAdjustments.map((item) => (
              <li key={item.patternId}>
                {display.patterns.find((pattern) => pattern.patternId === item.patternId)?.name ??
                  item.patternId}
                ：{item.action === 'exclude' ? '取消计入' : '强制计入'}
              </li>
            ))}
          </ul>
        )}
      </details>
      <AnalysisResult
        result={restoreEvaluation(evaluation)}
        rulePackage={display}
        originalHand={record.calculator.hand}
        selectedCandidateId={candidateId}
        readOnly
        activeLayer={layer}
        availableLayers={[
          'preset',
          ...(snapshot.sessionRuleResult === undefined ? [] : (['session-rule'] as const)),
          ...(snapshot.userAdjustedResult === undefined ? [] : (['user-adjustment'] as const)),
        ]}
        userAdjustedResult={snapshot.userAdjustedResult?.result ?? null}
        onSelectCandidate={(id) => {
          if (layer === 'user-adjustment')
            setLayer(snapshot.userAdjustedResult?.baseLayer ?? 'preset');
          setCandidateId(id);
        }}
        onOpenAdjustments={() => undefined}
        onSelectLayer={(next) => {
          setLayer(next);
          setCandidateId(
            next === 'user-adjustment'
              ? (snapshot.userAdjustedResult?.result.candidateId ?? null)
              : (next === 'preset'
                  ? snapshot.presetResult
                  : (snapshot.sessionRuleResult ?? snapshot.presetResult)
                ).selectedCandidateId,
          );
        }}
      />
      <button
        className="primary-action"
        type="button"
        disabled={busy}
        onClick={() => setConfirm(true)}
      >
        编辑牌例
      </button>
      {error !== null && <p role="alert">{error}</p>}
      {confirm && (
        <ExampleDialog title="编辑此牌例？" onClose={() => setConfirm(false)}>
          <p>将替换当前计算器输入并创建临时编辑副本。原记录不会自动修改。</p>
          <button
            className="primary-action"
            type="button"
            onClick={() => {
              setConfirm(false);
              setBusy(true);
              setError(null);
              void service
                .edit(record, () => true)
                .then(
                  (result) => {
                    if (result.status === 'replaced') void navigate('/calculator');
                    else setError('当前输入保护未完成，未替换计算器。');
                  },
                  (reason: unknown) => setError(savedErrorMessage(reason)),
                )
                .finally(() => setBusy(false));
            }}
          >
            确认编辑
          </button>
          <button className="secondary-action" type="button" onClick={() => setConfirm(false)}>
            取消
          </button>
        </ExampleDialog>
      )}
    </>
  );
}

export function SavedExampleDetailPage({
  service,
}: Readonly<{ service?: SavedExampleService | undefined }>) {
  const { exampleId } = useParams();
  const [record, setRecord] = useState<SavedExampleRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (exampleId !== undefined)
      void service?.get(exampleId).then(
        (next) => {
          if (!active) return;
          setRecord(next);
          setError(next === null ? '该牌例不存在。' : null);
        },
        (reason: unknown) => {
          if (active) setError(savedErrorMessage(reason));
        },
      );
    return () => {
      active = false;
    };
  }, [exampleId, service]);
  return (
    <section className="page-shell saved-detail">
      <h1>已保存牌例</h1>
      <Link to="/saved">返回牌例列表</Link>
      {error !== null ? (
        <p role="alert">{error}</p>
      ) : record === null || record.id !== exampleId || service === undefined ? (
        <p>正在读取本地牌例…</p>
      ) : (
        <Detail key={record.id} record={record} service={service} />
      )}
    </section>
  );
}
