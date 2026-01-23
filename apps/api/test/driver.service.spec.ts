import { DriverService } from '../src/driver/driver.service';
import { AuditService } from '../src/audit/audit.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/storage/storage.service';
import { DriverStatus } from '@prisma/client';

const prismaMock = () =>
  ({
    driverProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    driverDocument: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  } as unknown as PrismaService);

describe('DriverService status transitions', () => {
  let service: DriverService;
  let prisma: PrismaService;

  beforeEach(() => {
    prisma = prismaMock();
    const storage = {
      getUploadUrl: jest.fn(),
    } as unknown as StorageService;
    const audit = { log: jest.fn() } as unknown as AuditService;
    service = new DriverService(prisma, storage, audit);
  });

  it('approves a pending driver', async () => {
    (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({
      id: 'driver-1',
      status: DriverStatus.PENDING,
    });
    (prisma.driverProfile.update as jest.Mock).mockResolvedValue({
      id: 'driver-1',
      status: DriverStatus.APPROVED,
    });

    const result = await service.approveDriver('driver-1', 'admin-1');
    expect(result.status).toBe(DriverStatus.APPROVED);
  });

  it('rejects a driver with reason', async () => {
    (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({
      id: 'driver-2',
      status: DriverStatus.PENDING,
    });
    (prisma.driverProfile.update as jest.Mock).mockResolvedValue({
      id: 'driver-2',
      status: DriverStatus.REJECTED,
      rejectionReason: 'Invalid docs',
    });

    const result = await service.rejectDriver('driver-2', 'admin-1', 'Invalid docs');
    expect(result.status).toBe(DriverStatus.REJECTED);
    expect(result.rejectionReason).toBe('Invalid docs');
  });
});
