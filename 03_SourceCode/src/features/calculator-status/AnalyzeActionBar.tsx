import type { CalculatorStatus } from '../../application/calculator/calculator-store';

export type AnalyzeActionBarProps = Readonly<{
  status: CalculatorStatus;
  hasWinningTile: boolean;
  onAnalyze: () => void;
  onCancel: () => void;
  onViewResult: () => void;
}>;

function statusText(status: CalculatorStatus, hasWinningTile: boolean): string {
  if (status.correctionIssues.length > 0) {
    return `请先修正 ${status.correctionIssues.length} 个牌面问题`;
  }
  if (status.missingContextIds.length > 0) {
    return `还需补全 ${status.missingContextIds.length} 个和牌条件`;
  }
  if (status.structuralTileCount === status.targetStructuralTileCount && !hasWinningTile) {
    return '请确认独立胡牌张';
  }
  return `结构张数 ${status.structuralTileCount} / ${status.targetStructuralTileCount}`;
}

export function AnalyzeActionBar({
  status,
  hasWinningTile,
  onAnalyze,
  onCancel,
  onViewResult,
}: AnalyzeActionBarProps) {
  const text = statusText(status, hasWinningTile);

  return (
    <aside className={`analyze-action-bar analyze-action-bar--${status.phase}`} aria-live="polite">
      <div>
        <strong>
          {status.phase === 'analyzing'
            ? '正在分析…'
            : status.phase === 'result'
              ? '分析已完成'
              : text}
        </strong>
        <span>
          实际牌数 {status.physicalTileCount} 张
          {status.physicalTileCount !== status.structuralTileCount ? '（含杠牌或花牌）' : ''}
        </span>
      </div>

      {status.phase === 'analyzing' ? (
        <button type="button" className="secondary-action" onClick={onCancel}>
          取消分析
        </button>
      ) : status.phase === 'result' ? (
        <button type="button" className="primary-action" onClick={onViewResult}>
          查看结果
        </button>
      ) : (
        <button
          type="button"
          className="primary-action"
          disabled={!status.canAnalyze}
          onClick={onAnalyze}
        >
          开始分析
        </button>
      )}
    </aside>
  );
}
