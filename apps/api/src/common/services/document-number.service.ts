import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DocumentNumberService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(prefix: string, model: 'adjustment'): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const count = await this.prisma.inventoryAdjustment.count({
      where: { createdAt: { gte: startOfDay } },
    });

    return `${prefix}-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }
}
