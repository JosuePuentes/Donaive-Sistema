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
import { BranchStockService } from '../../common/services/branch-stock.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ListProductsQueryDto } from './dto/list-products.dto';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { ImportProductRowDto } from './dto/import-products.dto';
import { mergeImportRows, normalizeImportSku } from './utils/import-rows.util';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dualCurrency: DualCurrencyService,
    private readonly branchStock: BranchStockService,
  ) {}

  async findAll(query: ListProductsQueryDto, branchId?: string | null) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 500);
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { barcode: { contains: query.search, mode: 'insensitive' } },
        { brand: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.lowStock) {
      return this.findLowStockPaginated({ page, limit, search: query.search, branchId });
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

    const data = await this.enrichWithBranchStock(
      products.map((p) => this.mapProduct(p)),
      branchId,
    );
    const withCurrency = await this.dualCurrency.enrichProducts(data);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  private async findLowStockPaginated(opts: {
    page: number;
    limit: number;
    search?: string;
    branchId?: string | null;
  }) {
    const { page, limit, search, branchId } = opts;
    const skip = (page - 1) * limit;
    const searchPattern = search ? `%${search}%` : null;

    const [countRows, idRows] = await Promise.all([
      searchPattern
        ? this.prisma.$queryRaw<[{ count: bigint }]>`
            SELECT COUNT(*)::bigint AS count FROM products
            WHERE is_active = true AND stock <= min_stock
              AND (name ILIKE ${searchPattern} OR sku ILIKE ${searchPattern}
                OR COALESCE(barcode, '') ILIKE ${searchPattern}
                OR COALESCE(brand, '') ILIKE ${searchPattern})
          `
        : this.prisma.$queryRaw<[{ count: bigint }]>`
            SELECT COUNT(*)::bigint AS count FROM products
            WHERE is_active = true AND stock <= min_stock
          `,
      searchPattern
        ? this.prisma.$queryRaw<{ id: string }[]>`
            SELECT id FROM products
            WHERE is_active = true AND stock <= min_stock
              AND (name ILIKE ${searchPattern} OR sku ILIKE ${searchPattern}
                OR COALESCE(barcode, '') ILIKE ${searchPattern}
                OR COALESCE(brand, '') ILIKE ${searchPattern})
            ORDER BY name ASC
            LIMIT ${limit} OFFSET ${skip}
          `
        : this.prisma.$queryRaw<{ id: string }[]>`
            SELECT id FROM products
            WHERE is_active = true AND stock <= min_stock
            ORDER BY name ASC
            LIMIT ${limit} OFFSET ${skip}
          `,
    ]);

    const total = Number(countRows[0]?.count ?? 0);
    const ids = idRows.map((r) => r.id);

    if (ids.length === 0) {
      return {
        data: [],
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
      };
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      include: { category: { select: { id: true, name: true } } },
    });
    const order = new Map(ids.map((id, i) => [id, i]));
    products.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

    const data = await this.dualCurrency.enrichProducts(
      products.map((p) => this.mapProduct(p)),
    );

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOne(id: string, branchId?: string | null) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true } } },
    });

    if (!product) {
      throw new NotFoundException(`Producto ${id} no encontrado`);
    }

    const [mapped] = await this.enrichWithBranchStock([this.mapProduct(product)], branchId);
    return this.dualCurrency.enrichProduct(mapped);
  }

  async findByBarcode(barcode: string, branchId?: string | null) {
    const product = await this.prisma.product.findUnique({
      where: { barcode },
      include: { category: { select: { id: true, name: true } } },
    });

    if (!product) {
      throw new NotFoundException(`Producto con código ${barcode} no encontrado`);
    }

    const [mapped] = await this.enrichWithBranchStock([this.mapProduct(product)], branchId);
    return this.dualCurrency.enrichProduct(mapped);
  }

  async create(dto: CreateProductDto, userId: string, branchId: string) {
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
          brand: dto.brand ?? '',
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
            branchId,
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
        await this.branchStock.setStock(branchId, product.id, initialStock, tx);

        const branches = await tx.branch.findMany({
          where: { isActive: true, NOT: { id: branchId } },
          select: { id: true },
        });
        if (branches.length > 0) {
          await tx.branchStock.createMany({
            data: branches.map((b) => ({
              branchId: b.id,
              productId: product.id,
              stock: 0,
            })),
            skipDuplicates: true,
          });
        }
      } else {
        const branches = await tx.branch.findMany({
          where: { isActive: true },
          select: { id: true },
        });
        if (branches.length > 0) {
          await tx.branchStock.createMany({
            data: branches.map((b) => ({
              branchId: b.id,
              productId: product.id,
              stock: 0,
            })),
            skipDuplicates: true,
          });
        }
      }

      const [mapped] = await this.enrichWithBranchStock([this.mapProduct(product)], branchId);
      return this.dualCurrency.enrichProduct(mapped);
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

  async previewImport(rows: ImportProductRowDto[]) {
    const merged = mergeImportRows(
      rows.map((r) => ({ ...r, sku: normalizeImportSku(r.sku) })).filter((r) => r.sku),
    );

    const skus = merged.map((r) => r.sku);
    const existingList = await this.prisma.product.findMany({
      where: { sku: { in: skus } },
      select: { sku: true, name: true, stock: true },
    });
    const existingBySku = new Map(existingList.map((p) => [p.sku, p]));

    const preview = merged.map((row) => {
      const existing = existingBySku.get(row.sku);
      const stockToAdd = row.stock ?? 0;
      const currentStock = existing ? Number(existing.stock) : 0;

      return {
        sku: row.sku,
        name: row.name,
        brand: row.brand ?? '',
        costUsd: row.costUsd,
        marginPercent: row.marginPercent,
        stockToAdd,
        action: existing ? ('UPDATE' as const) : ('CREATE' as const),
        currentName: existing?.name ?? null,
        currentStock,
        stockAfter: existing ? currentStock + stockToAdd : stockToAdd,
      };
    });

    return {
      originalRows: rows.length,
      mergedRows: merged.length,
      toCreate: preview.filter((p) => p.action === 'CREATE').length,
      toUpdate: preview.filter((p) => p.action === 'UPDATE').length,
      rows: preview,
    };
  }

  async importBulk(rows: ImportProductRowDto[], userId: string, branchId: string) {
    const merged = mergeImportRows(
      rows.map((r) => ({ ...r, sku: normalizeImportSku(r.sku) })).filter((r) => r.sku),
    );
    const results: Array<{ sku: string; ok: boolean; error?: string }> = [];
    const allSkus = merged.map((r) => r.sku);
    const existingProducts = await this.prisma.product.findMany({
      where: { sku: { in: allSkus } },
    });
    const existingBySku = new Map(existingProducts.map((p) => [p.sku, p]));

    for (const row of merged) {
      try {
        const existing = existingBySku.get(row.sku);
        if (existing) {
          const costUsd = row.costUsd;
          const marginPercent = row.marginPercent;
          const salePriceUsd = calculateSalePriceUsd(costUsd, marginPercent);
          const addStock = row.stock ?? 0;

          await this.prisma.$transaction(async (tx) => {
            await tx.product.update({
              where: { id: existing.id },
              data: {
                name: row.name,
                brand: row.brand ?? existing.brand ?? '',
                barcode: row.barcode ?? existing.barcode,
                description: row.description ?? existing.description,
                costUsd,
                marginPercent,
                salePriceUsd,
              },
            });

            if (addStock > 0) {
              const currentStock = await this.branchStock.getStock(branchId, existing.id, tx);
              const stockAfter = currentStock + addStock;
              const unitCostUsd = roundCurrency(costUsd, BASE_CURRENCY);
              await tx.inventoryMovement.create({
                data: {
                  branchId,
                  productId: existing.id,
                  movementType: 'ADJUSTMENT_IN',
                  quantity: addStock,
                  unitCostUsd,
                  totalCostUsd: roundCurrency(addStock * unitCostUsd, BASE_CURRENCY),
                  stockBefore: currentStock,
                  stockAfter,
                  referenceType: 'PRODUCT_IMPORT',
                  referenceId: existing.id,
                  referenceNumber: row.sku,
                  notes: 'Entrada por importación Excel',
                  createdById: userId,
                },
              });
              await this.branchStock.setStock(branchId, existing.id, stockAfter, tx);
            }
          });

          results.push({ sku: row.sku, ok: true });
        } else {
          await this.create(
            {
              sku: row.sku,
              barcode: row.barcode,
              name: row.name,
              brand: row.brand,
              description: row.description,
              costUsd: row.costUsd,
              marginPercent: row.marginPercent,
              initialStock: row.stock ?? 0,
            },
            userId,
            branchId,
          );
          results.push({ sku: row.sku, ok: true });
        }
      } catch (err) {
        results.push({
          sku: row.sku,
          ok: false,
          error: err instanceof Error ? err.message : 'Error desconocido',
        });
      }
    }

    const ok = results.filter((r) => r.ok).length;
    return {
      total: merged.length,
      originalRows: rows.length,
      ok,
      failed: merged.length - ok,
      results,
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async enrichWithBranchStock<T extends { id: string; stock: number; minStock: number }>(
    products: T[],
    branchId?: string | null,
  ) {
    if (!branchId || products.length === 0) return products;

    const stocks = await this.prisma.branchStock.findMany({
      where: {
        branchId,
        productId: { in: products.map((p) => p.id) },
      },
    });
    const stockMap = new Map(stocks.map((s) => [s.productId, Number(s.stock)]));

    return products.map((p) => {
      const stock = stockMap.get(p.id) ?? 0;
      return {
        ...p,
        stock,
        isBelowMinStock: isBelowMinStock(stock, p.minStock),
      };
    });
  }

  async searchForPos(search: string, branchId: string, limit = 60) {
    const where: Prisma.ProductWhereInput = { isActive: true };
    const q = search.trim();
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { barcode: { contains: q, mode: 'insensitive' } },
        { brand: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [products, branches] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { category: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' },
        take: limit,
      }),
      this.prisma.branch.findMany({
        where: { isActive: true },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        select: { id: true, code: true, name: true },
      }),
    ]);

    if (products.length === 0) {
      return { data: [], branches };
    }

    const productIds = products.map((p) => p.id);
    const branchStocks = await this.prisma.branchStock.findMany({
      where: { productId: { in: productIds } },
      select: { branchId: true, productId: true, stock: true },
    });

    const stockByProduct = new Map<string, Map<string, number>>();
    for (const row of branchStocks) {
      if (!stockByProduct.has(row.productId)) {
        stockByProduct.set(row.productId, new Map());
      }
      stockByProduct.get(row.productId)!.set(row.branchId, Number(row.stock));
    }

    const mapped = products.map((p) => {
      const stocks = stockByProduct.get(p.id) ?? new Map<string, number>();
      const ownStock = stocks.get(branchId) ?? 0;
      return {
        ...this.mapProduct({ ...p, stock: ownStock }),
        branchStocks: branches.map((b) => ({
          branchId: b.id,
          branchCode: b.code,
          branchName: b.name,
          stock: stocks.get(b.id) ?? 0,
          isOwn: b.id === branchId,
        })),
      };
    });

    const data = await this.dualCurrency.enrichProducts(mapped);
    return { data, branches };
  }

  private mapProduct(product: {
    id: string;
    sku: string;
    barcode: string | null;
    name: string;
    brand: string | null;
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
      brand: product.brand ?? '',
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
