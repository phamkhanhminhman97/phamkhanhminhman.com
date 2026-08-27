import React from "react";
import type { Localized } from "@/i18n/types";
import type { Locale } from "@/i18n/config";

export interface BlogPost {
  slug: string;
  /** ISO `YYYY-MM-DD`. Hiển thị được định dạng theo ngôn ngữ lúc render. */
  date: string;
  category: string;
  /**
   * Ngôn ngữ bài viết THẬT SỰ có. Ba bài đầu chỉ có tiếng Việt — chúng nhắm tới
   * lập trình viên tích hợp sàn TMĐT Việt Nam. Không dịch máy: một bài kỹ thuật
   * dịch ẩu hại uy tín hơn là không có bản dịch.
   */
  availableIn: Locale[];
  title: Localized<string>;
  readTime: Localized<string>;
  description: Localized<string>;
  content: Localized<() => React.JSX.Element>;
}

/** Bài chỉ có một ngôn ngữ: cùng một JSX cho cả hai locale. Trang bài viết đọc
 *  `availableIn` để hiện banner "bài này viết bằng tiếng Việt". */
export function sameForBothLocales(
  render: () => React.JSX.Element,
): Localized<() => React.JSX.Element> {
  return { en: render, vi: render };
}
