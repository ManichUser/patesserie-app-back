// src/users/dto/update-role.dto.ts

import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from 'src/generated/prisma/enums';

export class UpdateRoleDto {
  @ApiProperty({ enum: Role, description: 'Nouveau rôle' })
  @IsEnum(Role)
  role: Role;
}