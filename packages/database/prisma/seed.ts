import { PrismaClient, RoleCode, PermissionCode } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PERMISSION_DEFINITIONS: Array<{
  code: PermissionCode;
  module: string;
  description: string;
}> = [
  { code: 'CONFIG_VIEW', module: 'Configuración', description: 'Ver configuración del sistema' },
  { code: 'CONFIG_MANAGE', module: 'Configuración', description: 'Administrar configuración del sistema' },
  { code: 'BANKS_VIEW', module: 'Bancos', description: 'Ver bancos y cuentas' },
  { code: 'BANKS_MANAGE', module: 'Bancos', description: 'Administrar bancos y cuentas' },
  { code: 'PAYMENT_METHODS_MANAGE', module: 'Bancos', description: 'Administrar métodos de pago' },
  { code: 'EXCHANGE_RATE_VIEW', module: 'Multimoneda', description: 'Ver tasas BCV' },
  { code: 'EXCHANGE_RATE_MANAGE', module: 'Multimoneda', description: 'Registrar tasas BCV' },
  { code: 'PRODUCTS_VIEW', module: 'Inventario', description: 'Ver productos' },
  { code: 'PRODUCTS_MANAGE', module: 'Inventario', description: 'Administrar productos' },
  { code: 'INVENTORY_VIEW', module: 'Inventario', description: 'Ver kardex e inventario' },
  { code: 'INVENTORY_ADJUST', module: 'Inventario', description: 'Realizar ajustes de inventario' },
  { code: 'INVENTORY_SHRINKAGE', module: 'Inventario', description: 'Registrar mermas' },
  { code: 'SUPPLIERS_VIEW', module: 'Compras', description: 'Ver proveedores' },
  { code: 'SUPPLIERS_MANAGE', module: 'Compras', description: 'Administrar proveedores' },
  { code: 'PURCHASES_VIEW', module: 'Compras', description: 'Ver compras' },
  { code: 'PURCHASES_CREATE', module: 'Compras', description: 'Crear compras' },
  { code: 'PURCHASES_APPROVE', module: 'Compras', description: 'Aprobar compras' },
  { code: 'ACCOUNTS_PAYABLE_VIEW', module: 'Compras', description: 'Ver cuentas por pagar' },
  { code: 'ACCOUNTS_PAYABLE_MANAGE', module: 'Compras', description: 'Administrar cuentas por pagar' },
  { code: 'CUSTOMERS_VIEW', module: 'Ventas', description: 'Ver clientes' },
  { code: 'CUSTOMERS_MANAGE', module: 'Ventas', description: 'Administrar clientes' },
  { code: 'INVOICES_VIEW', module: 'Ventas', description: 'Ver facturas' },
  { code: 'INVOICES_CREATE', module: 'Ventas', description: 'Crear facturas' },
  { code: 'INVOICES_VOID', module: 'Ventas', description: 'Anular facturas' },
  { code: 'CREDIT_NOTES_CREATE', module: 'Ventas', description: 'Crear notas de crédito' },
  { code: 'DEBIT_NOTES_CREATE', module: 'Ventas', description: 'Crear notas de débito' },
  { code: 'ACCOUNTS_RECEIVABLE_VIEW', module: 'Ventas', description: 'Ver cuentas por cobrar' },
  { code: 'ACCOUNTS_RECEIVABLE_MANAGE', module: 'Ventas', description: 'Administrar cuentas por cobrar' },
  { code: 'POS_ACCESS', module: 'POS', description: 'Acceder al punto de venta' },
  { code: 'POS_SELL', module: 'POS', description: 'Realizar ventas en POS' },
  { code: 'POS_HOLD', module: 'POS', description: 'Congelar ventas en espera' },
  { code: 'POS_PRICE_LOOKUP', module: 'POS', description: 'Consultar precios' },
  { code: 'CASH_REGISTER_OPEN', module: 'POS', description: 'Abrir caja' },
  { code: 'CASH_REGISTER_CLOSE', module: 'POS', description: 'Cerrar caja' },
  { code: 'CASH_REGISTER_VIEW', module: 'POS', description: 'Ver sesiones de caja' },
  { code: 'REPORTS_DAILY_SALES', module: 'Reportes', description: 'Ver ventas diarias' },
  { code: 'REPORTS_SALES_BOOK', module: 'Reportes', description: 'Ver libro de ventas' },
  { code: 'REPORTS_INVENTORY_ANALYSIS', module: 'Reportes', description: 'Ver análisis de inventario' },
  { code: 'REPORTS_CASH_FLOW', module: 'Reportes', description: 'Ver flujo de caja' },
  { code: 'REPORTS_EXPORT', module: 'Reportes', description: 'Exportar reportes' },
  { code: 'USERS_VIEW', module: 'Usuarios', description: 'Ver usuarios' },
  { code: 'USERS_MANAGE', module: 'Usuarios', description: 'Administrar usuarios' },
  { code: 'ROLES_MANAGE', module: 'Usuarios', description: 'Administrar roles y permisos' },
];

const ROLE_DEFINITIONS: Array<{
  code: RoleCode;
  name: string;
  description: string;
  permissions: PermissionCode[];
}> = [
  {
    code: 'ADMIN',
    name: 'Administrador General',
    description: 'Acceso total al sistema',
    permissions: PERMISSION_DEFINITIONS.map((p) => p.code),
  },
  {
    code: 'ADMIN_OPERATOR',
    name: 'Operador Administrativo',
    description: 'Gestión operativa sin acceso a usuarios ni configuración crítica',
    permissions: [
      'CONFIG_VIEW', 'BANKS_VIEW', 'EXCHANGE_RATE_VIEW',
      'PRODUCTS_VIEW', 'PRODUCTS_MANAGE', 'INVENTORY_VIEW', 'INVENTORY_ADJUST',
      'SUPPLIERS_VIEW', 'SUPPLIERS_MANAGE', 'PURCHASES_VIEW', 'PURCHASES_CREATE',
      'ACCOUNTS_PAYABLE_VIEW', 'CUSTOMERS_VIEW', 'CUSTOMERS_MANAGE',
      'INVOICES_VIEW', 'INVOICES_CREATE', 'CREDIT_NOTES_CREATE',
      'ACCOUNTS_RECEIVABLE_VIEW', 'REPORTS_DAILY_SALES', 'REPORTS_SALES_BOOK',
      'REPORTS_INVENTORY_ANALYSIS', 'CASH_REGISTER_VIEW',
    ],
  },
  {
    code: 'CASHIER',
    name: 'Cajero / Punto de Venta',
    description: 'Interfaz POS simplificada',
    permissions: [
      'POS_ACCESS', 'POS_SELL', 'POS_HOLD', 'POS_PRICE_LOOKUP',
      'CASH_REGISTER_OPEN', 'CASH_REGISTER_CLOSE',
      'PRODUCTS_VIEW', 'EXCHANGE_RATE_VIEW',
    ],
  },
];

async function main() {
  console.log('🌱 Iniciando seed de base de datos...\n');

  // Permisos
  for (const perm of PERMISSION_DEFINITIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { module: perm.module, description: perm.description },
      create: perm,
    });
  }
  console.log(`✅ ${PERMISSION_DEFINITIONS.length} permisos creados`);

  // Roles con permisos
  for (const roleDef of ROLE_DEFINITIONS) {
    const role = await prisma.role.upsert({
      where: { code: roleDef.code },
      update: { name: roleDef.name, description: roleDef.description },
      create: {
        code: roleDef.code,
        name: roleDef.name,
        description: roleDef.description,
        isSystem: true,
      },
    });

    const permissions = await prisma.permission.findMany({
      where: { code: { in: roleDef.permissions } },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
    });
  }
  console.log(`✅ ${ROLE_DEFINITIONS.length} roles creados con permisos`);

  // Usuario administrador por defecto
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: 'ADMIN' } });
  const passwordHash = await bcrypt.hash('Admin123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ferreterialospuentes.com' },
    update: {},
    create: {
      email: 'admin@ferreterialospuentes.com',
      username: 'admin',
      passwordHash,
      firstName: 'Administrador',
      lastName: 'Sistema',
      status: 'ACTIVE',
      roles: { create: [{ roleId: adminRole.id }] },
    },
  });
  console.log(`✅ Usuario admin creado: ${admin.email} / Admin123!`);

  // Tasa BCV inicial
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.tasaBCV.upsert({
    where: { fecha: today },
    update: {},
    create: {
      fecha: today,
      montoBs: 50.0,
      fuente: 'BCV',
      notas: 'Tasa inicial de configuración — actualizar con tasa BCV real',
      usuarioId: admin.id,
    },
  });
  console.log('✅ Tasa BCV inicial registrada (USD/VES = 50.00)');

  // Configuración del sistema
  const configs = [
    { key: 'BASE_CURRENCY', value: 'USD', label: 'Moneda base del sistema' },
    { key: 'TRANSACTION_CURRENCY', value: 'VES', label: 'Moneda de transacción legal' },
    { key: 'COMPANY_NAME', value: 'Ferretería Los Puentes', label: 'Nombre de la empresa' },
    { key: 'COMPANY_RIF', value: 'J-00000000-0', label: 'RIF de la empresa' },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value, label: config.label },
      create: config,
    });
  }
  console.log('✅ Configuración del sistema inicializada');

  // Categorías y productos de ejemplo
  const category = await prisma.productCategory.upsert({
    where: { name: 'Herramientas' },
    update: {},
    create: { name: 'Herramientas', description: 'Herramientas manuales y eléctricas' },
  });

  const sampleProducts = [
    { sku: 'MART-001', barcode: '7501234567890', name: 'Martillo 16oz', costUsd: 8.5, marginPercent: 35, stock: 25, minStock: 5 },
    { sku: 'TORN-001', barcode: '7501234567891', name: 'Juego de destornilladores', costUsd: 12.0, marginPercent: 40, stock: 15, minStock: 3 },
    { sku: 'CLAV-001', barcode: '7501234567892', name: 'Clavos 2" (lb)', costUsd: 1.2, marginPercent: 50, stock: 100, minStock: 20 },
  ];

  for (const p of sampleProducts) {
    const salePriceUsd = p.costUsd * (1 + p.marginPercent / 100);
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        barcode: p.barcode,
        name: p.name,
        categoryId: category.id,
        unit: 'UNIT',
        costUsd: p.costUsd,
        marginPercent: p.marginPercent,
        salePriceUsd,
        stock: p.stock,
        minStock: p.minStock,
      },
    });

    const existingMovement = await prisma.inventoryMovement.findFirst({
      where: { productId: product.id, referenceType: 'PRODUCT_INITIAL_STOCK' },
    });

    if (!existingMovement) {
      await prisma.inventoryMovement.create({
        data: {
          productId: product.id,
          movementType: 'ADJUSTMENT_IN',
          quantity: p.stock,
          unitCostUsd: p.costUsd,
          totalCostUsd: p.costUsd * p.stock,
          stockBefore: 0,
          stockAfter: p.stock,
          referenceType: 'PRODUCT_INITIAL_STOCK',
          referenceId: product.id,
          referenceNumber: product.sku,
          notes: 'Stock inicial (seed)',
          createdById: admin.id,
        },
      });
    }
  }
  console.log(`✅ ${sampleProducts.length} productos de ejemplo creados`);

  // Bancos y métodos de pago
  const bank = await prisma.bank.upsert({
    where: { code: 'BNC' },
    update: {},
    create: { code: 'BNC', name: 'Banco Nacional de Crédito', scope: 'NATIONAL' },
  });

  const cashAccount = await prisma.bankAccount.upsert({
    where: { bankId_accountNumber: { bankId: bank.id, accountNumber: 'CAJA-001' } },
    update: {},
    create: {
      bankId: bank.id,
      accountNumber: 'CAJA-001',
      accountName: 'Caja Principal',
      accountType: 'CASH_REGISTER',
      currency: 'USD',
    },
  });

  const paymentMethods = [
    { code: 'CASH_USD', name: 'Efectivo USD', type: 'CASH_USD' as const, currency: 'USD' as const, sortOrder: 1 },
    { code: 'CASH_VES', name: 'Efectivo Bs', type: 'CASH_VES' as const, currency: 'VES' as const, sortOrder: 2 },
    { code: 'MOBILE', name: 'Pago Móvil', type: 'MOBILE_PAYMENT' as const, currency: 'VES' as const, sortOrder: 3 },
    { code: 'ZELLE', name: 'Zelle', type: 'ZELLE' as const, currency: 'USD' as const, sortOrder: 4 },
    {
      code: 'TRANSFER_USD',
      name: 'Transferencia / Caja Admin',
      type: 'BANK_TRANSFER' as const,
      currency: 'USD' as const,
      bankAccountId: cashAccount.id,
      sortOrder: 5,
    },
  ];

  for (const pm of paymentMethods) {
    await prisma.paymentMethod.upsert({
      where: { code: pm.code },
      update: { bankAccountId: 'bankAccountId' in pm ? pm.bankAccountId : undefined },
      create: pm,
    });
  }
  console.log('✅ Bancos y métodos de pago inicializados');

  const suppliers = [
    {
      rif: 'J-30123456-7',
      businessName: 'Distribuidora El Tornillo C.A.',
      tradeName: 'El Tornillo',
      address: 'Av. Principal, Valencia',
      phone: '0241-5551234',
      email: 'ventas@eltornillo.com',
      contactName: 'María Pérez',
    },
    {
      rif: 'J-29876543-2',
      businessName: 'Ferretería Mayorista Los Andes S.A.',
      tradeName: 'Los Andes',
      address: 'Zona Industrial, Maracay',
      phone: '0243-5559876',
      contactName: 'Carlos Ruiz',
    },
  ];

  for (const s of suppliers) {
    await prisma.supplier.upsert({
      where: { rif: s.rif },
      update: {},
      create: s,
    });
  }
  console.log(`✅ ${suppliers.length} proveedores de ejemplo creados`);

  await prisma.printTemplateConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      tipoPapel: 'TICKET_80MM',
      nombreEmpresa: 'Donaive',
      rif: 'J-00000000-0',
      direccion: 'Av. Principal, Local 1',
      telefono: '+58 000-0000000',
      mensajePersonalizado: 'Ferretería y suministros',
      mostrarTasaBcv: true,
      mostrarPreciosBs: true,
      mostrarCajero: true,
      mostrarLogo: true,
      piePagina: 'Gracias por su compra. Conserve su ticket.',
    },
  });
  console.log('✅ Configuración de impresión inicializada');

  console.log('\n🎉 Seed completado exitosamente');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
