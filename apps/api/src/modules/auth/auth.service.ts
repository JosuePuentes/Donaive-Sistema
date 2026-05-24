import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { PermissionCode } from '@flp/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { AuthenticatedUser, JwtPayload } from '../../common/interfaces/authenticated-user.interface';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const authenticatedUser = this.buildAuthenticatedUser(user);
    const token = this.generateToken(authenticatedUser);

    return {
      accessToken: token,
      user: authenticatedUser,
    };
  }

  async validateUser(userId: string): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      return null;
    }

    return this.buildAuthenticatedUser(user);
  }

  private buildAuthenticatedUser(user: {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    roles: Array<{
      role: {
        code: string;
        permissions: Array<{ permission: { code: string } }>;
      };
    }>;
  }): AuthenticatedUser {
    const roles = user.roles.map((ur) => ur.role.code);
    const permissionsSet = new Set<PermissionCode>();

    for (const userRole of user.roles) {
      for (const rp of userRole.role.permissions) {
        permissionsSet.add(rp.permission.code as PermissionCode);
      }
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      permissions: Array.from(permissionsSet),
    };
  }

  private generateToken(user: AuthenticatedUser): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
    };
    return this.jwtService.sign(payload);
  }
}
