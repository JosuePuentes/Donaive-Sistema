import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BranchStockService {
  constructor(private readonly prisma: PrismaService) {}

  async getStock(
    branchId: string,
    productId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    const row = await client.branchStock.findUnique({
      where: { branchId_productId: { branchId, productId } },
    });
    return row ? Number(row.stock) : 0;
  }

  async ensureBranchStock(
    branchId: string,
    productId: string,
    tx: Prisma.TransactionClient,
  ) {
    return tx.branchStock.upsert({
      where: { branchId_productId: { branchId, productId } },
      update: {},
      create: { branchId, productId, stock: 0 },
    });
  }

  async setStock(
    branchId: string,
    productId: string,
    stockAfter: number,
    tx: Prisma.TransactionClient,
  ) {
    await this.ensureBranchStock(branchId, productId, tx);
    await tx.branchStock.update({
      where: { branchId_productId: { branchId, productId } },
      data: { stock: stockAfter },
    });
    await this.syncProductTotalStock(productId, tx);
  }

  async syncProductTotalStock(productId: string, tx: Prisma.TransactionClient) {
    const agg = await tx.branchStock.aggregate({
      where: { productId },
      _sum: { stock: true },
    });
    await tx.product.update({
      where: { id: productId },
      data: { stock: Number(agg._sum.stock ?? 0) },
    });
  }

  requireBranchId(branchId: string | null | undefined): string {
    if (!branchId) {
      throw new BadRequestException('El usuario no tiene sucursal asignada');
    }
    return branchId;
  }
}
