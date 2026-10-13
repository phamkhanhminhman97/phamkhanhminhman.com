/**
 * Copy chữ vào clipboard và trả về đúng/sai thật sự.
 *
 * Thử Clipboard API trước; nếu bị chặn (tab chưa focus, trình duyệt cũ, không
 * phải HTTPS) thì rơi về textarea + execCommand và đọc giá trị trả về của nó.
 * Nút copy dựa vào kết quả này để hiện "Copied" hay "Failed" — trước đây nút
 * luôn báo "Copied" kể cả khi không có gì được ghi vào clipboard.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Rơi xuống cách dự phòng bên dưới.
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.top = "0";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textArea.remove();
  }
}

export type CopyState = "idle" | "copied" | "failed";

/** Thời gian giữ trạng thái "Copied"/"Failed" trước khi trở lại "Copy". */
export const COPY_RESET_MS = 2000;

/** Kiểu chung của nút copy, dùng cho cả CodeBlock (React) lẫn CodeBlockEnhancer (DOM). */
export const COPY_BUTTON_CLASS =
  "flex shrink-0 items-center gap-1 font-mono text-[11px] text-zinc-400 bg-zinc-800/90 hover:bg-zinc-700 hover:text-white px-2 py-1 rounded transition-colors opacity-80 group-hover:opacity-100 cursor-pointer shadow-xs";

