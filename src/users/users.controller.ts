// src/users/users.controller.ts

import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Put,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from 'src/generated/prisma/enums';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  // ============================================
  // 👤 ENDPOINTS UTILISATEUR
  // ============================================

  @Get('profile')
  @ApiOperation({ summary: 'Récupérer mon profil' })
  @ApiResponse({ status: 200, description: 'Profil récupéré' })
  getProfile(@CurrentUser() user: any) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Mettre à jour mon profil' })
  @ApiResponse({ status: 200, description: 'Profil mis à jour' })
  updateProfile(@CurrentUser() user: any, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Mes statistiques' })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées' })
  getUserStats(@CurrentUser() user: any) {
    return this.usersService.getUserStats(user.id);
  }

  @Put('password')
  @ApiOperation({ summary: 'Changer mon mot de passe' })
  @ApiResponse({ status: 200, description: 'Mot de passe modifié' })
  @ApiResponse({ status: 401, description: 'Mot de passe actuel incorrect' })
  changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(user.id, dto);
  }

  @Delete('account')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer mon compte' })
  @ApiResponse({ status: 204, description: 'Compte supprimé' })
  deleteAccount(@CurrentUser() user: any) {
    return this.usersService.deleteAccount(user.id);
  }

  @Patch('verify-email')
  @ApiOperation({ summary: 'Vérifier mon email' })
  verifyEmail(@CurrentUser() user: any) {
    return this.usersService.verifyEmail(user.id);
  }

  @Patch('verify-phone')
  @ApiOperation({ summary: 'Vérifier mon téléphone' })
  verifyPhone(@CurrentUser() user: any) {
    return this.usersService.verifyPhone(user.id);
  }

  // ============================================
  // 🔒 ENDPOINTS ADMIN
  // ============================================

  @Get()
  @Roles(Role.ADMIN, Role.SUPER)
  @ApiOperation({ summary: 'Récupérer tous les utilisateurs (ADMIN)' })
  @ApiQuery({ name: 'role', required: false, enum: Role })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(@Query() filters: any) {
    return this.usersService.findAll(filters);
  }

  @Get('global-stats')
  @Roles(Role.ADMIN, Role.SUPER)
  @ApiOperation({ summary: 'Statistiques globales (ADMIN)' })
  getGlobalStats() {
    return this.usersService.getGlobalStats();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPER)
  @ApiOperation({ summary: 'Récupérer un utilisateur par ID (ADMIN)' })
  @ApiResponse({ status: 200, description: 'Utilisateur trouvé' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Get(':id/stats')
  @Roles(Role.ADMIN, Role.SUPER)
  @ApiOperation({ summary: 'Statistiques d\'un utilisateur (ADMIN)' })
  getUserStatsById(@Param('id') id: string) {
    return this.usersService.getUserStats(id);
  }

  @Patch(':id/role')
  @Roles(Role.SUPER)
  @ApiOperation({ summary: 'Changer le rôle d\'un utilisateur (SUPER ADMIN)' })
  @ApiResponse({ status: 200, description: 'Rôle mis à jour' })
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.usersService.updateRole(id, dto.role);
  }

  @Delete(':id')
  @Roles(Role.SUPER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un utilisateur (SUPER ADMIN)' })
  @ApiResponse({ status: 204, description: 'Utilisateur supprimé' })
  deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}