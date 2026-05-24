import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { BanksService } from './banks.service';
import { CreateBankDto, CreateBankAccountDto } from './dto/bank.dto';
import { CreatePaymentMethodDto } from './dto/payment-method.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BanksController {
  constructor(private readonly banksService: BanksService) {}

  @Get('banks')
  @RequirePermissions('BANKS_VIEW')
  findAllBanks() {
    return this.banksService.findAllBanks();
  }

  @Post('banks')
  @RequirePermissions('BANKS_MANAGE')
  createBank(@Body() dto: CreateBankDto) {
    return this.banksService.createBank(dto);
  }

  @Get('bank-accounts')
  @RequirePermissions('BANKS_VIEW')
  findAllAccounts() {
    return this.banksService.findAllAccounts();
  }

  @Post('bank-accounts')
  @RequirePermissions('BANKS_MANAGE')
  createAccount(@Body() dto: CreateBankAccountDto) {
    return this.banksService.createAccount(dto);
  }

  @Get('payment-methods')
  @RequirePermissions('BANKS_VIEW', 'POS_ACCESS')
  findPaymentMethods() {
    return this.banksService.findAllPaymentMethods();
  }

  @Post('payment-methods')
  @RequirePermissions('BANKS_MANAGE', 'PAYMENT_METHODS_MANAGE')
  createPaymentMethod(@Body() dto: CreatePaymentMethodDto) {
    return this.banksService.createPaymentMethod(dto);
  }
}
