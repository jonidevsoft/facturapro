from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from fastapi import HTTPException, status

from app.models import Invoice, InvoiceItem, Client, InvoiceStatus
from app.schemas import InvoiceCreate, InvoiceUpdate, DashboardStats, MonthlyRevenue, TopClient


def generate_invoice_number(db: Session) -> str:
    """Genera número correlativo: INV-2026-001"""
    year = datetime.now().year
    count = db.query(Invoice).filter(
        extract("year", Invoice.created_at) == year
    ).count()
    return f"INV-{year}-{str(count + 1).zfill(3)}"


def calculate_item_totals(quantity: Decimal, unit_price: Decimal,
                           tax_rate: Decimal, discount_rate: Decimal):
    """Calcula subtotal, impuesto y total de un ítem."""
    subtotal = quantity * unit_price
    discount = subtotal * (discount_rate / 100)
    subtotal_after_discount = subtotal - discount
    tax_amount = subtotal_after_discount * (tax_rate / 100)
    total = subtotal_after_discount + tax_amount
    return subtotal, tax_amount, total, discount


def create_invoice(db: Session, data: InvoiceCreate, user_id: int) -> Invoice:
    client = db.query(Client).filter(Client.id == data.client_id, Client.is_active == True).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    if not data.items:
        raise HTTPException(status_code=400, detail="La factura debe tener al menos un ítem")

    invoice = Invoice(
        invoice_number=generate_invoice_number(db),
        client_id=data.client_id,
        payment_method=data.payment_method,
        due_date=data.due_date,
        notes=data.notes,
        terms=data.terms,
        created_by=user_id,
        status=InvoiceStatus.DRAFT,
    )
    db.add(invoice)
    db.flush()  # Para obtener el ID

    invoice_subtotal = Decimal("0")
    invoice_tax = Decimal("0")
    invoice_discount = Decimal("0")

    for item_data in data.items:
        subtotal, tax_amount, total, discount = calculate_item_totals(
            item_data.quantity, item_data.unit_price,
            item_data.tax_rate, item_data.discount_rate
        )
        item = InvoiceItem(
            invoice_id=invoice.id,
            product_id=item_data.product_id,
            description=item_data.description,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            tax_rate=item_data.tax_rate,
            discount_rate=item_data.discount_rate,
            subtotal=subtotal,
            tax_amount=tax_amount,
            total=total,
        )
        db.add(item)
        invoice_subtotal += subtotal
        invoice_tax += tax_amount
        invoice_discount += discount

    invoice.subtotal = invoice_subtotal
    invoice.tax_amount = invoice_tax
    invoice.discount_amount = invoice_discount
    invoice.total = invoice_subtotal - invoice_discount + invoice_tax

    db.commit()
    db.refresh(invoice)
    return invoice


def update_invoice(db: Session, invoice_id: int, data: InvoiceUpdate) -> Invoice:
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    if invoice.status == InvoiceStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="No se puede modificar una factura anulada")

    update_data = data.dict(exclude_unset=True)

    # Si se marca como pagada, registrar la fecha
    if update_data.get("status") == InvoiceStatus.PAID and not invoice.paid_date:
        update_data["paid_date"] = datetime.utcnow()

    for field, value in update_data.items():
        setattr(invoice, field, value)

    db.commit()
    db.refresh(invoice)
    return invoice


def get_invoices(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    status: Optional[InvoiceStatus] = None,
    client_id: Optional[int] = None,
    search: Optional[str] = None,
):
    query = db.query(Invoice)

    if status:
        query = query.filter(Invoice.status == status)
    if client_id:
        query = query.filter(Invoice.client_id == client_id)
    if search:
        query = query.filter(Invoice.invoice_number.ilike(f"%{search}%"))

    total = query.count()
    invoices = query.order_by(Invoice.created_at.desc()).offset(skip).limit(limit).all()
    return invoices, total


def get_dashboard_stats(db: Session) -> dict:
    now = datetime.utcnow()

    # Ingresos del mes actual
    monthly_revenue = db.query(func.coalesce(func.sum(Invoice.total), 0)).filter(
        Invoice.status == InvoiceStatus.PAID,
        extract("month", Invoice.paid_date) == now.month,
        extract("year", Invoice.paid_date) == now.year,
    ).scalar()

    # Total facturas emitidas
    total_invoices = db.query(func.count(Invoice.id)).filter(
        Invoice.status != InvoiceStatus.DRAFT
    ).scalar()

    # Pendientes
    pending = db.query(
        func.coalesce(func.sum(Invoice.total), 0),
        func.count(Invoice.id)
    ).filter(Invoice.status == InvoiceStatus.ISSUED).first()

    # Vencidas
    overdue = db.query(
        func.coalesce(func.sum(Invoice.total), 0),
        func.count(Invoice.id)
    ).filter(Invoice.status == InvoiceStatus.OVERDUE).first()

    # Pagadas este mes
    paid_this_month = db.query(func.count(Invoice.id)).filter(
        Invoice.status == InvoiceStatus.PAID,
        extract("month", Invoice.paid_date) == now.month,
        extract("year", Invoice.paid_date) == now.year,
    ).scalar()

    return {
        "monthly_revenue": Decimal(str(monthly_revenue)),
        "total_invoices": total_invoices or 0,
        "pending_amount": Decimal(str(pending[0])),
        "pending_count": pending[1] or 0,
        "overdue_amount": Decimal(str(overdue[0])),
        "overdue_count": overdue[1] or 0,
        "paid_this_month": paid_this_month or 0,
    }


def get_monthly_revenue(db: Session, year: int = None) -> List[dict]:
    year = year or datetime.utcnow().year
    results = db.query(
        extract("month", Invoice.paid_date).label("month"),
        func.sum(Invoice.total).label("amount"),
        func.count(Invoice.id).label("count"),
    ).filter(
        Invoice.status == InvoiceStatus.PAID,
        extract("year", Invoice.paid_date) == year,
    ).group_by("month").order_by("month").all()

    months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
    return [
        {"month": months[int(r.month) - 1], "amount": Decimal(str(r.amount)), "count": r.count}
        for r in results
    ]


def get_top_clients(db: Session, limit: int = 5) -> List[dict]:
    results = db.query(
        Client.id,
        Client.name,
        func.sum(Invoice.total).label("total"),
        func.count(Invoice.id).label("invoice_count"),
    ).join(Invoice).filter(
        Invoice.status == InvoiceStatus.PAID
    ).group_by(Client.id, Client.name).order_by(
        func.sum(Invoice.total).desc()
    ).limit(limit).all()

    return [
        {"client_id": r.id, "client_name": r.name,
         "total": Decimal(str(r.total)), "invoice_count": r.invoice_count}
        for r in results
    ]
