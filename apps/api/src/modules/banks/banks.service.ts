import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateBankDto, CreateBankAccountDto } from './dto/bank.dto';

@Injectable()
export class BanksService {
  constructor(private readonly prisma: PrismaService) {}

  findAllBanks() {
    return this.prisma.bank.findMany({
      where: { isActive: true },
      include: { accounts: { where: { isActive: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createBank(dto: CreateBankDto) {
    const existing = await this.prisma.bank.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Banco ${dto.code} ya existe`);
    return this.prisma.bank.create({ data: dto });
  }

  findAllAccounts() {
    return this.prisma.bankAccount.findMany({
      where: { isActive: true },
      include: { bank: { select: { id: true, code: true, name: true } } },
    });
  }

  async createAccount(dto: CreateBankAccountDto) {
    const bank = await this.prisma.bank.findUnique({ where: { id: dto.bankId } });
    if (!bank) throw new NotFoundException('Banco no encontrado');

    return this.prisma.bankAccount.create({
      data: {
        bankId: dto.bankId,
        accountNumber: dto.accountNumber,
        accountName: dto.accountName,
        accountType: dto.accountType as 'CHECKING' | 'SAVINGS' | 'CASH_REGISTER' | 'ZELLE' | 'MOBILE_PAYMENT',
        currency: (dto.currency as 'USD' | 'VES') ?? 'USD',
      },
    });
  }

  findAllPaymentMethods() {
    return this.prisma.paymentMethod.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
