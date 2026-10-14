import React from "react";

/** Cùng thuật toán với TableOfContents để id từ server và id do mục lục tự sinh trùng nhau. */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

type Node = React.ReactNode;
type ElementProps = { children?: Node; id?: string; className?: string };

function textOf(node: Node): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (React.isValidElement(node)) return textOf((node.props as ElementProps).children);
  return "";
}

/**
 * Gắn `id` cho mọi <h2>/<h3> ngay trong HTML tĩnh.
 *
 * Trước đây id chỉ được gán sau khi trang mount (TableOfContents), nên mở thẳng
 * `/notes/x#muc-4` thì trình duyệt không tìm thấy phần tử lúc tải và không cuộn:
 * link do chính mục lục tạo ra bị hỏng khi chia sẻ. Gán ở server thì neo hoạt
 * động ngay, kể cả khi tắt JavaScript.
 *
 * Chỉ đi qua phần tử HTML thường và Fragment; tiêu đề nằm trong một component
 * tự viết thì để TableOfContents gán sau (nó vẫn có nhánh cuộn dự phòng).
 */
export function withHeadingIds(root: Node): Node {
  const used = new Map<string, number>();

  const visit = (node: Node): Node => {
    if (!React.isValidElement(node)) return node;
    const el = node as React.ReactElement<ElementProps>;
    if (typeof el.type !== "string" && el.type !== React.Fragment) return node;

    let extra: { id?: string; className?: string } | undefined;
    if ((el.type === "h2" || el.type === "h3") && !el.props.id) {
      const base = slugifyHeading(textOf(el.props.children)) || "section";
      const n = used.get(base) ?? 0;
      used.set(base, n + 1);
      extra = {
        id: n === 0 ? base : `${base}-${n}`,
        className: [el.props.className, "scroll-mt-12"].filter(Boolean).join(" "),
      };
    }

    if (el.props.children === undefined) {
      return extra ? React.cloneElement(el, extra) : node;
    }
    // Children.map gán key cho từng phần tử, nên không sinh cảnh báo thiếu key.
    return React.cloneElement(el, extra, React.Children.map(el.props.children, visit));
  };

  return visit(root);
}
