import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { CartModule } from './cart/cart.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { PrismaService } from './prisma.service';

@Module({
  imports: [AuthModule, UsersModule, ProductsModule, OrdersModule, CartModule, WhatsappModule, CloudinaryModule],
  controllers: [AppController],
  providers: [AppService,PrismaService],
})
export class AppModule {}
