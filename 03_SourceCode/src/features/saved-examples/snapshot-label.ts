// Display translations only. Values and applicability always come from the saved facts.
const LABELS: Readonly<Record<string, string>> = {
  'context.seatWind': '门风',
  'context.roundWind': '圈风',
  'context.afterKongReplacement': '杠上开花',
  'context.robbingAddedKong': '抢杠和',
  'context.wallLastDraw': '海底捞月',
  'context.lastDiscardAfterWallExhausted': '河底捞鱼',
  'context.lastTile': '绝张',
  'wind.east': '东风',
  'wind.south': '南风',
  'wind.west': '西风',
  'wind.north': '北风',
  'winds.east': '东风',
  'winds.south': '南风',
  'winds.west': '西风',
  'winds.north': '北风',
  'adjustment.minimumFan': '最低起胡值',
  'adjustment.capEnabled': '启用封顶',
  'adjustment.capValue': '封顶值',
  'adjustment.selfDrawValue': '自摸附加值',
  'adjustment.flowerValue': '花牌附加值',
};
export function snapshotLabel(key: string): string {
  return LABELS[key] ?? key;
}
export function snapshotValue(value: unknown): string {
  if (value === null) return '无';
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return JSON.stringify(value) ?? '未知';
}
