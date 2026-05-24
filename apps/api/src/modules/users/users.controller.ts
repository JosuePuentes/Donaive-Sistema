import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('USERS_VIEW', 'USERS_MANAGE')
  findAll() {
    return this.usersService.findAll();
  }

  @Get('roles')
  @RequirePermissions('USERS_VIEW', 'USERS_MANAGE', 'ROLES_MANAGE')
  findRoles() {
    return this.usersService.findRoles();
  }

  @Post()
  @RequirePermissions('USERS_MANAGE')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('USERS_MANAGE')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }
}
