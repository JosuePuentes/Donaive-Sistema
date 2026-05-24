# Ferretería Los Puentes — Sistema POS & Administrativo

Sistema web de Punto de Venta y Administración empresarial, diseñado para superar sistemas tradicionales con UX moderna, motor multimoneda nativo y kardex estricto.

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | Next.js 15 (App Router) + TypeScript + Tailwind CSS 4 |
| **Backend** | NestJS 11 + TypeScript |
| **Base de Datos** | PostgreSQL 16 + Prisma ORM 6 |
| **Auth** | JWT + RBAC granular |
| **Monorepo** | pnpm workspaces |

## Estructura del Proyecto

```
ferreteria-los-puentes/
├── apps/
│   ├── api/                          # Backend NestJS
│   │   └── src/
│   │       ├── common/
│   │       │   ├── decorators/       # @RequirePermissions, @CurrentUser
│   │       │   ├── guards/           # JwtAuthGuard, PermissionsGuard, RolesGuard
│   │       │   ├── interfaces/
│   │       │   └── prisma/
│   │       └── modules/
│   │           ├── auth/             # Login JWT + perfil
│   │           ├── exchange-rate/    # Tasas BCV
│   │           ├── pricing/          # Motor de precios bimonetarios
│   │           ├── health/
│   │           ├── products/         # (Fase 2)
│   │           ├── inventory/        # (Fase 2)
│   │           ├── purchases/        # (Fase 2)
│   │           ├── sales/            # (Fase 2)
│   │           ├── pos/              # (Fase 2)
│   │           ├── banks/            # (Fase 2)
│   │           └── reports/          # (Fase 2)
│   └── web/                          # Frontend Next.js
│       └── src/
│           ├── app/
│           │   ├── (admin)/          # Layout administrativo
│           │   ├── (pos)/            # Layout POS simplificado
│           │   └── (auth)/           # Login
│           ├── components/
│           │   ├── ui/
│           │   ├── pos/
│           │   └── admin/
│           ├── hooks/
│           └── lib/
├── packages/
│   ├── database/                     # Prisma schema + client
│   │   └── prisma/schema.prisma
│   └── shared/                       # Lógica de negocio compartida
│       └── src/
│           ├── currency.ts           # Motor multimoneda
│           ├── pricing.ts            # Cálculo de precios
│           ├── inventory.ts          # Validación de stock
│           └── permissions.ts        # RBAC
├── docker-compose.yml
└── .env.example
```

## Modelo de Datos (Entidades Principales)

### RBAC
- **User** → **UserRole** → **Role** → **RolePermission** → **Permission**

### Multimoneda
- **ExchangeRate** — Historial diario de tasa BCV (USD → VES)
- **SystemConfig** — Configuración global

### Inventario (Kardex)
- **Product** — Costo y margen en USD, stock en tiempo real
- **InventoryMovement** — Kardex estricto con trazabilidad
- **InventoryAdjustment** — Ajustes manuales y mermas

### Compras
- **Supplier** → **Purchase** → **PurchaseDetail**
- **AccountPayable** — Cuentas por pagar

### Ventas / Facturación
- **Customer** → **Invoice** → **InvoiceDetail**
- **AccountReceivable** — Cuentas por cobrar
- Notas de crédito/débito vía `Invoice.documentType` + `parentInvoiceId`

### Bancos y Caja
- **Bank** → **BankAccount** → **LedgerEntry**
- **PaymentMethod** — Efectivo USD/VES, Pago Móvil, Zelle, etc.
- **CashRegisterSession** — Apertura/cierre con arqueo
- **DocumentPayment** — Pagos vinculados a compras/ventas

## Motor Multimoneda

Todos los productos se costean en **USD**. El precio en **VES** se calcula dinámicamente:

```
Precio VES = Precio USD × Tasa BCV del día
```

Al confirmar una transacción (factura, compra, nota), se **congela** la tasa BCV en el documento para auditoría histórica.

## RBAC — Control de Acceso

| Rol | Acceso |
|-----|--------|
| **ADMIN** | Acceso total |
| **ADMIN_OPERATOR** | Operaciones sin gestión de usuarios |
| **CASHIER** | Solo POS, caja y consulta de precios |

### Uso en Backend

```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('PURCHASES_VIEW', 'PURCHASES_CREATE')
@Get('purchases')
findAll() { ... }
```

## Inicio Rápido

### Prerrequisitos
- Node.js ≥ 20
- pnpm ≥ 9
- Docker (para PostgreSQL)

### 1. Clonar e instalar

```bash
pnpm install
```

### 2. Configurar entorno

```bash
cp .env.example .env
```

### 3. Levantar PostgreSQL

```bash
docker compose up -d
```

### 4. Migrar y seed

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### 5. Iniciar desarrollo

```bash
pnpm dev
```

- **Frontend:** http://localhost:3000
- **API:** http://localhost:3001/api/v1
- **Health check:** http://localhost:3001/api/v1/health

### Credenciales iniciales
- **Email:** admin@ferreterialospuentes.com
- **Password:** Admin123!

## API Endpoints (Fase 1)

| Método | Ruta | Permiso |
|--------|------|---------|
| POST | `/auth/login` | Público |
| GET | `/auth/me` | Autenticado |
| GET | `/health` | Público |
| GET | `/exchange-rates` | EXCHANGE_RATE_VIEW |
| POST | `/exchange-rates` | EXCHANGE_RATE_MANAGE |
| GET | `/pricing/exchange-rate/current` | EXCHANGE_RATE_VIEW |
| GET | `/pricing/products/:id` | POS_ACCESS |
| POST | `/pricing/products/bulk` | POS_ACCESS |
| POST | `/pricing/calculate-line` | INVOICES_CREATE / POS_SELL |

## Próximas Fases

- [ ] Módulo de Productos e Inventario (Kardex completo)
- [ ] Módulo de Compras con costo promedio ponderado
- [ ] Módulo de Ventas y Facturación
- [ ] Interfaz POS optimizada para teclado/táctil
- [ ] Apertura/cierre de caja con arqueo
- [ ] Reportes y análisis de inventario
- [ ] Flujo de caja proyectado
