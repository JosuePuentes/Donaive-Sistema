import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto } from './dto/list-products.dto';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { ImportProductsDto } from './dto/import-products.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TasaBcvInterceptor } from '../../common/interceptors/tasa-bcv.interceptor';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { BranchStockService } from '../../common/services/branch-stock.service';

@Controller('products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@UseInterceptors(TasaBcvInterceptor)
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly branchStock: BranchStockService,
  ) {}

  @Get()
  @RequirePermissions('PRODUCTS_VIEW')
  findAll(@Query() query: ListProductsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.productsService.findAll(query, user.branchId);
  }

  @Get('categories')
  @RequirePermissions('PRODUCTS_VIEW')
  findAllCategories() {
    return this.productsService.findAllCategories();
  }

  @Post('categories')
  @RequirePermissions('PRODUCTS_MANAGE')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.productsService.createCategory(dto);
  }

  @Patch('categories/:id')
  @RequirePermissions('PRODUCTS_MANAGE')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.productsService.updateCategory(id, dto);
  }

  @Get('barcode/:barcode')
  @RequirePermissions('PRODUCTS_VIEW', 'POS_PRICE_LOOKUP')
  findByBarcode(@Param('barcode') barcode: string, @CurrentUser() user: AuthenticatedUser) {
    return this.productsService.findByBarcode(barcode, user.branchId);
  }

  @Get(':id')
  @RequirePermissions('PRODUCTS_VIEW')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.productsService.findOne(id, user.branchId);
  }

  @Post('import/preview')
  @RequirePermissions('PRODUCTS_MANAGE')
  previewImport(@Body() dto: ImportProductsDto) {
    return this.productsService.previewImport(dto.rows);
  }

  @Post('import')
  @RequirePermissions('PRODUCTS_MANAGE')
  importBulk(@Body() dto: ImportProductsDto, @CurrentUser() user: AuthenticatedUser) {
    const branchId = this.branchStock.requireBranchId(user.branchId);
    return this.productsService.importBulk(dto.rows, user.id, branchId);
  }

  @Post()
  @RequirePermissions('PRODUCTS_MANAGE')
  create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthenticatedUser) {
    const branchId = this.branchStock.requireBranchId(user.branchId);
    return this.productsService.create(dto, user.id, branchId);
  }

  @Patch(':id')
  @RequirePermissions('PRODUCTS_MANAGE')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('PRODUCTS_MANAGE')
  deactivate(@Param('id') id: string) {
    return this.productsService.deactivate(id);
  }
}
