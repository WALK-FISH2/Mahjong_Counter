import { SavedExampleError } from '../../application/examples';

export function savedErrorMessage(error: unknown): string {
  if (error instanceof SavedExampleError) {
    switch (error.code) {
      case 'RECORD_CONFLICT':
        return '原记录已改变或已不存在。请重新打开后确认，未覆盖任何记录。';
      case 'RECORD_UNREADABLE':
        return '记录格式损坏或版本不受支持，原始数据已保留。';
      case 'SAVE_NOT_ALLOWED':
        return '当前结果不可保存，请完成当前牌面的正式合法分析后重试。';
      case 'INVALID_NAME':
        return '请输入 1～256 个字符的名称。';
      case 'BUSY':
        return '正在保存，请稍候。';
      case 'STORAGE_QUOTA':
        return '存储空间不足，保存失败。当前牌面仍保留。';
      case 'STORAGE_UNAVAILABLE':
        return '本地存储不可用，无法保存或读取牌例。仍可临时计算和浏览百科。';
      case 'CALCULATOR_CHANGED':
        return '等待期间计算器输入已改变，请重新确认编辑。当前输入未被覆盖。';
      case 'RULE_UNAVAILABLE':
        return '保存时的准确规则版本暂不可用。仍可查看保存时结果，未替换当前输入。';
    }
  }
  return '操作未完成，原记录和当前牌面未被覆盖，请重试。';
}
