import {
    Controller,
    Get,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Put,
  } from '@nestjs/common';
    import { UsersService } from './users.service';
    import { UpdateUserDto } from './dto/update-user.dto';
    import { ChangePasswordDto } from './dto/change-password.dto';
    import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
    import { RolesGuard } from '../auth/guards/roles/roles.guard';
    import { Roles } from '../auth/decorators/roles.decorator';
    import { CurrentUser } from '../auth/decorators/current-user.decorator';
    import { Role } from 'src/generated/prisma/enums';
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
    constructor(private usersService: UsersService) {}
  
    // Tous les utilisateurs (ADMIN)
    @Get()
    @Roles(Role.ADMIN, Role.SUPER)
    findAll() {
      return this.usersService.findAll();
    }
  
    // Mon profil
    @Get('profile')
    getProfile(@CurrentUser() user: any) {
      return this.usersService.getProfile(user.id);
    }
  
    // Mes statistiques
    @Get('stats')
    getUserStats(@CurrentUser() user: any) {
      return this.usersService.getUserStats(user.id);
    }
  
    // Un utilisateur par ID (ADMIN)
    @Get(':id')
    @Roles(Role.ADMIN, Role.SUPER)
    findOne(@Param('id') id: string) {
      return this.usersService.findOne(id);
    }
  
    // Mettre à jour mon profil
    @Patch('profile')
    updateProfile(@CurrentUser() user: any, @Body() dto: UpdateUserDto) {
      return this.usersService.updateProfile(user.id, dto);
    }
  
    // Changer mon mot de passe
    @Put('password')
    changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
      return this.usersService.changePassword(user.id, dto);
    }
  
    // Supprimer mon compte
    @Delete('account')
    deleteAccount(@CurrentUser() user: any) {
      return this.usersService.deleteAccount(user.id);
    }
  
    // ADMIN: Changer le rôle d'un utilisateur
    @Patch(':id/role')
    @Roles(Role.SUPER)
    updateRole(@Param('id') id: string, @Body('role') role: 'USER' | 'ADMIN' | 'SUPER') {
      return this.usersService.updateRole(id, role);
    }
  
    // ADMIN: Supprimer un utilisateur
    @Delete(':id')
    @Roles(Role.SUPER)
    deleteUser(@Param('id') id: string) {
      return this.usersService.deleteUser(id);
    }
  }
  