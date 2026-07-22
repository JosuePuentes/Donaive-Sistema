import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { BranchesService } from './branches.service';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('branches')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @RequirePermissions('BRANCHES_VIEW', 'USERS_MANAGE')
  findAll() {
    return this.branchesService.findAll();
  }

  @Get('active')
  @RequirePermissions('BRANCHES_VIEW', 'USERS_MANAGE', 'PRODUCTS_VIEW')
  findActive() {
    return this.branchesService.findActive();
  }

  @Get(':id')
  @RequirePermissions('BRANCHES_VIEW')
  findOne(@Param('id') id: string) {
    return this.branchesService.findOne(id);
  }

  @Post()
  @RequirePermissions('BRANCHES_MANAGE')
  create(@Body() dto: CreateBranchDto) {
    return this.branchesService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('BRANCHES_MANAGE')
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branchesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('BRANCHES_MANAGE')
  deactivate(@Param('id') id: string) {
    return this.branchesService.deactivate(id);
  }
}
