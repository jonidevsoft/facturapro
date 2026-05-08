from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from app.models import InvoiceStatus, PaymentMethod, ProductType


# ─── USER SCHEMAS ────────────────────────────────────────────────────────────

class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None

class UserResponse(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ─── CLIENT SCHEMAS ──────────────────────────────────────────────────────────

class ClientBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    document_type: str = "NIT"
    document_number: str = Field(..., min_length=3)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    notes: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class ClientResponse(ClientBase):
    id: int
    is_active: bool
    created_at: datetime
    total_invoiced: Optional[Decimal] = 0
    invoice_count: Optional[int] = 0
    class Config:
        from_attributes = True


# ─── PRODUCT SCHEMAS ─────────────────────────────────────────────────────────

class ProductBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=2)
    description: Optional[str] = None
    type: ProductType = ProductType.SERVICE
    unit_price: Decimal = Field(..., gt=0)
    tax_rate: Decimal = Field(default=19.0, ge=0, le=100)
    unit: str = "Und"

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    unit_price: Optional[Decimal] = None
    tax_rate: Optional[Decimal] = None
    unit: Optional[str] = None
    is_active: Optional[bool] = None

class ProductResponse(ProductBase):
    id: int
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True


# ─── INVOICE ITEM SCHEMAS ────────────────────────────────────────────────────

class InvoiceItemCreate(BaseModel):
    product_id: Optional[int] = None
    description: str = Field(..., min_length=2)
    quantity: Decimal = Field(..., gt=0)
    unit_price: Decimal = Field(..., gt=0)
    tax_rate: Decimal = Field(default=19.0, ge=0, le=100)
    discount_rate: Decimal = Field(default=0, ge=0, le=100)

class InvoiceItemResponse(InvoiceItemCreate):
    id: int
    invoice_id: int
    subtotal: Decimal
    tax_amount: Decimal
    total: Decimal
    class Config:
        from_attributes = True


# ─── INVOICE SCHEMAS ─────────────────────────────────────────────────────────

class InvoiceCreate(BaseModel):
    client_id: int
    payment_method: PaymentMethod = PaymentMethod.TRANSFER
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    items: List[InvoiceItemCreate] = Field(..., min_items=1)

class InvoiceUpdate(BaseModel):
    payment_method: Optional[PaymentMethod] = None
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    status: Optional[InvoiceStatus] = None

class InvoiceSummary(BaseModel):
    id: int
    invoice_number: str
    client_id: int
    client_name: str
    status: InvoiceStatus
    issue_date: datetime
    due_date: Optional[datetime]
    total: Decimal
    class Config:
        from_attributes = True

class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    status: InvoiceStatus
    payment_method: PaymentMethod
    issue_date: datetime
    due_date: Optional[datetime]
    paid_date: Optional[datetime]
    subtotal: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total: Decimal
    notes: Optional[str]
    terms: Optional[str]
    client: ClientResponse
    items: List[InvoiceItemResponse]
    created_at: datetime
    class Config:
        from_attributes = True


# ─── DASHBOARD SCHEMAS ───────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    monthly_revenue: Decimal
    total_invoices: int
    pending_amount: Decimal
    pending_count: int
    overdue_amount: Decimal
    overdue_count: int
    paid_this_month: int

class MonthlyRevenue(BaseModel):
    month: str
    amount: Decimal
    count: int

class TopClient(BaseModel):
    client_id: int
    client_name: str
    total: Decimal
    invoice_count: int


# ─── PAGINATION ──────────────────────────────────────────────────────────────

class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    per_page: int
    pages: int
