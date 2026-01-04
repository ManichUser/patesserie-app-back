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
import { PrismaModule } from './prisma/prisma.module';


@Module({
  imports: [AuthModule, UsersModule, ProductsModule, OrdersModule,
    CartModule, WhatsappModule,
    CloudinaryModule, PrismaModule,
    AuthModule,],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
