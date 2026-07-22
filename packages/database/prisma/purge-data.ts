import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function countRows() {
  const [
    products,
    movements,
    invoices,
    purchases,
    customers,
    suppliers,
    users,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.inventoryMovement.count(),
    prisma.invoice.count(),
    prisma.purchase.count(),
    prisma.customer.count(),
    prisma.supplier.count(),
    prisma.user.count(),
  ]);

  return { products, movements, invoices, purchases, customers, suppliers, users };
}

async function purgeOperationalData() {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`
      TRUNCATE TABLE
        supplier_payments,
        accounts_payable,
        accounts_receivable,
        ledger_entries,
        document_payments,
        cash_register_count_lines,
        invoice_details,
        invoices,
        purchase_details,
        purchases,
        inventory_adjustment_lines,
        inventory_adjustments,
        inventory_movements,
        branch_stocks,
        products,
        product_categories,
        customers,
        suppliers,
        cash_register_sessions,
        exchange_rates
      RESTART IDENTITY CASCADE
    `);

    await tx.bankAccount.updateMany({ data: { balance: 0 } });
    await tx.paymentMethod.updateMany({ data: { balance: 0 } });
  });
}

async function main() {
  const before = await countRows();
  console.log('Antes:', before);

  if (before.users === 0) {
    throw new Error('No hay usuarios en la base de datos. Abortando para evitar borrado incorrecto.');
  }

  await purgeOperationalData();

  const after = await countRows();
  console.log('Después:', after);
  console.log('Limpieza completada. Usuarios, roles, permisos, sucursales y configuración se conservaron.');
}

main()
  .catch((error) => {
    console.error('Error al limpiar datos:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
