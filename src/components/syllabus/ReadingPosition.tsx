"use client";

import { useEffect } from "react";
import { savePosition } from "./reading-position";

export default function ReadingPosition({ slug }: { slug: string }) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const headings = [...document.querySelectorAll<HTMLElement>("#lesson-content h2[id], #lesson-content h3[id]")];
    const record = () => {
      let id = "";
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top > 160) break;
        id = heading.id;
      }
      savePosition(slug + (id ? `#${id}` : ""));
    };
    const schedule = () => { clearTimeout(timer); timer = setTimeout(record, 180); };
    // location.hash is percent-encoded; store the decoded id like record() does,
    // otherwise the "continue" link encodes it a second time.
    let hash = window.location.hash;
    try { hash = decodeURIComponent(hash); } catch { hash = ""; }
    savePosition(slug + (hash.startsWith("#section-") ? hash : ""));
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("pagehide", record);
    return () => { clearTimeout(timer); window.removeEventListener("scroll", schedule); window.removeEventListener("pagehide", record); };
  }, [slug]);
  return null;
}
