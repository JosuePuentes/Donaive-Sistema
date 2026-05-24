import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, InventoryMovementType } from '@prisma/client';
import {
  validateStockAvailability,
  calculateStockAfterMovement,
  roundCurrency,
  BASE_CURRENCY,
} from '@flp/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DocumentNumberService } from '../../common/services/document-number.service';
import {
  ListMovementsQueryDto,
  CreateAdjustmentDto,
  CreateShrinkageDto,
} from './dto/inventory.dto';

const INBOUND_TYPES: InventoryMovementType[] = [
  'PURCHASE_IN',
  'ADJUSTMENT_IN',
  'RETURN_IN',
  'TRANSFER_IN',
];

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentNumber: DocumentNumberService,
  ) {}

  async findMovements(query: ListMovementsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryMovementWhereInput = {};

    if (query.productId) {
      where.productId = query.productId;
    }

    if (query.movementType) {
      where.movementType = query.movementType;
    }

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) {
        where.createdAt.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        const end = new Date(query.dateTo);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [movements, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where,
        include: {
          product: { select: { id: true, sku: true, name: true, unit: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);

    return {
      data: movements.map((m) => this.mapMovement(m)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findKardexByProduct(productId: string, query: ListMovementsQueryDto) {
    await this.ensureProductExists(productId);
    return this.findMovements({ ...query, productId });
  }

  async findAdjustments(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [adjustments, total] = await Promise.all([
      this.prisma.inventoryAdjustment.findMany({
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          lines: {
            include: {
              product: { select: { id: true, sku: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.inventoryAdjustment.count(),
    ]);

    return {
      data: adjustments,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findAdjustment(id: string) {
    const adjustment = await this.prisma.inventoryAdjustment.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        lines: {
          include: {
            product: { select: { id: true, sku: true, name: true, unit: true } },
          },
        },
      },
    });

    if (!adjustment) {
      throw new NotFoundException(`Ajuste ${id} no encontrado`);
    }

    return adjustment;
  }

  async createAdjustment(dto: CreateAdjustmentDto, userId: string) {
    this.validateAdjustmentLines(dto.lines);

    const number = await this.documentNumber.generate('AJ', 'adjustment');

    const adjustmentId = await this.prisma.$transaction(async (tx) => {
      const adjustment = await tx.inventoryAdjustment.create({
        data: {
          number,
          reason: dto.reason,
          notes: dto.notes,
          createdById: userId,
          lines: {
            create: dto.lines.map((line) => ({
              productId: line.productId,
              movementType: line.movementType,
              quantity: line.quantity,
              unitCostUsd: 0,
              notes: line.notes,
            })),
          },
        },
      });

      for (const line of dto.lines) {
        await this.processMovement(tx, {
          productId: line.productId,
          movementType: line.movementType,
          quantity: line.quantity,
          notes: line.notes,
          userId,
          referenceType: 'INVENTORY_ADJUSTMENT',
          referenceId: adjustment.id,
          referenceNumber: number,
        });

        const product = await tx.product.findUniqueOrThrow({
          where: { id: line.productId },
        });

        await tx.inventoryAdjustmentLine.updateMany({
          where: {
            adjustmentId: adjustment.id,
            productId: line.productId,
            movementType: line.movementType,
          },
          data: { unitCostUsd: Number(product.costUsd) },
        });
      }

      return adjustment.id;
    });

    return this.findAdjustment(adjustmentId);
  }

  async createShrinkage(dto: CreateShrinkageDto, userId: string) {
    const shrinkageReasons = ['DAMAGE', 'THEFT', 'EXPIRATION', 'OTHER'];
    if (!shrinkageReasons.includes(dto.reason)) {
      throw new BadRequestException(
        'La razón de merma debe ser DAMAGE, THEFT, EXPIRATION u OTHER',
      );
    }

    const number = await this.documentNumber.generate('ME', 'adjustment');

    const lines = dto.lines.map((line) => ({
      productId: line.productId,
      movementType: 'SHRINKAGE_OUT' as InventoryMovementType,
      quantity: line.quantity,
      notes: line.notes,
    }));

    const adjustmentId = await this.prisma.$transaction(async (tx) => {
      const adjustment = await tx.inventoryAdjustment.create({
        data: {
          number,
          reason: dto.reason,
          notes: dto.notes,
          createdById: userId,
          lines: {
            create: lines.map((line) => ({
              productId: line.productId,
              movementType: line.movementType,
              quantity: line.quantity,
              unitCostUsd: 0,
              notes: line.notes,
            })),
          },
        },
      });

      for (const line of lines) {
        await this.processMovement(tx, {
          productId: line.productId,
          movementType: line.movementType,
          quantity: line.quantity,
          notes: line.notes,
          userId,
          referenceType: 'INVENTORY_SHRINKAGE',
          referenceId: adjustment.id,
          referenceNumber: number,
        });

        const product = await tx.product.findUniqueOrThrow({
          where: { id: line.productId },
        });

        await tx.inventoryAdjustmentLine.updateMany({
          where: {
            adjustmentId: adjustment.id,
            productId: line.productId,
          },
          data: { unitCostUsd: Number(product.costUsd) },
        });
      }

      return adjustment.id;
    });

    return this.findAdjustment(adjustmentId);
  }

  /** API pública para compras, ventas y POS — registra movimiento y actualiza stock */
  async registerMovement(params: {
    productId: string;
    movementType: InventoryMovementType;
    quantity: number;
    notes?: string;
    userId: string;
    referenceType: string;
    referenceId: string;
    referenceNumber: string;
    tasaBcvMomento?: number;
  }) {
    return this.prisma.$transaction((tx) => this.registerMovementInTx(tx, params));
  }

  /** Registra movimiento dentro de una transacción existente (compras/ventas) */
  async registerMovementInTx(
    tx: Prisma.TransactionClient,
    params: {
      productId: string;
      movementType: InventoryMovementType;
      quantity: number;
      notes?: string;
      userId: string;
      referenceType: string;
      referenceId: string;
      referenceNumber: string;
      tasaBcvMomento?: number;
    },
  ) {
    return this.processMovement(tx, params);
  }

  async getStockSummary() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        sku: true,
        name: true,
        stock: true,
        minStock: true,
        maxStock: true,
        unit: true,
      },
      orderBy: { stock: 'asc' },
    });

    const mapped = products.map((p) => {
      const stock = Number(p.stock);
      const minStock = Number(p.minStock);
      return {
        ...p,
        stock,
        minStock,
        maxStock: p.maxStock ? Number(p.maxStock) : null,
        isBelowMinStock: stock <= minStock,
      };
    });

    return {
      totalProducts: mapped.length,
      lowStockCount: mapped.filter((p) => p.isBelowMinStock).length,
      products: mapped,
    };
  }

  // ─── Core: procesar movimiento de inventario ──────────────────────────────

  private async processMovement(
    tx: Prisma.TransactionClient,
    params: {
      productId: string;
      movementType: InventoryMovementType;
      quantity: number;
      notes?: string;
      userId: string;
      referenceType: string;
      referenceId: string;
      referenceNumber: string;
      tasaBcvMomento?: number;
    },
  ) {
    const product = await tx.product.findUnique({
      where: { id: params.productId },
    });

    if (!product) {
      throw new NotFoundException(`Producto ${params.productId} no encontrado`);
    }

    const isInbound = INBOUND_TYPES.includes(params.movementType);
    const currentStock = Number(product.stock);

    if (!isInbound) {
      const validation = validateStockAvailability({
        currentStock,
        requestedQuantity: params.quantity,
        allowNegativeStock: product.allowNegativeStock,
      });

      if (!validation.isValid) {
        throw new BadRequestException(
          `${product.name}: ${validation.errorMessage}`,
        );
      }
    }

    const stockAfter = calculateStockAfterMovement(
      currentStock,
      params.quantity,
      isInbound,
    );

    const unitCostUsd = roundCurrency(Number(product.costUsd), BASE_CURRENCY);
    const totalCostUsd = roundCurrency(
      params.quantity * unitCostUsd,
      BASE_CURRENCY,
    );

    await tx.inventoryMovement.create({
      data: {
        productId: params.productId,
        movementType: params.movementType,
        quantity: params.quantity,
        unitCostUsd,
        totalCostUsd,
        stockBefore: currentStock,
        stockAfter,
        tasaBcvMomento: params.tasaBcvMomento,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        referenceNumber: params.referenceNumber,
        notes: params.notes,
        createdById: params.userId,
      },
    });

    await tx.product.update({
      where: { id: params.productId },
      data: { stock: stockAfter },
    });

    return stockAfter;
  }

  private validateAdjustmentLines(
    lines: CreateAdjustmentDto['lines'],
  ) {
    const allowedTypes: InventoryMovementType[] = [
      'ADJUSTMENT_IN',
      'ADJUSTMENT_OUT',
    ];

    for (const line of lines) {
      if (!allowedTypes.includes(line.movementType)) {
        throw new BadRequestException(
          'Los ajustes solo permiten ADJUSTMENT_IN o ADJUSTMENT_OUT. Use /inventory/shrinkage para mermas.',
        );
      }
    }
  }

  private async ensureProductExists(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Producto ${productId} no encontrado`);
    }
  }

  private mapMovement(movement: {
    id: string;
    productId: string;
    movementType: InventoryMovementType;
    quantity: Prisma.Decimal;
    unitCostUsd: Prisma.Decimal;
    totalCostUsd: Prisma.Decimal;
    stockBefore: Prisma.Decimal;
    stockAfter: Prisma.Decimal;
    tasaBcvMomento: Prisma.Decimal | null;
    referenceType: string | null;
    referenceId: string | null;
    referenceNumber: string | null;
    notes: string | null;
    createdAt: Date;
    product: { id: string; sku: string; name: string; unit: string };
    createdBy: { id: string; firstName: string; lastName: string };
  }) {
    return {
      id: movement.id,
      productId: movement.productId,
      product: movement.product,
      movementType: movement.movementType,
      quantity: Number(movement.quantity),
      unitCostUsd: Number(movement.unitCostUsd),
      totalCostUsd: Number(movement.totalCostUsd),
      stockBefore: Number(movement.stockBefore),
      stockAfter: Number(movement.stockAfter),
      exchangeRate: movement.tasaBcvMomento ? Number(movement.tasaBcvMomento) : null,
      tasaBcvMomento: movement.tasaBcvMomento ? Number(movement.tasaBcvMomento) : null,
      referenceType: movement.referenceType,
      referenceId: movement.referenceId,
      referenceNumber: movement.referenceNumber,
      notes: movement.notes,
      createdBy: movement.createdBy,
      createdAt: movement.createdAt,
    };
  }
}
