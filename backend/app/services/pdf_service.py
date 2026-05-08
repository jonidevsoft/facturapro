from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.enums import TA_RIGHT, TA_CENTER, TA_LEFT
from io import BytesIO
from decimal import Decimal
from app.models import Invoice
from app.core.config import settings


# Colores corporativos
COLOR_PRIMARY = colors.HexColor("#00e5a0")
COLOR_DARK = colors.HexColor("#0a0c10")
COLOR_GRAY = colors.HexColor("#5a6075")
COLOR_LIGHT = colors.HexColor("#f0f2f5")
COLOR_WHITE = colors.white


def format_currency(amount: Decimal) -> str:
    return f"${amount:,.2f}"


def generate_invoice_pdf(invoice: Invoice) -> bytes:
    buffer = BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm,
    )

    styles = getSampleStyleSheet()
    story = []

    # ── Estilos personalizados
    title_style = ParagraphStyle(
        "Title", parent=styles["Normal"],
        fontSize=15, fontName="Helvetica-Bold",
        textColor=COLOR_DARK, spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        "Subtitle", parent=styles["Normal"],
        fontSize=10, fontName="Helvetica",
        textColor=COLOR_GRAY,
    )
    label_style = ParagraphStyle(
        "Label", parent=styles["Normal"],
        fontSize=8, fontName="Helvetica-Bold",
        textColor=COLOR_GRAY, spaceAfter=2,
        textTransform="uppercase"
    )
    value_style = ParagraphStyle(
        "Value", parent=styles["Normal"],
        fontSize=10, fontName="Helvetica",
        textColor=COLOR_DARK
    )
    right_style = ParagraphStyle(
        "Right", parent=styles["Normal"],
        fontSize=10, alignment=TA_RIGHT,
        fontName="Helvetica"
    )
    total_style = ParagraphStyle(
        "Total", parent=styles["Normal"],
        fontSize=14, fontName="Helvetica-Bold",
        textColor=COLOR_WHITE, alignment=TA_RIGHT
    )

    # ── HEADER
    header_data = [[
        Paragraph(f"<b>{settings.COMPANY_NAME}</b>", title_style),
        Paragraph(f"<b>FACTURA</b>", ParagraphStyle(
            "Inv", fontSize=22, fontName="Helvetica-Bold",
            textColor=COLOR_PRIMARY, alignment=TA_RIGHT
        )),
    ]]
    header_table = Table(header_data, colWidths=["60%", "40%"])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)

    # Sub-header empresa | número factura
    sub_data = [[
        Table([
            [Paragraph(settings.COMPANY_NIT, subtitle_style)],
            [Paragraph(settings.COMPANY_ADDRESS or "", subtitle_style)],
            [Paragraph(settings.COMPANY_EMAIL or "", subtitle_style)],
        ], colWidths=["100%"]),
        Table([
            [Paragraph("N° Factura", label_style)],
            [Paragraph(invoice.invoice_number, ParagraphStyle(
                "InvNum", fontSize=12, fontName="Helvetica-Bold",
                textColor=COLOR_DARK, alignment=TA_RIGHT
            ))],
            [Paragraph(
                invoice.issue_date.strftime("%d / %m / %Y") if invoice.issue_date else "",
                right_style
            )],
        ], colWidths=["100%"]),
    ]]
    sub_table = Table(sub_data, colWidths=["60%", "40%"])
    sub_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story.append(sub_table)
    story.append(Spacer(1, 0.5*cm))
    story.append(HRFlowable(width="100%", thickness=2, color=COLOR_PRIMARY))
    story.append(Spacer(1, 0.4*cm))

    # ── CLIENTE
    client = invoice.client
    client_block = [
        [Paragraph("FACTURADO A", label_style), Paragraph("MÉTODO DE PAGO", label_style)],
        [Paragraph(f"<b>{client.name}</b>", value_style),
         Paragraph(invoice.payment_method.value.title(), value_style)],
        [Paragraph(f"{client.document_type}: {client.document_number}", subtitle_style),
         Paragraph(
             f"Vence: {invoice.due_date.strftime('%d/%m/%Y')}" if invoice.due_date else "",
             subtitle_style
         )],
        [Paragraph(client.email or "", subtitle_style), Paragraph("", subtitle_style)],
    ]
    client_table = Table(client_block, colWidths=["60%", "40%"])
    client_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    story.append(client_table)
    story.append(Spacer(1, 0.5*cm))

    # ── TABLA DE ÍTEMS
    item_header = ["Descripción", "Cant.", "Precio Unit.", "IVA %", "Desc %", "Total"]
    item_data = [item_header]
    for item in invoice.items:
        item_data.append([
            item.description,
            str(item.quantity),
            format_currency(item.unit_price),
            f"{item.tax_rate}%",
            f"{item.discount_rate}%",
            format_currency(item.total),
        ])

    item_table = Table(
        item_data,
        colWidths=["38%", "9%", "16%", "10%", "10%", "17%"]
    )
    item_table.setStyle(TableStyle([
        # Header
        ("BACKGROUND", (0, 0), (-1, 0), COLOR_DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), COLOR_WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        # Rows
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
        ("ALIGN", (0, 1), (0, -1), "LEFT"),
        ("TOPPADDING", (0, 1), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
        # Zebra
        *[("BACKGROUND", (0, i), (-1, i), COLOR_LIGHT)
          for i in range(2, len(item_data), 2)],
        # Grid
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e0e0e0")),
        ("LINEBELOW", (0, 0), (-1, 0), 2, COLOR_PRIMARY),
    ]))
    story.append(item_table)
    story.append(Spacer(1, 0.5*cm))

    # ── TOTALES
    totals_data = [
        ["Subtotal:", format_currency(invoice.subtotal)],
        ["IVA:", format_currency(invoice.tax_amount)],
        ["Descuento:", f"- {format_currency(invoice.discount_amount)}"],
    ]
    totals_table = Table(totals_data, colWidths=["75%", "25%"])
    totals_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (0, -1), COLOR_GRAY),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(totals_table)

    # Total final
    total_data = [["TOTAL:", format_currency(invoice.total)]]
    total_table = Table(total_data, colWidths=["75%", "25%"])
    total_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), COLOR_DARK),
        ("TEXTCOLOR", (0, 0), (-1, -1), COLOR_WHITE),
        ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 14),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING", (0, 0), (-1, -1), 16),
        ("RIGHTPADDING", (0, 0), (-1, -1), 16),
        ("LINEABOVE", (0, 0), (-1, 0), 3, COLOR_PRIMARY),
    ]))
    story.append(total_table)

    # ── NOTAS
    if invoice.notes:
        story.append(Spacer(1, 0.6*cm))
        story.append(Paragraph("NOTAS", label_style))
        story.append(Paragraph(invoice.notes, subtitle_style))

    if invoice.terms:
        story.append(Spacer(1, 0.3*cm))
        story.append(Paragraph("TÉRMINOS Y CONDICIONES", label_style))
        story.append(Paragraph(invoice.terms, subtitle_style))

    # ── FOOTER
    story.append(Spacer(1, 1*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_LIGHT))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph(
        f"<i>Generado por {settings.APP_NAME} · {settings.COMPANY_NAME}</i>",
        ParagraphStyle("Footer", fontSize=8, textColor=COLOR_GRAY, alignment=TA_CENTER)
    ))

    doc.build(story)
    return buffer.getvalue()
