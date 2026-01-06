import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Query,
    UseGuards,
    Delete,
  } from '@nestjs/common';
  import { OrdersService } from './orders.service';
  import { CreateOrderDto } from './dto/create-order.dto';
  import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
  import { RolesGuard } from '../auth/guards/roles/roles.guard';
  import { Roles } from '../auth/decorators/roles.decorator';
  import { CurrentUser } from '../auth/decorators/current-user.decorator';
  import { Role, OrderStatus } from '../generated/prisma/enums'
  
  @Controller('orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  export class OrdersController {
    constructor(private ordersService: OrdersService) {}
  
    @Post()
    create(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
      return this.ordersService.create(user?.id, dto);
    }
  
    @Get()
    @Roles(Role.ADMIN, Role.SUPER)
    findAll(@Query('status') status?: OrderStatus, @Query('limit') limit?: string) {
      return this.ordersService.findAll({
        status,
        limit: limit ? parseInt(limit) : undefined,
      });
    }
  
    @Get('my-orders')
    getUserOrders(@CurrentUser() user: any) {
      return this.ordersService.getUserOrders(user.id);
    }
  
    @Get('pending')
    @Roles(Role.ADMIN, Role.SUPER)
    getPendingOrders() {
      return this.ordersService.getPendingOrders();
    }
  
    @Get('scheduled')
    @Roles(Role.ADMIN, Role.SUPER)
    getScheduledOrders() {
      return this.ordersService.getScheduledOrders();
    }
  
    @Get(':id')
    findOne(@Param('id') id: string) {
      return this.ordersService.findOne(id);
    }
  
    @Patch(':id/status')
    @Roles(Role.ADMIN, Role.SUPER)
    updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
      return this.ordersService.updateStatus(id, dto);
    }
  
    @Delete(':id/cancel')
    cancelOrder(@Param('id') id: string, @CurrentUser() user: any) {
      return this.ordersService.cancelOrder(id, user.id);
    }
  }