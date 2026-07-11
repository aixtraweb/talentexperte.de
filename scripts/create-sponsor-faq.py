#!/usr/bin/env python3
"""Generate the public FAQ for fully sponsored TALENTEXPERTE camp places."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "pdf" / "faq-camps-sponsoring.pdf"
LOGO = ROOT / "ci" / "logo.png"

RED = colors.HexColor("#E50000")
INK = colors.HexColor("#151515")
MUTED = colors.HexColor("#666666")
SOFT = colors.HexColor("#F5F5F3")
SPONSOR = colors.HexColor("#087F72")
SPONSOR_SOFT = colors.HexColor("#E8F6F3")


def page_footer(canvas, doc):
    canvas.saveState()
    width, height = A4
    # PDF-Seiten haben technisch keinen garantierten Hintergrund. Einige
    # Renderer stellen transparente Flächen schwarz dar, daher jede Seite
    # ausdrücklich weiß grundieren, bevor Inhalt und Fußzeile gezeichnet werden.
    canvas.setFillColor(colors.white)
    canvas.rect(0, 0, width, height, fill=1, stroke=0)
    canvas.setStrokeColor(colors.HexColor("#DDDDDD"))
    canvas.line(20 * mm, 15 * mm, width - 20 * mm, 15 * mm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(20 * mm, 10 * mm, "TALENTEXPERTE | Camp-Info für gesponserte Plätze")
    canvas.drawRightString(width - 20 * mm, 10 * mm, f"Seite {doc.page}")
    canvas.restoreState()


styles = getSampleStyleSheet()
title = ParagraphStyle(
    "TitleTE",
    parent=styles["Title"],
    fontName="Helvetica-Bold",
    fontSize=25,
    leading=29,
    textColor=INK,
    alignment=TA_LEFT,
    spaceAfter=7 * mm,
)
eyebrow = ParagraphStyle(
    "Eyebrow",
    parent=styles["Normal"],
    fontName="Helvetica-Bold",
    fontSize=9,
    leading=11,
    textColor=RED,
    tracking=1.4,
    spaceAfter=3 * mm,
)
heading = ParagraphStyle(
    "HeadingTE",
    parent=styles["Heading2"],
    fontName="Helvetica-Bold",
    fontSize=15,
    leading=19,
    textColor=INK,
    spaceBefore=4 * mm,
    spaceAfter=2.5 * mm,
)
body = ParagraphStyle(
    "BodyTE",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=10.5,
    leading=15.5,
    textColor=INK,
    spaceAfter=2.8 * mm,
)
small = ParagraphStyle(
    "SmallTE",
    parent=body,
    fontSize=9,
    leading=13,
    textColor=MUTED,
)
callout_title = ParagraphStyle(
    "CalloutTitle",
    parent=body,
    fontName="Helvetica-Bold",
    fontSize=14,
    leading=18,
    textColor=SPONSOR,
    alignment=TA_CENTER,
    spaceAfter=2 * mm,
)
callout_body = ParagraphStyle(
    "CalloutBody",
    parent=body,
    fontSize=11,
    leading=16,
    alignment=TA_CENTER,
    spaceAfter=0,
)
bullet = ParagraphStyle(
    "BulletTE",
    parent=body,
    leftIndent=5 * mm,
    firstLineIndent=-3.5 * mm,
    bulletIndent=0,
    spaceAfter=2 * mm,
)


def header():
    logo = Image(str(LOGO), width=24 * mm, height=24 * mm)
    brand = Paragraph(
        "<b>FUSSBALLSCHULE TALENTEXPERTE</b><br/><font color='#666666' size='9'>Seit 2005</font>",
        body,
    )
    table = Table([[logo, brand]], colWidths=[30 * mm, 125 * mm], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    return [table, Spacer(1, 8 * mm)]


def callout():
    content = [
        Paragraph("ELTERNANTEIL: 0,00 EUR", callout_title),
        Paragraph(
            "Die Teilnahme wird vollständig durch <b>Öcher Kenger e.V.</b> finanziert. "
            "Sie müssen weder online noch vor Ort bezahlen. Der Camp-Platz ist nach der "
            "bestätigten Codeprüfung verbindlich reserviert.",
            callout_body,
        ),
    ]
    table = Table([[content]], colWidths=[158 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), SPONSOR_SOFT),
                ("BOX", (0, 0), (-1, -1), 1, SPONSOR),
                ("LEFTPADDING", (0, 0), (-1, -1), 8 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 7 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7 * mm),
            ]
        )
    )
    return table


def faq(question, answer):
    return KeepTogether([Paragraph(question, heading), Paragraph(answer, body)])


def bullet_item(text):
    return Paragraph(text, bullet, bulletText="-")


def build():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=22 * mm,
        title="TALENTEXPERTE - Camp-Info für gesponserte Plätze",
        author="Fußballschule TALENTEXPERTE",
    )

    story = []
    story.extend(header())
    story.append(Paragraph("INFO FÜR GEFÖRDERTE FAMILIEN", eyebrow))
    story.append(Paragraph("Ihr Camp-Platz ist voll gesponsert", title))
    story.append(callout())
    story.append(Spacer(1, 7 * mm))
    story.append(
        faq(
            "Muss ich noch etwas bezahlen?",
            "Nein. Es gibt keine Zahlungsaufforderung, keine Stripe-Weiterleitung und keine "
            "Barzahlung. Auch eine Zahlungserinnerung wird für diesen Platz nicht versendet.",
        )
    )
    story.append(
        faq(
            "Woran erkenne ich die bestätigte Förderung?",
            "Nach erfolgreicher Anmeldung stehen in der Bestätigung der Name des Partners, "
            "der Elternanteil von 0,00 EUR und der Hinweis \"Keine Zahlung erforderlich\". "
            "Bitte bewahren Sie diese Bestätigung auf.",
        )
    )
    story.append(
        faq(
            "Was passiert mit dem Vereinscode?",
            "Der Code wird zusammen mit dem Namen des Kindes geprüft und für den vorgesehenen "
            "Camp-Platz einmalig eingelöst. Bitte geben Sie den Code nicht an andere Familien weiter.",
        )
    )
    story.append(
        faq(
            "Der Code wird nicht angenommen - was kann ich tun?",
            "Prüfen Sie die Schreibweise des Kindes genau so, wie sie auf der Vereinsliste steht, "
            "sowie Geburtsdatum und ausgewähltes Camp. Bleibt die Meldung bestehen, wenden Sie sich "
            "bitte an Öcher Kenger e.V. oder an kontakt@talentexperte.de. Führen Sie in diesem Fall "
            "keine kostenpflichtige Ersatzanmeldung durch.",
        )
    )
    story.append(PageBreak())

    story.extend(header())
    story.append(Paragraph("CAMP-ABLAUF", eyebrow))
    story.append(Paragraph("Alles Wichtige für den Camp-Start", title))
    story.append(Paragraph("Zeiten und Ankunft", heading))
    story.append(bullet_item("Camp-Zeit: in der Regel 09:00 bis 15:00 Uhr."))
    story.append(bullet_item("Am ersten Tag bitte um 08:45 Uhr zur Begrüßung vor Ort sein."))
    story.append(bullet_item("Den konkreten Zeitraum und Ort finden Sie in Ihrer Bestätigung."))

    story.append(Paragraph("Im Camp enthalten", heading))
    story.append(bullet_item("Professionelles Fußballtraining und altersgerechte Gruppen."))
    story.append(bullet_item("Mittagessen, Getränke und Obst an jedem Camptag."))
    story.append(bullet_item("Urkunde, Foto und Medaille."))
    story.append(bullet_item("Betreuung durch das TALENTEXPERTE-Trainerteam."))

    story.append(Paragraph("Bitte mitbringen", heading))
    gear = [
        ["Fußballschuhe (Kunstrasen)", "Schienbeinschoner"],
        ["Sportkleidung", "Trinkflasche"],
        ["Regenjacke / Wechselkleidung", "Sonnencreme und Kappe"],
        ["Hallenschuhe bei Regen", "Rucksack"],
    ]
    gear_table = Table(gear, colWidths=[79 * mm, 79 * mm])
    gear_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), SOFT),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#DDDDDD")),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9.5),
                ("TEXTCOLOR", (0, 0), (-1, -1), INK),
                ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
            ]
        )
    )
    story.append(gear_table)
    story.append(Spacer(1, 5 * mm))

    story.append(
        faq(
            "Absage oder Camp-Wechsel",
            "Informieren Sie uns so früh wie möglich per E-Mail. Für Eltern entsteht aus der "
            "gesponserten Teilnahme keine Zahlungs- oder Erstattungspflicht. Die Abstimmung mit dem "
            "Kooperationspartner erfolgt intern.",
        )
    )

    contact = Table(
        [[
            Paragraph("<b>Fragen zum Camp?</b><br/>kontakt@talentexperte.de<br/>+49 1523 4678108", body),
            Paragraph(
                "<b>Trainingsadresse</b><br/>JSC Blau-Weiß Aachen 1946 e.V.<br/>Branderhofer Weg, 52066 Aachen",
                body,
            ),
        ]],
        colWidths=[79 * mm, 79 * mm],
    )
    contact.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFF4F4")),
                ("BOX", (0, 0), (-1, -1), 0.8, RED),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 5 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5 * mm),
            ]
        )
    )
    story.append(contact)

    doc.build(story, onFirstPage=page_footer, onLaterPages=page_footer)
    print(OUTPUT)


if __name__ == "__main__":
    build()
