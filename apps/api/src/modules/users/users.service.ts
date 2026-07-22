import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        status: true,
        branchId: true,
        branch: { select: { id: true, code: true, name: true } },
        createdAt: true,
        roles: { include: { role: { select: { code: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findRoles() {
    return this.prisma.role.findMany({
      select: { id: true, code: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (existing) throw new ConflictException('Email o usuario ya existe');

    const roles = await this.prisma.role.findMany({
      where: { code: { in: dto.roles } },
    });
    if (roles.length !== dto.roles.length) {
      throw new BadRequestException('Uno o más roles no son válidos');
    }

    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, isActive: true },
    });
    if (!branch) throw new BadRequestException('Sucursal no válida');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        branchId: dto.branchId,
        roles: { create: roles.map((r) => ({ roleId: r.id })) },
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        branchId: true,
        branch: { select: { id: true, code: true, name: true } },
        roles: { include: { role: { select: { code: true, name: true } } } },
      },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const data: {
      firstName?: string;
      lastName?: string;
      passwordHash?: string;
      branchId?: string;
    } = {};

    if (dto.firstName) data.firstName = dto.firstName;
    if (dto.lastName) data.lastName = dto.lastName;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 12);
    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, isActive: true },
      });
      if (!branch) throw new BadRequestException('Sucursal no válida');
      data.branchId = dto.branchId;
    }

    if (dto.roles?.length) {
      const roles = await this.prisma.role.findMany({
        where: { code: { in: dto.roles } },
      });
      await this.prisma.userRole.deleteMany({ where: { userId: id } });
      await this.prisma.userRole.createMany({
        data: roles.map((r) => ({ userId: id, roleId: r.id })),
      });
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        branchId: true,
        branch: { select: { id: true, code: true, name: true } },
        roles: { include: { role: { select: { code: true, name: true } } } },
      },
    });
  }
}
