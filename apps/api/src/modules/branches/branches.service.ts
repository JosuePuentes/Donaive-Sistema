import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.branch.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  findActive() {
    return this.prisma.branch.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      select: { id: true, code: true, name: true, isDefault: true },
    });
  }

  async findOne(id: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) throw new NotFoundException('Sucursal no encontrada');
    return branch;
  }

  async create(dto: CreateBranchDto) {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.prisma.branch.findUnique({ where: { code } });
    if (existing) throw new ConflictException(`El código ${code} ya existe`);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.branch.updateMany({ data: { isDefault: false } });
      }

      const branch = await tx.branch.create({
        data: {
          code,
          name: dto.name.trim(),
          address: dto.address?.trim(),
          phone: dto.phone?.trim(),
          isDefault: dto.isDefault ?? false,
        },
      });

      const products = await tx.product.findMany({ select: { id: true } });
      if (products.length > 0) {
        await tx.branchStock.createMany({
          data: products.map((p) => ({
            branchId: branch.id,
            productId: p.id,
            stock: 0,
          })),
          skipDuplicates: true,
        });
      }

      return branch;
    });
  }

  async update(id: string, dto: UpdateBranchDto) {
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.branch.updateMany({
          where: { NOT: { id } },
          data: { isDefault: false },
        });
      }

      return tx.branch.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          address: dto.address?.trim(),
          phone: dto.phone?.trim(),
          isActive: dto.isActive,
          isDefault: dto.isDefault,
        },
      });
    });
  }

  async deactivate(id: string) {
    const branch = await this.findOne(id);
    if (branch.isDefault) {
      throw new BadRequestException('No puede desactivar la sucursal principal');
    }

    const usersCount = await this.prisma.user.count({
      where: { branchId: id, status: 'ACTIVE' },
    });
    if (usersCount > 0) {
      throw new BadRequestException(
        `Hay ${usersCount} usuario(s) activos en esta sucursal`,
      );
    }

    return this.prisma.branch.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
