import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminBookingsController } from '../src/admin/admin-bookings.controller';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuditService } from '../src/audit/audit.service';

const prismaMock = () =>
  ({
    ride: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  }) as unknown as PrismaService;

describe('AdminBookingsController', () => {
  let controller: AdminBookingsController;
  let prisma: PrismaService;
  let audit: AuditService;
  const admin = { sub: 'admin-1', role: 'ADMIN' } as any;

  beforeEach(() => {
    prisma = prismaMock();
    audit = { log: jest.fn() } as unknown as AuditService;
    controller = new AdminBookingsController(prisma, audit);
  });

  describe('listBookings()', () => {
    it('should return paginated bookings with defaults', async () => {
      const bookings = [{ id: 'r1', status: 'PENDING' }];
      (prisma.ride.findMany as jest.Mock).mockResolvedValue(bookings);
      (prisma.ride.count as jest.Mock).mockResolvedValue(1);

      const result = await controller.listBookings({});
      expect(result.data).toEqual(bookings);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  describe('getBooking()', () => {
    it('should return full ride details', async () => {
      const ride = { id: 'r1', status: 'COMPLETED', rider: {}, driver: {} };
      (prisma.ride.findUnique as jest.Mock).mockResolvedValue(ride);

      const result = await controller.getBooking('r1');
      expect(result).toEqual(ride);
    });

    it('should throw NotFoundException when not found', async () => {
      (prisma.ride.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(controller.getBooking('r-missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateBookingStatus()', () => {
    it('should cancel a PENDING ride and log audit', async () => {
      const ride = { id: 'r1', status: 'PENDING' };
      const updated = { ...ride, status: 'CANCELLED_BY_SYSTEM' };
      (prisma.ride.findUnique as jest.Mock).mockResolvedValue(ride);
      (prisma.ride.update as jest.Mock).mockResolvedValue(updated);

      const result = await controller.updateBookingStatus('r1', { reason: 'Test' }, admin);
      expect(result.status).toBe('CANCELLED_BY_SYSTEM');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'admin-1',
          targetType: 'Ride',
          targetId: 'r1',
        }),
      );
    });

    it('should throw NotFoundException for missing ride', async () => {
      (prisma.ride.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        controller.updateBookingStatus('r-missing', {}, admin),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for COMPLETED ride', async () => {
      (prisma.ride.findUnique as jest.Mock).mockResolvedValue({
        id: 'r1',
        status: 'COMPLETED',
      });
      await expect(
        controller.updateBookingStatus('r1', { reason: 'Test' }, admin),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for EXPIRED ride', async () => {
      (prisma.ride.findUnique as jest.Mock).mockResolvedValue({
        id: 'r1',
        status: 'EXPIRED',
      });
      await expect(
        controller.updateBookingStatus('r1', { reason: 'Test' }, admin),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
