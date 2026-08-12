export type CalculatorOnboardingProps = Readonly<{
  showRuleNotice: boolean;
  showInputGuide: boolean;
  onDismiss: () => void;
}>;

export function CalculatorOnboarding({
  showRuleNotice,
  showInputGuide,
  onDismiss,
}: CalculatorOnboardingProps) {
  if (!showRuleNotice && !showInputGuide) return null;

  return (
    <aside className="calculator-onboarding" aria-label="首次使用引导">
      {showRuleNotice && <p>当前使用大众麻将规则，可点击顶部切换地区规则。</p>}
      {showInputGuide && (
        <ol>
          <li>默认直接录入手牌；吃、碰、明杠、暗杠或花牌使用临时录入。</li>
          <li>胡牌张在固定独立区域单独录入。</li>
          <li>牌面完成后点击开始分析。</li>
        </ol>
      )}
      <button type="button" className="secondary-action" onClick={onDismiss}>
        知道了
      </button>
    </aside>
  );
}
