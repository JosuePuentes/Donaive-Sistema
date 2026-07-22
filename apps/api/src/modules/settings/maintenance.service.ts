import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getOperationalCounts() {
    const [products, movements, invoices, purchases, customers, suppliers, users] =
      await Promise.all([
        this.prisma.product.count(),
        this.prisma.inventoryMovement.count(),
        this.prisma.invoice.count(),
        this.prisma.purchase.count(),
        this.prisma.customer.count(),
        this.prisma.supplier.count(),
        this.prisma.user.count(),
      ]);

    return { products, movements, invoices, purchases, customers, suppliers, users };
  }

  async purgeOperationalData(confirm: string) {
    if (confirm !== 'BORRAR_DATOS') {
      throw new BadRequestException('Confirmación inválida. Envía { "confirm": "BORRAR_DATOS" }.');
    }

    const before = await this.getOperationalCounts();
    if (before.users === 0) {
      throw new BadRequestException('No hay usuarios en la base de datos.');
    }

    await this.prisma.$transaction(async (tx) => {
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

    const after = await this.getOperationalCounts();

    return {
      message: 'Datos operativos eliminados. Usuarios, roles, permisos, sucursales y configuración se conservaron.',
      before,
      after,
    };
  }
}
