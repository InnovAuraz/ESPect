from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    ListFlowable,
    ListItem,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "ESPect_Startup_Guide.md"
OUTPUT = ROOT / "ESPect_Startup_Guide.pdf"


def escape(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def markup(text: str) -> str:
    parts = escape(text).split("`")
    for index in range(1, len(parts), 2):
        parts[index] = f'<font name="Courier" color="#136f63">{parts[index]}</font>'
    return "".join(parts)


def make_table(lines: list[str]) -> Table:
    rows = []
    for line in lines:
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        rows.append([Paragraph(markup(cell), STYLES["table"]) for cell in cells])
    table = Table(rows, repeatRows=1, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#173f5f")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#b7c9c5")),
        ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f3f7f5")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def story_from_markdown() -> list:
    story = []
    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    index = 0
    while index < len(lines):
        line = lines[index]
        if not line.strip():
            story.append(Spacer(1, 3))
            index += 1
            continue
        if line.startswith("# "):
            story.append(Paragraph(markup(line[2:]), STYLES["title"]))
        elif line.startswith("## "):
            story.append(Paragraph(markup(line[3:]), STYLES["h2"]))
            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#8ab8ae")))
        elif line.startswith("### "):
            story.append(Paragraph(markup(line[4:]), STYLES["h3"]))
        elif line.startswith("```"):
            code = []
            index += 1
            while index < len(lines) and not lines[index].startswith("```"):
                code.append(lines[index])
                index += 1
            story.append(Preformatted("\n".join(code), STYLES["code"]))
        elif line.startswith("- "):
            items = []
            while index < len(lines) and lines[index].startswith("- "):
                items.append(ListItem(Paragraph(markup(lines[index][2:]), STYLES["body"])))
                index += 1
            story.append(ListFlowable(items, bulletType="bullet", leftIndent=16))
            continue
        elif line.startswith("| "):
            table_lines = []
            while index < len(lines) and lines[index].startswith("|"):
                if "---" not in lines[index]:
                    table_lines.append(lines[index])
                index += 1
            if table_lines:
                story.append(make_table(table_lines))
                story.append(Spacer(1, 6))
            continue
        elif line.startswith("> "):
            story.append(Paragraph(f'<font color="#8b3a3a"><b>Note:</b></font> {markup(line[2:])}', STYLES["note"]))
        else:
            story.append(Paragraph(markup(line), STYLES["body"]))
        index += 1
    return story


def footer(canvas, document):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#b7c9c5"))
    canvas.line(18 * mm, 14 * mm, 192 * mm, 14 * mm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#536b67"))
    canvas.drawString(18 * mm, 9 * mm, "ESPect real packet capture startup guide")
    canvas.drawRightString(192 * mm, 9 * mm, f"Page {document.page}")
    canvas.restoreState()


base = getSampleStyleSheet()
STYLES = {
    "title": ParagraphStyle("GuideTitle", parent=base["Title"], fontName="Helvetica-Bold", fontSize=22, leading=27, textColor=colors.HexColor("#173f5f"), alignment=TA_CENTER, spaceAfter=10),
    "h2": ParagraphStyle("GuideH2", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=14, leading=18, textColor=colors.HexColor("#173f5f"), spaceBefore=12, spaceAfter=5),
    "h3": ParagraphStyle("GuideH3", parent=base["Heading3"], fontName="Helvetica-Bold", fontSize=11, leading=14, textColor=colors.HexColor("#136f63"), spaceBefore=8, spaceAfter=3),
    "body": ParagraphStyle("GuideBody", parent=base["BodyText"], fontName="Helvetica", fontSize=9.2, leading=12.5, textColor=colors.HexColor("#203330"), spaceAfter=4),
    "note": ParagraphStyle("GuideNote", parent=base["BodyText"], fontName="Helvetica", fontSize=9.2, leading=12.5, leftIndent=8, borderPadding=6, backColor=colors.HexColor("#fff4df"), borderColor=colors.HexColor("#e0ad63"), borderWidth=0.5, spaceBefore=4, spaceAfter=6),
    "code": ParagraphStyle("GuideCode", parent=base["Code"], fontName="Courier", fontSize=7.2, leading=9.2, textColor=colors.HexColor("#18332f"), backColor=colors.HexColor("#eef4f2"), borderColor=colors.HexColor("#b7c9c5"), borderWidth=0.5, borderPadding=6, leftIndent=4, rightIndent=4, spaceBefore=3, spaceAfter=7),
    "table": ParagraphStyle("GuideTable", parent=base["BodyText"], fontName="Helvetica", fontSize=7.7, leading=9.5, textColor=colors.HexColor("#203330")),
}


def main() -> None:
    document = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=18 * mm,
        title="ESPect Real Packet Capture Startup Guide",
        author="ESPect",
    )
    document.build(story_from_markdown(), onFirstPage=footer, onLaterPages=footer)
    print(f"Created {OUTPUT}")


if __name__ == "__main__":
    main()
