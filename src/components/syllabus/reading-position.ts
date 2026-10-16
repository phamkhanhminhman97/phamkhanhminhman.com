const key = "pkmm.syllabus.linear-algebra.position.v1";
const eventName = "syllabus-position";

export function readPosition(): string {
  try { return localStorage.getItem(key) ?? ""; } catch { return ""; }
}
export function savePosition(value: string) {
  try {
    if (readPosition() !== value) {
      localStorage.setItem(key, value);
      window.dispatchEvent(new Event(eventName));
    }
  } catch { /* Reading still works when storage is disabled. */ }
}
export function subscribePosition(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(eventName, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(eventName, callback);
  };
}
