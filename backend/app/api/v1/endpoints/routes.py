from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional, List
from io import BytesIO
from datetime import datetime

from app.core.database import get_db
from app.core.security import (
    get_current_user, verify_password, get_password_hash, create_access_token
)
from app.models import User, Client, Product, Invoice, InvoiceStatus
from app.schemas import (
    UserCreate, UserResponse, Token,
    ClientCreate, ClientUpdate, ClientResponse,
    ProductCreate, ProductUpdate, ProductResponse,
    InvoiceCreate, InvoiceUpdate, InvoiceResponse, InvoiceSummary,
)
from app.services import invoice_service
from app.services.pdf_service import generate_invoice_pdf

router = APIRouter()


# ════════════════════════════════════════════════════════
# AUTH
# ════════════════════════════════════════════════════════

@router.post("/auth/register", response_model=UserResponse, status_code=201)
def register(data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=get_password_hash(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/auth/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Usuario inactivo")
    token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ════════════════════════════════════════════════════════
# CLIENTES
# ════════════════════════════════════════════════════════

@router.get("/clients", response_model=dict)
def list_clients(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Client)
    if active_only:
        query = query.filter(Client.is_active == True)
    if search:
        query = query.filter(
            or_(Client.name.ilike(f"%{search}%"),
                Client.document_number.ilike(f"%{search}%"),
                Client.email.ilike(f"%{search}%"))
        )
    total = query.count()
    clients = query.order_by(Client.name).offset((page-1)*per_page).limit(per_page).all()

    result = []
    for c in clients:
        paid_sum = db.query(func.sum(Invoice.total)).filter(
            Invoice.client_id == c.id,
            Invoice.status == InvoiceStatus.PAID
        ).scalar() or 0
        count = db.query(func.count(Invoice.id)).filter(Invoice.client_id == c.id).scalar() or 0
        d = ClientResponse.from_orm(c)
        d.total_invoiced = paid_sum
        d.invoice_count = count
        result.append(d)

    return {"items": result, "total": total, "page": page,
            "per_page": per_page, "pages": -(-total // per_page)}


@router.post("/clients", response_model=ClientResponse, status_code=201)
def create_client(
    data: ClientCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if db.query(Client).filter(Client.document_number == data.document_number).first():
        raise HTTPException(status_code=400, detail="Ya existe un cliente con ese documento")
    client = Client(**data.dict())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.get("/clients/{client_id}", response_model=ClientResponse)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return client


@router.put("/clients/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: int,
    data: ClientUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    for field, value in data.dict(exclude_unset=True).items():
        setattr(client, field, value)
    db.commit()
    db.refresh(client)
    return client


@router.delete("/clients/{client_id}", status_code=204)
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    client.is_active = False  # Soft delete
    db.commit()


# ════════════════════════════════════════════════════════
# PRODUCTOS
# ════════════════════════════════════════════════════════

@router.get("/products", response_model=dict)
def list_products(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Product)
    if active_only:
        query = query.filter(Product.is_active == True)
    if search:
        query = query.filter(
            or_(Product.name.ilike(f"%{search}%"),
                Product.code.ilike(f"%{search}%"))
        )
    total = query.count()
    products = query.order_by(Product.name).offset((page-1)*per_page).limit(per_page).all()
    return {"items": [ProductResponse.from_orm(p) for p in products], "total": total, "page": page,
        "per_page": per_page, "pages": -(-total // per_page)}


@router.post("/products", response_model=ProductResponse, status_code=201)
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if db.query(Product).filter(Product.code == data.code).first():
        raise HTTPException(status_code=400, detail="Ya existe un producto con ese código")
    product = Product(**data.dict())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("/products/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return p


@router.put("/products/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    for field, value in data.dict(exclude_unset=True).items():
        setattr(p, field, value)
    db.commit()
    db.refresh(p)
    return p


# ════════════════════════════════════════════════════════
# FACTURAS
# ════════════════════════════════════════════════════════

@router.get("/invoices", response_model=dict)
def list_invoices(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[InvoiceStatus] = None,
    client_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    invoices, total = invoice_service.get_invoices(
        db, skip=(page-1)*per_page, limit=per_page,
        status=status, client_id=client_id, search=search
    )
    items = []
    for inv in invoices:
        items.append({
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "client_id": inv.client_id,
            "client_name": inv.client.name,
            "status": inv.status,
            "issue_date": inv.issue_date,
            "due_date": inv.due_date,
            "total": inv.total,
        })
    return {"items": items, "total": total, "page": page,
            "per_page": per_page, "pages": -(-total // per_page)}


@router.post("/invoices", response_model=InvoiceResponse, status_code=201)
def create_invoice(
    data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return invoice_service.create_invoice(db, data, current_user.id)


@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return inv


@router.put("/invoices/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(
    invoice_id: int,
    data: InvoiceUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return invoice_service.update_invoice(db, invoice_id, data)


@router.post("/invoices/{invoice_id}/issue", response_model=InvoiceResponse)
def issue_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Cambia el estado de borrador a emitida."""
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    if inv.status != InvoiceStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Solo se pueden emitir facturas en borrador")
    inv.status = InvoiceStatus.ISSUED
    db.commit()
    db.refresh(inv)
    return inv


@router.post("/invoices/{invoice_id}/cancel", response_model=InvoiceResponse)
def cancel_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    if inv.status == InvoiceStatus.PAID:
        raise HTTPException(status_code=400, detail="No se puede anular una factura pagada")
    inv.status = InvoiceStatus.CANCELLED
    db.commit()
    db.refresh(inv)
    return inv


@router.get("/invoices/{invoice_id}/pdf")
def download_invoice_pdf(
    invoice_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    pdf_bytes = generate_invoice_pdf(inv)
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={inv.invoice_number}.pdf"}
    )


# ════════════════════════════════════════════════════════
# DASHBOARD
# ════════════════════════════════════════════════════════

@router.get("/dashboard/stats")
def dashboard_stats(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return invoice_service.get_dashboard_stats(db)


@router.get("/dashboard/revenue")
def monthly_revenue(
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return invoice_service.get_monthly_revenue(db, year)


@router.get("/dashboard/top-clients")
def top_clients(
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return invoice_service.get_top_clients(db, limit)
