import { NotFoundException } from '@nestjs/common';
import { AdminIncidentsController } from '../src/admin/admin-incidents.controller';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuditService } from '../src/audit/audit.service';

const prismaMock = () =>
  ({
    sosIncident: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  }) as unknown as PrismaService;

describe('AdminIncidentsController', () => {
  let controller: AdminIncidentsController;
  let prisma: PrismaService;
  let audit: AuditService;
  const admin = { sub: 'admin-1', role: 'ADMIN' } as any;

  beforeEach(() => {
    prisma = prismaMock();
    audit = { log: jest.fn(), logSosIncident: jest.fn() } as unknown as AuditService;
    controller = new AdminIncidentsController(prisma, audit);
  });

  describe('listIncidents()', () => {
    it('should return paginated incidents with defaults', async () => {
      const incidents = [{ id: 'i1', status: 'ACTIVE' }];
      (prisma.sosIncident.findMany as jest.Mock).mockResolvedValue(incidents);
      (prisma.sosIncident.count as jest.Mock).mockResolvedValue(1);

      const result = await controller.listIncidents({});
      expect(result.data).toEqual(incidents);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('should apply status filter', async () => {
      (prisma.sosIncident.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.sosIncident.count as jest.Mock).mockResolvedValue(0);

      await controller.listIncidents({ status: 'ACTIVE' as any });
      const findManyCall = (prisma.sosIncident.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.where.status).toBe('ACTIVE');
    });
  });

  describe('updateIncident()', () => {
    it('should throw NotFoundException for missing incident', async () => {
      (prisma.sosIncident.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        controller.updateIncident('i-missing', { status: 'ACKNOWLEDGED' as any }, admin),
      ).rejects.toThrow(NotFoundException);
    });

    it('should set respondedAt when ACKNOWLEDGED', async () => {
      const incident = { id: 'i1', status: 'ACTIVE' };
      const updated = { ...incident, status: 'ACKNOWLEDGED', respondedAt: new Date() };
      (prisma.sosIncident.findUnique as jest.Mock).mockResolvedValue(incident);
      (prisma.sosIncident.update as jest.Mock).mockResolvedValue(updated);

      await controller.updateIncident('i1', { status: 'ACKNOWLEDGED' as any }, admin);
      const updateCall = (prisma.sosIncident.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.respondedAt).toBeDefined();
      expect(updateCall.data.responderUserId).toBe('admin-1');
    });

    it('should set resolvedAt when RESOLVED', async () => {
      const incident = { id: 'i1', status: 'ACKNOWLEDGED' };
      const updated = { ...incident, status: 'RESOLVED', resolvedAt: new Date() };
      (prisma.sosIncident.findUnique as jest.Mock).mockResolvedValue(incident);
      (prisma.sosIncident.update as jest.Mock).mockResolvedValue(updated);

      await controller.updateIncident(
        'i1',
        { status: 'RESOLVED' as any, resolutionNotes: 'All clear' },
        admin,
      );
      const updateCall = (prisma.sosIncident.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.resolvedAt).toBeDefined();
      expect(updateCall.data.resolutionNotes).toBe('All clear');
    });

    it('should log audit on status change', async () => {
      const incident = { id: 'i1', status: 'ACTIVE' };
      (prisma.sosIncident.findUnique as jest.Mock).mockResolvedValue(incident);
      (prisma.sosIncident.update as jest.Mock).mockResolvedValue({ ...incident, status: 'ACKNOWLEDGED' });

      await controller.updateIncident('i1', { status: 'ACKNOWLEDGED' as any }, admin);
      expect(audit.logSosIncident).toHaveBeenCalledWith(
        'admin-1',
        expect.any(String),
        'i1',
        expect.objectContaining({ newStatus: 'ACKNOWLEDGED' }),
      );
    });
  });
});
