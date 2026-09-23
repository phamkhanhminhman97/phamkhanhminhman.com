#!/usr/bin/env python3
"""
Tạo CV PDF từ đúng dữ liệu của trang /about.

    python3 tools/build-cv.py          # ghi public/cv/Pham-Khanh-Minh-Man-CV.pdf

Nguồn là src/data/profile.tsx (+ danh sách gói npm trong projects.tsx), đọc qua
tools/cv-data.mjs. Không có bản chép tay thứ hai của nội dung: sửa profile rồi
chạy lại lệnh trên, commit file PDF mới. Script cần font hệ thống của macOS nên
chạy ở máy, không nằm trong bước build; PDF là file tĩnh được commit.

Cần: Python có reportlab (pip install reportlab) và font hệ thống của macOS
(Georgia, Arial, Arial Unicode cho mấy chữ Nhật trong mục thanh toán).
"""
from __future__ import annotations

import html
import json
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.platypus import (
    CondPageBreak,
    HRFlowable,
    KeepTogether,
    ListFlowable,
    ListItem,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "cv" / "Pham-Khanh-Minh-Man-CV.pdf"
SITE = "phamkhanhminhman.com"
FONT_DIR = Path("/System/Library/Fonts/Supplemental")
# Lề trái/phải. Giữ CV trong hai trang A4 mà không phải bỏ nội dung.
MARGIN = 15 * mm

# ------------------------------------------------------------------ fonts

FONTS = {
    "Serif": "Georgia.ttf",
    "Serif-Bold": "Georgia Bold.ttf",
    "Serif-Italic": "Georgia Italic.ttf",
    "Sans": "Arial.ttf",
    "Sans-Bold": "Arial Bold.ttf",
    "CJK": "Arial Unicode.ttf",
}
for name, file in FONTS.items():
    path = FONT_DIR / file
    if not path.exists():
        sys.exit(f"Thiếu font {path} - script này dùng font hệ thống của macOS.")
    pdfmetrics.registerFont(TTFont(name, str(path)))
pdfmetrics.registerFontFamily(
    "Serif", normal="Serif", bold="Serif-Bold", italic="Serif-Italic", boldItalic="Serif-Bold"
)
pdfmetrics.registerFontFamily(
    "Sans", normal="Sans", bold="Sans-Bold", italic="Sans", boldItalic="Sans-Bold"
)

INK = colors.HexColor("#18181b")  # zinc-900
MUTED = colors.HexColor("#52525b")  # zinc-600
FAINT = colors.HexColor("#a1a1aa")  # zinc-400
RULE = colors.HexColor("#d4d4d8")  # zinc-300
ACCENT = colors.HexColor("#991b1b")  # red-800, màu nhấn của site

# ------------------------------------------------------------------ text

CJK = re.compile(r"[\u3000-\u9fff\uff00-\uffef]+")


def clean(s: str) -> str:
    """Chuỗi từ profile -> markup an toàn cho Paragraph.

    Chỉ dùng gạch nối ASCII (quy ước của bộ tạo PDF), mũi tên thành '->', và
    bọc chữ Nhật trong font có glyph CJK - Georgia/Arial thường không có.
    """
    s = s.replace("\u2014", "-").replace("\u2013", "-").replace("\u2011", "-")
    s = s.replace("\u2192", "->")
    s = html.escape(s, quote=False)
    return CJK.sub(lambda m: f'<font name="CJK">{m.group(0)}</font>', s)


def period(s: str) -> str:
    # "2026 —" trên site nghĩa là đang làm; trên giấy phải nói rõ.
    s = re.sub(r"\s*\u2014\s*$", " - present", s.strip())
    return clean(s)


def link(url: str, label: str | None = None) -> str:
    return f'<link href="{html.escape(url)}" color="#18181b">{clean(label or url)}</link>'


def bare(url: str) -> str:
    return re.sub(r"^https?://(www\.)?", "", url)


# ------------------------------------------------------------------ styles

def style(name: str, **kw) -> ParagraphStyle:
    base = dict(fontName="Serif", fontSize=9, leading=12.2, textColor=INK)
    base.update(kw)
    return ParagraphStyle(name, **base)


S = {
    "name": style("name", fontName="Serif-Bold", fontSize=21, leading=23),
    "title": style("title", fontName="Sans", fontSize=9.4, leading=12.5, textColor=MUTED),
    "contact": style("contact", fontName="Sans", fontSize=7.5, leading=10.5, textColor=MUTED),
    "section": style(
        "section", fontName="Sans-Bold", fontSize=8.4, leading=10, textColor=ACCENT
    ),
    "body": style("body", fontSize=8.8, leading=10.7),
    "head": style("head", fontName="Sans-Bold", fontSize=9.2, leading=11.6),
    "when": style("when", fontName="Sans", fontSize=8.1, leading=11.6, textColor=MUTED, alignment=TA_RIGHT),
    "sub": style("sub", fontName="Serif-Italic", fontSize=8.6, leading=10.6, textColor=MUTED),
    "proj": style("proj", fontName="Sans-Bold", fontSize=8.6, leading=11, textColor=INK),
    "projwhen": style("projwhen", fontName="Sans", fontSize=7.8, leading=11, textColor=MUTED, alignment=TA_RIGHT),
    "bullet": style("bullet", fontSize=8.7, leading=10.4),
    "stack": style("stack", fontName="Sans", fontSize=7.5, leading=9.8, textColor=MUTED),
    "skillcat": style("skillcat", fontName="Sans-Bold", fontSize=8.2, leading=11),
    "skill": style("skill", fontSize=8.6, leading=10.6),
    "note": style("note", fontName="Serif-Italic", fontSize=8.5, leading=10.6, textColor=MUTED),
}

# Khung của SimpleDocTemplate có đệm 6pt mỗi bên; bảng rộng hơn khung sẽ bị
# căn giữa và lòi ra ngoài lề chữ.
CONTENT_W = A4[0] - 2 * MARGIN - 12


def section(title: str) -> list:
    parts = [
        # Còn dưới ~20mm ở đáy trang thì sang trang mới luôn, để tiêu đề mục
        # không nằm trơ trọi một mình (keepWithNext không giữ được qua bảng).
        # Đặt cao hơn thì cả mục bị đẩy sang trang sau, để lại khoảng trắng lớn.
        CondPageBreak(20 * mm),
        Spacer(1, 4),
        Paragraph(title.upper(), S["section"]),
        HRFlowable(width="100%", thickness=0.6, color=RULE, spaceBefore=2, spaceAfter=4),
    ]
    # Tiêu đề mục không bao giờ nằm trơ trọi ở đáy trang: dính với khối sau nó.
    for f in parts:
        f.keepWithNext = 1
    return parts


def row(left: str, right: str, right_w: float = 34 * mm, styles: tuple[str, str] = ("head", "when")) -> Table:
    t = Table(
        [[Paragraph(left, S[styles[0]]), Paragraph(right, S[styles[1]])]],
        colWidths=[CONTENT_W - right_w, right_w],
    )
    t.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    return t


def bullets(items: list[str], space_before: float = 1.5) -> list:
    if not items:
        return []
    return [
        ListFlowable(
            [ListItem(Paragraph(clean(i), S["bullet"]), leftIndent=10) for i in items],
            bulletType="bullet",
            start="\u2022",
            bulletFontName="Serif",
            bulletFontSize=7,
            bulletColor=MUTED,
            leftIndent=10,
            bulletOffsetY=-0.5,
            spaceBefore=space_before,
        )
    ]


def stack(tech: list[str]) -> list:
    if not tech:
        return []
    return [Spacer(1, 2), Paragraph(clean(" · ".join(tech)), S["stack"])]


def entry(head: list, highlights: list[str], tech: list[str]) -> list:
    """Một mục CV. Tiêu đề dính với gạch đầu dòng đầu tiên; phần còn lại được
    phép sang trang. Giữ nguyên cả khối thì một mục dài đẩy nửa trang trắng
    lại phía sau."""
    if len(highlights) <= 2:
        return [KeepTogether(head + bullets(highlights) + stack(tech))]
    # Dòng công nghệ luôn đi cùng gạch đầu dòng cuối, không rớt một mình
    # sang đầu trang mới.
    return (
        [KeepTogether(head + bullets(highlights[:1]))]
        + bullets(highlights[1:-1], space_before=0)
        + [KeepTogether(bullets(highlights[-1:], space_before=0) + stack(tech))]
    )


# ------------------------------------------------------------------ page chrome

class NumberedCanvas(rl_canvas.Canvas):
    """Canvas hai lượt để in được "trang x / tổng số trang"."""

    def __init__(self, *a, **kw):
        super().__init__(*a, **kw)
        self._pages: list[dict] = []

    def showPage(self):
        self._pages.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total = len(self._pages)
        for state in self._pages:
            self.__dict__.update(state)
            self._footer(total)
            super().showPage()
        super().save()

    def _footer(self, total: int):
        w, _ = A4
        y = 8 * mm
        self.setStrokeColor(RULE)
        self.setLineWidth(0.5)
        self.line(MARGIN, y + 4 * mm, w - MARGIN, y + 4 * mm)
        self.setFont("Sans", 7.2)
        self.setFillColor(FAINT)
        self.drawString(MARGIN, y, f"Pham Khanh Minh Man - CV - updated {date.today():%B %Y}")
        self.drawCentredString(w / 2, y, SITE)
        self.drawRightString(w - MARGIN, y, f"{self._pageNumber} / {total}")


# ------------------------------------------------------------------ build

def load() -> dict:
    out = subprocess.run(
        ["node", str(ROOT / "tools" / "cv-data.mjs")],
        check=True,
        capture_output=True,
        text=True,
        cwd=ROOT,
    )
    return json.loads(out.stdout)


def build() -> None:
    data = load()
    p, packages = data["profile"], data["packages"]
    story: list = []

    # Đầu trang
    story.append(Paragraph(clean(p["name"]), S["name"]))
    story.append(Spacer(1, 2))
    story.append(Paragraph(clean(p["title"]), S["title"]))
    story.append(Spacer(1, 3))
    contact = " · ".join(
        [
            clean(p["location"]),
            link(f"mailto:{p['email']}", p["email"]),
            link(p["github"], bare(p["github"])),
            link(p["linkedin"], bare(p["linkedin"])),
            link(f"https://{SITE}", SITE),
        ]
    )
    story.append(Paragraph(contact, S["contact"]))
    story.append(HRFlowable(width="100%", thickness=1.4, color=INK, spaceBefore=4, spaceAfter=1.2))
    story.append(HRFlowable(width="100%", thickness=0.5, color=INK, spaceBefore=0, spaceAfter=0))

    # Tóm tắt
    story += section("Summary")
    for i, para in enumerate(p["bio"]):
        if i:
            story.append(Spacer(1, 3))
        story.append(Paragraph(clean(para), S["body"]))

    # Kinh nghiệm: một khối cho mỗi công ty, dự án nằm bên trong. Người đọc CV
    # thấy ngay ba năm ở Devtify là một chỗ làm, không phải ba lần nhảy việc.
    story += section("Experience")
    for i, e in enumerate(p["experiences"]):
        head = f"<b>{clean(e['company'])}</b>"
        head += f'<font name="Sans" color="#52525b">  ·  {clean(e["title"])}</font>'
        top = [row(head, period(e["period"]))]
        if e.get("summary"):
            top.append(Paragraph(clean(e["summary"]), S["sub"]))
        if i:
            story.append(Spacer(1, 5))
        if not e["projects"]:
            story.append(KeepTogether(top))
            continue
        for j, pr in enumerate(e["projects"]):
            ph = [Spacer(1, 2.5 if j == 0 else 3.5)]
            if pr.get("period"):
                ph.append(row(clean(pr["name"]), period(pr["period"]), styles=("proj", "projwhen")))
            else:
                ph.append(Paragraph(clean(pr["name"]), S["proj"]))
            if pr.get("summary"):
                ph.append(Paragraph(clean(pr["summary"]), S["sub"]))
            # Tên công ty dính với dự án đầu tiên, không nằm trơ ở đáy trang.
            story += entry((top if j == 0 else []) + ph, pr["highlights"], pr["technologies"])

    # Hệ thống: sau Kinh nghiệm, vì dòng "see Selected systems" ở trên trỏ xuống đây
    story += section("Selected systems")
    for i, s in enumerate(p["systems"]):
        name = f"<b>{clean(s['name'])}</b>"
        if s.get("url"):
            name += f'  <font name="Sans" size="8" color="#52525b">{link(s["url"], bare(s["url"]))}</font>'
        head = [row(name, clean(s["domain"]), 62 * mm), Paragraph(clean(s["summary"]), S["sub"])]
        if i:
            story.append(Spacer(1, 4))
        story += entry(head, s["highlights"], s["technologies"])

    # Gói npm mã nguồn mở: mỗi gói một đoạn, tên và mô tả liền nhau
    story += section("Open-source packages")
    for i, pkg in enumerate(packages):
        head = f"<b>{clean(pkg['name'])}</b>"
        head += f' <font name="Sans" size="7.6" color="#52525b">({link(pkg["npmUrl"], "npm: " + pkg["npmName"])})</font>'
        if i:
            story.append(Spacer(1, 1.5))
        story.append(Paragraph(f"{head} - {clean(pkg['description'])}", S["bullet"]))

    # Kỹ năng
    rows = [
        [Paragraph(clean(s["category"]), S["skillcat"]), Paragraph(clean(", ".join(s["items"])), S["skill"])]
        for s in p["skills"]
    ]
    t = Table(rows, colWidths=[46 * mm, CONTENT_W - 46 * mm])
    t.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0.4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0.4),
            ]
        )
    )
    # Bảng ngắn: giữ nguyên khối cùng tiêu đề mục.
    story.append(KeepTogether(section("Skills") + [t]))

    # Học vấn
    story += section("Education")
    for i, ed in enumerate(p["education"]):
        if i:
            story.append(Spacer(1, 3))
        story.append(
            KeepTogether(
                [
                    row(f"<b>{clean(ed['degree'])}</b>", period(ed["period"])),
                    Paragraph(clean(ed["school"]), S["sub"]),
                    Paragraph(clean(ed["description"]), S["bullet"]),
                ]
            )
        )

    # Nghiên cứu - in nguyên trạng thái như trên site, kể cả phần "chưa có kết quả"
    story += section("Research")
    for r in p["research"]:
        meta = " | ".join([period(r["period"]), clean(r["status"]), clean(r["venue"])])
        # Chỉ tên đề tài + dòng meta + câu hỏi đi liền nhau; Method và ghi chú
        # được phép sang trang. Giữ cả khối thì nó rơi trọn sang trang 3.
        story.append(
            KeepTogether(
                [
                    Paragraph(f"<b>{clean(r['title'])}</b>", style("rt", fontName="Serif-Bold", fontSize=9.3, leading=12.2)),
                    Spacer(1, 1),
                    Paragraph(meta, S["stack"]),
                    Spacer(1, 3),
                    Paragraph(f"<b>Question.</b> {clean(r['question'])}", S["body"]),
                ]
            )
        )
        story += [
            Spacer(1, 3),
            Paragraph(f"<b>Method.</b> {clean(r['method'])}", S["body"]),
            Spacer(1, 3),
            Paragraph(clean(r["honestNote"]), S["note"]),
        ]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=11 * mm,
        bottomMargin=13 * mm,
        title=f"{p['name']} - CV",
        author=p["name"],
        subject=p["title"],
        keywords=", ".join(["CV", "Backend Engineer", "NestJS", "TypeScript", "E-commerce API"]),
        creator=f"{SITE} tools/build-cv.py",
        # Không nhét thời điểm tạo vào file: chạy lại với cùng dữ liệu ra cùng
        # một PDF, git không báo đổi giả.
        invariant=1,
    )
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Đã ghi {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    build()
