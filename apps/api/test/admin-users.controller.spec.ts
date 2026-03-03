import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminUsersController } from '../src/admin/admin-users.controller';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuditService } from '../src/audit/audit.service';

const prismaMock = () =>
  ({
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  }) as unknown as PrismaService;

describe('AdminUsersController', () => {
  let controller: AdminUsersController;
  let prisma: PrismaService;
  let audit: AuditService;
  const admin = { sub: 'admin-1', role: 'ADMIN' } as any;

  beforeEach(() => {
    prisma = prismaMock();
    audit = { log: jest.fn(), logSosIncident: jest.fn() } as unknown as AuditService;
    controller = new AdminUsersController(prisma, audit);
  });

  describe('listUsers()', () => {
    it('should return paginated users with defaults', async () => {
      const users = [{ id: 'u1', firstName: 'Test' }];
      (prisma.user.findMany as jest.Mock).mockResolvedValue(users);
      (prisma.user.count as jest.Mock).mockResolvedValue(1);

      const result = await controller.listUsers({});
      expect(result.data).toEqual(users);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  describe('suspendUser()', () => {
    it('should suspend user and log audit', async () => {
      const user = { id: 'u1', role: 'RIDER', isSuspended: false };
      const updated = { ...user, isSuspended: true };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prisma.user.update as jest.Mock).mockResolvedValue(updated);

      const result = await controller.suspendUser('u1', { reason: 'Bad behavior' }, admin);
      expect(result.isSuspended).toBe(true);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'admin-1',
          targetId: 'u1',
          targetType: 'User',
        }),
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        controller.suspendUser('u-missing', { reason: 'Some reason' }, admin),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for admin accounts', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'admin-2',
        role: 'ADMIN',
        isSuspended: false,
      });
      await expect(
        controller.suspendUser('admin-2', { reason: 'Some reason' }, admin),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for already suspended users', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u1',
        role: 'RIDER',
        isSuspended: true,
      });
      await expect(
        controller.suspendUser('u1', { reason: 'Some reason' }, admin),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reactivateUser()', () => {
    it('should reactivate user and log audit', async () => {
      const user = { id: 'u1', role: 'RIDER', isSuspended: true };
      const updated = { ...user, isSuspended: false };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prisma.user.update as jest.Mock).mockResolvedValue(updated);

      const result = await controller.reactivateUser('u1', admin);
      expect(result.isSuspended).toBe(false);
      expect(audit.log).toHaveBeenCalled();
    });

    it('should throw BadRequestException for non-suspended users', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u1',
        role: 'RIDER',
        isSuspended: false,
      });
      await expect(controller.reactivateUser('u1', admin)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
