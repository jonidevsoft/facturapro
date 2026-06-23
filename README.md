# ⚡ FacturaPro — Sistema de Facturación

Sistema de facturación profesional construido con **FastAPI + React + PostgreSQL**. Incluye autenticación JWT, generación de PDF, dashboard de métricas y API REST completa.

![Stack](https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker)

## 📸 Capturas

![Login](screenshots/Login.png)
![Dashboard](screenshots/dashboard.png)
![Listadefacturas](screenshots/Listadefacturas.png)
![Clientes](screenshots/Clientes.png)
![Productos](screenshots/Productos.png)
![Detalledefactura](screenshots/Detalledefactura.png)
![PDFgenerado](screenshots/PDFgenerado.png)

## 🎥 Demo en video
[![Ver Demo](screenshots/dashboard.png)](https://go.screenpal.com/watch/cOhleontqyf)

## ✨ Características

- 🔐 **Autenticación JWT** — registro, login, rutas protegidas
- 👤 **Gestión de clientes** — CRUD completo con búsqueda y filtros
- 📦 **Catálogo de productos/servicios** — con IVA y precios configurables
- 📄 **Facturas completas** — creación, emisión, pago, anulación
- 📊 **Dashboard** — ingresos, métricas, top clientes, gráficos por mes
- 🖨️ **Exportar PDF** — facturas en PDF generadas con ReportLab
- 🐳 **Docker Compose** — levanta todo con un comando

## 🏗️ Arquitectura

```
facturapro/
├── backend/                 # FastAPI
│   ├── app/
│   │   ├── api/v1/         # Endpoints REST
│   │   ├── core/           # Config, DB, Security
│   │   ├── models/         # Modelos SQLAlchemy
│   │   ├── schemas/        # Schemas Pydantic
│   │   └── services/       # Lógica de negocio + PDF
│   ├── main.py
│   └── requirements.txt
├── frontend/                # React + Vite
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       └── services/       # API client
└── docker-compose.yml
```

## 🚀 Inicio rápido

### Con Docker (recomendado)

```bash
git clone https://github.com/tuusuario/facturapro
cd facturapro
cp backend/.env.example backend/.env
docker-compose up --build
```

Accede a:
- 🌐 Frontend: http://localhost:5173
- 📚 API Docs: http://localhost:8000/docs
- 🔌 API Base: http://localhost:8000/api/v1

### Sin Docker

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Editar con tus datos
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 📡 API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/v1/auth/register` | Registro de usuario |
| `POST` | `/api/v1/auth/login` | Login → JWT token |
| `GET`  | `/api/v1/clients` | Listar clientes |
| `POST` | `/api/v1/clients` | Crear cliente |
| `GET`  | `/api/v1/products` | Listar productos |
| `POST` | `/api/v1/products` | Crear producto |
| `GET`  | `/api/v1/invoices` | Listar facturas |
| `POST` | `/api/v1/invoices` | Crear factura |
| `POST` | `/api/v1/invoices/{id}/issue` | Emitir factura |
| `GET`  | `/api/v1/invoices/{id}/pdf` | Descargar PDF |
| `GET`  | `/api/v1/dashboard/stats` | Métricas del dashboard |

Documentación interactiva completa en `/docs` (Swagger UI).

## 🗄️ Modelos de datos

```
User → Invoice (created_by)
Client → Invoice (1:N)
Invoice → InvoiceItem (1:N)
Product → InvoiceItem (1:N)
```

**Estados de factura:** `draft → issued → paid | overdue | cancelled`

## ⚙️ Variables de entorno

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/facturapro
SECRET_KEY=clave-secreta-larga
COMPANY_NAME=Mi Empresa SAS
COMPANY_NIT=900123456-7
```

## 📄 Licencia

MIT — libre para uso personal y comercial.
