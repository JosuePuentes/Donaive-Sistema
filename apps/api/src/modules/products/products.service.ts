import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  calculateSalePriceUsd,
  isBelowMinStock,
  roundCurrency,
  BASE_CURRENCY,
} from '@flp/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DualCurrencyService } from '../../common/services/dual-currency.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ListProductsQueryDto } from './dto/list-products.dto';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dualCurrency: DualCurrencyService,
  ) {}

  async findAll(query: ListProductsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { barcode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.lowStock) {
      where.isActive = true;
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { category: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    let data = await this.dualCurrency.enrichProducts(
      products.map((p) => this.mapProduct(p)),
    );

    if (query.lowStock) {
      data = data.filter((p) => p.isBelowMinStock);
    }

    return {
      data,
      meta: {
        total: query.lowStock ? data.length : total,
        page,
        limit,
        totalPages: Math.ceil((query.lowStock ? data.length : total) / limit),
      },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true } } },
    });

    if (!product) {
      throw new NotFoundException(`Producto ${id} no encontrado`);
    }

    return this.dualCurrency.enrichProduct(this.mapProduct(product));
  }

  async findByBarcode(barcode: string) {
    const product = await this.prisma.product.findUnique({
      where: { barcode },
      include: { category: { select: { id: true, name: true } } },
    });

    if (!product) {
      throw new NotFoundException(`Producto con código ${barcode} no encontrado`);
    }

    return this.dualCurrency.enrichProduct(this.mapProduct(product));
  }

  async create(dto: CreateProductDto, userId: string) {
    await this.validateUniqueSkuBarcode(dto.sku, dto.barcode);

    if (dto.categoryId) {
      await this.ensureCategoryExists(dto.categoryId);
    }

    const salePriceUsd = calculateSalePriceUsd(dto.costUsd, dto.marginPercent);
    const initialStock = dto.initialStock ?? 0;

    if (initialStock < 0) {
      throw new BadRequestException('El stock inicial no puede ser negativo');
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          sku: dto.sku,
          barcode: dto.barcode,
          name: dto.name,
          description: dto.description,
          categoryId: dto.categoryId,
          unit: dto.unit,
          costUsd: dto.costUsd,
          marginPercent: dto.marginPercent,
          salePriceUsd,
          stock: initialStock,
          minStock: dto.minStock ?? 0,
          maxStock: dto.maxStock,
          allowNegativeStock: dto.allowNegativeStock ?? false,
        },
        include: { category: { select: { id: true, name: true } } },
      });

      if (initialStock > 0) {
        const unitCostUsd = roundCurrency(dto.costUsd, BASE_CURRENCY);
        await tx.inventoryMovement.create({
          data: {
            productId: product.id,
            movementType: 'ADJUSTMENT_IN',
            quantity: initialStock,
            unitCostUsd,
            totalCostUsd: roundCurrency(initialStock * unitCostUsd, BASE_CURRENCY),
            stockBefore: 0,
            stockAfter: initialStock,
            referenceType: 'PRODUCT_INITIAL_STOCK',
            referenceId: product.id,
            referenceNumber: product.sku,
            notes: 'Stock inicial al crear producto',
            createdById: userId,
          },
        });
      }

      return this.dualCurrency.enrichProduct(this.mapProduct(product));
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Producto ${id} no encontrado`);
    }

    if (dto.sku || dto.barcode !== undefined) {
      await this.validateUniqueSkuBarcode(
        dto.sku ?? existing.sku,
        dto.barcode !== undefined ? dto.barcode ?? undefined : existing.barcode ?? undefined,
        id,
      );
    }

    if (dto.categoryId) {
      await this.ensureCategoryExists(dto.categoryId);
    }

    const costUsd = dto.costUsd ?? Number(existing.costUsd);
    const marginPercent = dto.marginPercent ?? Number(existing.marginPercent);
    const salePriceUsd =
      dto.costUsd !== undefined || dto.marginPercent !== undefined
        ? calculateSalePriceUsd(costUsd, marginPercent)
        : undefined;

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...dto,
        salePriceUsd,
      },
      include: { category: { select: { id: true, name: true } } },
    });

    return this.dualCurrency.enrichProduct(this.mapProduct(product));
  }

  async deactivate(id: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Producto ${id} no encontrado`);
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
      include: { category: { select: { id: true, name: true } } },
    });

    return this.dualCurrency.enrichProduct(this.mapProduct(product));
  }

  // ─── Categorías ───────────────────────────────────────────────────────────

  async findAllCategories() {
    return this.prisma.productCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(dto: CreateCategoryDto) {
    const existing = await this.prisma.productCategory.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`La categoría "${dto.name}" ya existe`);
    }

    return this.prisma.productCategory.create({ data: dto });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.productCategory.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Categoría ${id} no encontrada`);
    }

    if (dto.name && dto.name !== category.name) {
      const existing = await this.prisma.productCategory.findUnique({
        where: { name: dto.name },
      });
      if (existing) {
        throw new ConflictException(`La categoría "${dto.name}" ya existe`);
      }
    }

    return this.prisma.productCategory.update({ where: { id }, data: dto });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private mapProduct(product: {
    id: string;
    sku: string;
    barcode: string | null;
    name: string;
    description: string | null;
    categoryId: string | null;
    unit: string;
    costUsd: Prisma.Decimal;
    marginPercent: Prisma.Decimal;
    salePriceUsd: Prisma.Decimal;
    stock: Prisma.Decimal;
    minStock: Prisma.Decimal;
    maxStock: Prisma.Decimal | null;
    allowNegativeStock: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    category?: { id: string; name: string } | null;
  }) {
    const stock = Number(product.stock);
    const minStock = Number(product.minStock);

    return {
      id: product.id,
      sku: product.sku,
      barcode: product.barcode,
      name: product.name,
      description: product.description,
      categoryId: product.categoryId,
      category: product.category,
      unit: product.unit,
      costUsd: Number(product.costUsd),
      marginPercent: Number(product.marginPercent),
      salePriceUsd: Number(product.salePriceUsd),
      stock,
      minStock,
      maxStock: product.maxStock ? Number(product.maxStock) : null,
      allowNegativeStock: product.allowNegativeStock,
      isActive: product.isActive,
      isBelowMinStock: isBelowMinStock(stock, minStock),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  private async validateUniqueSkuBarcode(
    sku: string,
    barcode?: string,
    excludeId?: string,
  ) {
    const skuConflict = await this.prisma.product.findFirst({
      where: { sku, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    });
    if (skuConflict) {
      throw new ConflictException(`El SKU "${sku}" ya está en uso`);
    }

    if (barcode) {
      const barcodeConflict = await this.prisma.product.findFirst({
        where: { barcode, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      });
      if (barcodeConflict) {
        throw new ConflictException(`El código de barras "${barcode}" ya está en uso`);
      }
    }
  }

  private async ensureCategoryExists(categoryId: string) {
    const category = await this.prisma.productCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Categoría ${categoryId} no encontrada`);
    }
  }
}
