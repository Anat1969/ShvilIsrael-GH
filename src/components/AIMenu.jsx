import { useEffect, useRef } from 'react';
import { clearWalked } from '../lib/walked.js';

export const DEV_SESSION_URL = 'https://claude.ai/code/session_018qeN196Z7PSWesohAbtS4A';

/** כפתור הלוגו A&I (ai-menu.js מאפליקציית האם). העתקת קישור, שיחת הפיתוח והתקנה נמצאים בתוכו. */
export default function AIMenu() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.items = [{ label: 'איפוס סימוני "הלכתי"', hint: 'נשמרים רק בדפדפן הזה', onSelect: () => clearWalked() }];
  }, []);
  return <ai-menu ref={ref} chat={DEV_SESSION_URL} />;
}
