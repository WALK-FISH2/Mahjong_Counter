import { useState } from 'react';
import { useStore } from 'zustand';
import type { ShareService } from '../../application/share/share-service';
import { useShareConfirmation } from './use-share-confirmation';

export function SharedOriginPanel({ service }: Readonly<{ service: ShareService }>) {
  const payload = useStore(service.origin, (s) => s.payload);
  const [notice, setNotice] = useState<string | null>(null);
  const confirmation = useShareConfirmation();
  if (payload === null) return null;
  return (
    <section aria-label="原分享">
      <p>来源：分享。保存时快照不等于本地验证结果；重新分析使用已安装的相同版本规则。</p>
      <button
        type="button"
        onClick={() =>
          void service
            .restoreOriginal(() => confirmation.confirm('恢复原分享会替换当前输入，是否继续？'))
            .then((r) =>
              setNotice(
                r.status === 'replaced'
                  ? '已恢复原分享输入；请重新分析。'
                  : '未替换；请先解决草稿或只读保护。',
              ),
            )
            .catch(() => setNotice('原分享当前不可替换，仅保留预览。'))
        }
      >
        恢复原分享
      </button>
      {notice !== null && <p role="status">{notice}</p>}
      {confirmation.dialog}
    </section>
  );
}
