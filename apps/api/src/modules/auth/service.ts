import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { BadRequestError, UnauthorizedError } from '../../middleware/error.js';
import { RegisterInput, LoginInput, Role } from '@haat/shared';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_DAYS = 7;

export class AuthService {
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  generateTokens(userId: string, role: Role, vendorId?: string) {
    const accessToken = jwt.sign(
      { sub: userId, role, vendorId },
      env.JWT_ACCESS_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

    return { accessToken, refreshToken, tokenHash, expiresAt };
  }

  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (existing) {
      throw new BadRequestError('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        name: input.name,
        role: Role.CUSTOMER,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    const tokens = this.generateTokens(user.id, user.role as Role);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: tokens.tokenHash,
        expiresAt: tokens.expiresAt,
      },
    });

    return { user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: { vendor: true },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const vendorId = user.vendor?.status === 'APPROVED' ? user.vendor.id : undefined;
    const tokens = this.generateTokens(user.id, user.role as Role, vendorId);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: tokens.tokenHash,
        expiresAt: tokens.expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        vendor: user.vendor
          ? {
              id: user.vendor.id,
              storeName: user.vendor.storeName,
              slug: user.vendor.slug,
              status: user.vendor.status,
            }
          : null,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token required');
    }

    const tokenHash = this.hashToken(refreshToken);
    const existing = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { vendor: true } } },
    });

    if (!existing) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Reuse detection: if token is already revoked, revoke all tokens for this user!
    if (existing.revokedAt) {
      await prisma.refreshToken.updateMany({
        where: { userId: existing.userId },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedError('Compromised token detected. All sessions revoked.');
    }

    if (existing.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token expired');
    }

    // Revoke old token and rotate
    await prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    const vendorId = existing.user.vendor?.status === 'APPROVED' ? existing.user.vendor.id : undefined;
    const tokens = this.generateTokens(existing.user.id, existing.user.role as Role, vendorId);

    await prisma.refreshToken.create({
      data: {
        userId: existing.user.id,
        tokenHash: tokens.tokenHash,
        expiresAt: tokens.expiresAt,
      },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: existing.user.id,
        email: existing.user.email,
        name: existing.user.name,
        role: existing.user.role,
        vendor: existing.user.vendor,
      },
    };
  }

  async logout(refreshToken?: string) {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { revokedAt: new Date() },
      });
    }
    return { success: true };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        vendor: true,
        addresses: true,
      },
    });
    if (!user) {
      throw new UnauthorizedError('User not found');
    }
    return user;
  }
}

export const authService = new AuthService();

