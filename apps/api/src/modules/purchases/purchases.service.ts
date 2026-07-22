import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
import { CreatePurchaseDto } from './dto/purchase.dto';
import { TransactionFreezeService } from '../../common/services/transaction-freeze.service';
import { TreasuryService } from '../../common/services/treasury.service';
import { InventoryService } from '../inventory/inventory.service';
import { BranchStockService } from '../../common/services/branch-stock.service';
import type { Prisma } from '@prisma/client';
import {
  calculateWeightedAverageCost,
  calculateSalePriceUsd,
  roundCurrency,
  BASE_CURRENCY,
} from '@flp/shared';

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionFreeze: TransactionFreezeService,
    private readonly inventoryService: InventoryService,
    private readonly treasuryService: TreasuryService,
    private readonly branchStock: BranchStockService,
  ) {}

  findAllSuppliers(includeInactive = false) {
    return this.prisma.supplier.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { businessName: 'asc' },
    });
  }

  async findSupplierById(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException(`Proveedor ${id} no encontrado`);
    return supplier;
  }

  async createSupplier(dto: CreateSupplierDto) {
    const existing = await this.prisma.supplier.findUnique({ where: { rif: dto.rif } });
    if (existing) throw new ConflictException(`RIF ${dto.rif} ya registrado`);
    return this.prisma.supplier.create({ data: dto });
  }

  async updateSupplier(id: string, dto: UpdateSupplierDto) {
    await this.ensureSupplier(id);
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  findAllPurchases(branchId?: string | null) {
    return this.prisma.purchase.findMany({
      where: branchId ? { branchId } : undefined,
      include: {
        supplier: { select: { id: true, businessName: true, rif: true } },
        details: { include: { product: { select: { id: true, sku: true, name: true } } } },
        accountPayable: { select: { id: true, status: true, dueDate: true, balanceUsd: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async findPurchaseById(id: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        details: { include: { product: { select: { id: true, sku: true, name: true, unit: true } } } },
        payments: { include: { paymentMethod: { select: { name: true, code: true } }, bankAccount: true } },
        accountPayable: {
          include: {
            supplierPayments: {
              orderBy: { paidAt: 'desc' },
              include: {
                paymentMethod: { select: { name: true, code: true } },
                bankAccount: { select: { accountName: true, currency: true } },
                createdBy: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });
    if (!purchase) throw new NotFoundException(`Compra ${id} no encontrada`);
    return purchase;
  }

  async createAndConfirmPurchase(dto: CreatePurchaseDto, userId: string, branchId: string) {
    await this.ensureSupplier(dto.supplierId);

    if (dto.isCredit) {
      if (!dto.dueDate) {
        throw new BadRequestException('Debe indicar fecha de vencimiento para compras a crédito');
      }
    } else if (!dto.bankAccountId) {
      throw new BadRequestException('Debe seleccionar cuenta bancaria para compras al contado');
    }

    const productIds = dto.lines.map((l) => l.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });
    if (products.length !== dto.lines.length) {
      throw new NotFoundException('Uno o más productos no encontrados o inactivos');
    }
    const productMap = new Map(products.map((p) => [p.id, p]));

    const tasaBcvMomento =
      dto.tasaBcvMomento ?? (await this.transactionFreeze.getTasaBcvMomento());

    const lineInputs = dto.lines.map((l) => ({
      unitPriceUsd: l.unitCostUsd,
      quantity: l.quantity,
    }));

    const subtotalUsd = roundCurrency(
      dto.lines.reduce((s, l) => s + l.unitCostUsd * l.quantity, 0),
      BASE_CURRENCY,
    );
    const taxUsd = dto.taxPercent
      ? roundCurrency(subtotalUsd * (dto.taxPercent / 100), BASE_CURRENCY)
      : 0;

    const { lines: frozenLines, totals } = this.transactionFreeze.freezeDocumentWithRate(
      lineInputs,
      tasaBcvMomento,
      { taxUsd },
    );

    let bankAccount: { id: string; currency: string } | null = null;
    let paymentMethod: { id: string; bankAccountId: string | null; currency: string } | null = null;

    if (!dto.isCredit && dto.bankAccountId) {
      const account = await this.prisma.bankAccount.findUnique({
        where: { id: dto.bankAccountId },
      });
      if (!account || !account.isActive) {
        throw new BadRequestException('Cuenta bancaria no válida o inactiva');
      }
      bankAccount = { id: account.id, currency: account.currency };

      if (dto.paymentMethodId) {
        paymentMethod = await this.prisma.paymentMethod.findUnique({
          where: { id: dto.paymentMethodId },
        });
      } else {
        paymentMethod = await this.prisma.paymentMethod.findFirst({
          where: { isActive: true, OR: [{ bankAccountId: dto.bankAccountId }, { type: 'BANK_TRANSFER' }] },
          orderBy: { sortOrder: 'asc' },
        });
      }
      if (!paymentMethod) {
        throw new BadRequestException('No hay método de pago configurado para registrar el egreso');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const number = await this.generatePurchaseNumberInTx(tx);

      const purchase = await tx.purchase.create({
        data: {
          number,
          branchId,
          supplierId: dto.supplierId,
          status: 'CONFIRMED',
          purchaseDate: new Date(dto.purchaseDate),
          supplierInvoiceNumber: dto.supplierInvoiceNumber.trim(),
          supplierControlNumber: dto.supplierControlNumber.trim(),
          tasaBcvMomento,
          subtotalUsd: totals.subtotalUsd,
          taxUsd: totals.taxUsd,
          totalUsd: totals.totalUsd,
          subtotalVes: totals.subtotalVes,
          taxVes: totals.taxVes,
          totalVes: totals.totalVes,
          isCredit: dto.isCredit ?? false,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          notes: dto.notes,
          createdById: userId,
          confirmedAt: new Date(),
          details: {
            create: dto.lines.map((line, i) => ({
              productId: line.productId,
              quantity: line.quantity,
              unitCostUsd: frozenLines[i].unitPriceUsd,
              marginPercent: line.marginPercent ?? Number(productMap.get(line.productId)!.marginPercent),
              totalUsd: frozenLines[i].totalUsd,
              totalVes: frozenLines[i].totalVes,
            })),
          },
        },
        include: { details: true, supplier: true },
      });

      const runningProduct = new Map<
        string,
        { stock: number; costUsd: number; marginPercent: number }
      >();
      for (const p of products) {
        const branchStock = await this.branchStock.getStock(branchId, p.id, tx);
        runningProduct.set(p.id, {
          stock: branchStock,
          costUsd: Number(p.costUsd),
          marginPercent: Number(p.marginPercent),
        });
      }

      for (let i = 0; i < dto.lines.length; i++) {
        const line = dto.lines[i];
        const base = runningProduct.get(line.productId)!;

        const newCostUsd = calculateWeightedAverageCost(
          base.stock,
          base.costUsd,
          line.quantity,
          line.unitCostUsd,
        );

        const marginPercent = line.marginPercent ?? base.marginPercent;
        const newSalePriceUsd = calculateSalePriceUsd(newCostUsd, marginPercent);
        const newStock = base.stock + line.quantity;

        runningProduct.set(line.productId, {
          stock: newStock,
          costUsd: newCostUsd,
          marginPercent,
        });

        await tx.product.update({
          where: { id: line.productId },
          data: {
            costUsd: newCostUsd,
            marginPercent,
            salePriceUsd: newSalePriceUsd,
          },
        });

        await this.inventoryService.registerMovementInTx(tx, {
          branchId,
          productId: line.productId,
          movementType: 'PURCHASE_IN',
          quantity: line.quantity,
          userId,
          referenceType: 'PURCHASE',
          referenceId: purchase.id,
          referenceNumber: number,
          tasaBcvMomento,
          notes: `Compra ${number} — ${dto.supplierInvoiceNumber}`,
        });
      }

      if (dto.isCredit && dto.dueDate) {
        await tx.accountPayable.create({
          data: {
            supplierId: dto.supplierId,
            purchaseId: purchase.id,
            tasaBcvMomento,
            originalUsd: totals.totalUsd,
            originalVes: totals.totalVes,
            balanceUsd: totals.totalUsd,
            balanceVes: totals.totalVes,
            dueDate: new Date(dto.dueDate),
          },
        });
      } else if (bankAccount && paymentMethod) {
        const paymentCurrency = bankAccount.currency as 'USD' | 'VES';
        const paymentAmount =
          paymentCurrency === BASE_CURRENCY ? totals.totalUsd : totals.totalVes;

        await tx.documentPayment.create({
          data: {
            paymentMethodId: paymentMethod.id,
            bankAccountId: bankAccount.id,
            purchaseId: purchase.id,
            amount: paymentAmount,
            currency: paymentCurrency,
            tasaBcvMomento,
            amountUsd: totals.totalUsd,
            reference: `PAGO-COMPRA-${number}`,
          },
        });

        await this.treasuryService.recordMovement(tx, paymentMethod.id, -Number(paymentAmount));
      }

      return purchase;
    });
  }

  private async generatePurchaseNumberInTx(tx: Prisma.TransactionClient): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const count = await tx.purchase.count({
      where: { createdAt: { gte: startOfDay } },
    });
    return `CO-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }

  private async ensureSupplier(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier || !supplier.isActive) {
      throw new NotFoundException(`Proveedor ${id} no encontrado`);
    }
  }
}
