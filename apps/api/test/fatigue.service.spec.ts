import { FatigueService } from '../src/fatigue/fatigue.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/storage/storage.service';
import { ConfigService } from '@nestjs/config';
import { FatigueLevel } from '@prisma/client';

const prismaMock = () =>
  ({
    driverProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    fatigueDetectionLog: {
      create: jest.fn(),
    },
  } as unknown as PrismaService);

const configMock = (overrides: Record<string, string> = {}) => {
  const defaults: Record<string, string> = {
    FATIGUE_MODE: 'mock',
    GEMINI_API_KEY: '',
  };
  const merged = { ...defaults, ...overrides };
  return {
    get: jest.fn((key: string, defaultValue?: string) => merged[key] ?? defaultValue),
  } as unknown as ConfigService;
};

const storageMock = () =>
  ({
    putBuffer: jest.fn().mockResolvedValue(undefined),
  } as unknown as StorageService);

describe('FatigueService', () => {
  let service: FatigueService;
  let prisma: PrismaService;
  let storage: StorageService;

  beforeEach(() => {
    prisma = prismaMock();
    storage = storageMock();
    service = new FatigueService(configMock(), prisma, storage);
  });

  describe('checkFatigue() — mock mode', () => {
    it('returns NORMAL with isFatigued=false', async () => {
      (prisma.driverProfile.update as jest.Mock).mockResolvedValue({});
      (prisma.fatigueDetectionLog.create as jest.Mock).mockResolvedValue({});

      const result = await service.checkFatigue('profile-1', 'base64data');

      expect(result.isFatigued).toBe(false);
      expect(result.fatigueLevel).toBe(FatigueLevel.NORMAL);
      expect(result.confidence).toBe(0.95);
      expect(result.cooldownMinutes).toBe(0);
    });

    it('creates a FatigueDetectionLog record', async () => {
      (prisma.driverProfile.update as jest.Mock).mockResolvedValue({});
      (prisma.fatigueDetectionLog.create as jest.Mock).mockResolvedValue({});

      await service.checkFatigue('profile-1', 'base64data');

      expect(prisma.fatigueDetectionLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          driverProfileId: 'profile-1',
          isFatigued: false,
          fatigueLevel: FatigueLevel.NORMAL,
          isOnRide: false,
        }),
      });
    });

    it('updates DriverProfile with lastFatigueCheckAt and clears cooldown', async () => {
      (prisma.driverProfile.update as jest.Mock).mockResolvedValue({});
      (prisma.fatigueDetectionLog.create as jest.Mock).mockResolvedValue({});

      await service.checkFatigue('profile-1', 'base64data');

      expect(prisma.driverProfile.update).toHaveBeenCalledWith({
        where: { id: 'profile-1' },
        data: expect.objectContaining({
          lastFatigueCheckAt: expect.any(Date),
          lastFatigueLevel: FatigueLevel.NORMAL,
          fatigueCooldownUntil: null,
        }),
      });
    });
  });

  describe('canGoOnline()', () => {
    it('returns allowed=false if face not enrolled', async () => {
      (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({
        faceEnrolledAt: null,
        lastFatigueCheckAt: null,
        lastFatigueLevel: null,
        fatigueCooldownUntil: null,
      });

      const result = await service.canGoOnline('profile-1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Face enrollment required');
    });

    it('returns allowed=false if fatigue cooldown is active', async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000);
      (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({
        faceEnrolledAt: new Date(),
        lastFatigueCheckAt: new Date(),
        lastFatigueLevel: FatigueLevel.MODERATE,
        fatigueCooldownUntil: futureDate,
      });

      const result = await service.canGoOnline('profile-1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Fatigue cooldown active');
      expect(result.cooldownUntil).toEqual(futureDate);
    });

    it('returns allowed=false if fatigue check expired (>2 hours)', async () => {
      const oldCheck = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago
      (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({
        faceEnrolledAt: new Date(),
        lastFatigueCheckAt: oldCheck,
        lastFatigueLevel: FatigueLevel.NORMAL,
        fatigueCooldownUntil: null,
      });

      const result = await service.canGoOnline('profile-1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Fatigue check required');
    });

    it('returns allowed=false if no fatigue check at all', async () => {
      (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({
        faceEnrolledAt: new Date(),
        lastFatigueCheckAt: null,
        lastFatigueLevel: null,
        fatigueCooldownUntil: null,
      });

      const result = await service.canGoOnline('profile-1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Fatigue check required');
    });

    it('returns allowed=true when all conditions met', async () => {
      const recentCheck = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
      (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({
        faceEnrolledAt: new Date(),
        lastFatigueCheckAt: recentCheck,
        lastFatigueLevel: FatigueLevel.NORMAL,
        fatigueCooldownUntil: null,
      });

      const result = await service.canGoOnline('profile-1');

      expect(result.allowed).toBe(true);
    });

    it('returns allowed=true when cooldown is in the past', async () => {
      const pastCooldown = new Date(Date.now() - 10 * 60 * 1000); // 10 min ago
      const recentCheck = new Date(Date.now() - 30 * 60 * 1000);
      (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({
        faceEnrolledAt: new Date(),
        lastFatigueCheckAt: recentCheck,
        lastFatigueLevel: FatigueLevel.MILD,
        fatigueCooldownUntil: pastCooldown,
      });

      const result = await service.canGoOnline('profile-1');

      expect(result.allowed).toBe(true);
    });

    it('returns allowed=false if profile not found', async () => {
      (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.canGoOnline('nonexistent');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Driver profile not found');
    });
  });

  describe('enrollFace()', () => {
    it('stores face image in R2 and updates DriverProfile', async () => {
      (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({
        profilePhotoKey: null,
      });
      (prisma.driverProfile.update as jest.Mock).mockResolvedValue({});

      const result = await service.enrollFace('profile-1', 'base64imagedata');

      expect(result.success).toBe(true);
      expect(result.enrolledAt).toBeDefined();
      expect(storage.putBuffer).toHaveBeenCalledWith(
        expect.stringContaining('drivers/profile-1/enrolled-face/'),
        expect.any(Buffer),
        'image/jpeg',
      );
      expect(prisma.driverProfile.update).toHaveBeenCalledWith({
        where: { id: 'profile-1' },
        data: expect.objectContaining({
          enrolledFaceKey: expect.stringContaining('drivers/profile-1/enrolled-face/'),
          faceEnrolledAt: expect.any(Date),
          profilePhotoKey: expect.stringContaining('drivers/profile-1/enrolled-face/'),
          profilePhotoUploadedAt: expect.any(Date),
        }),
      });
    });

    it('does not overwrite existing profilePhotoKey', async () => {
      (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({
        profilePhotoKey: 'existing-key',
      });
      (prisma.driverProfile.update as jest.Mock).mockResolvedValue({});

      await service.enrollFace('profile-1', 'base64imagedata');

      const updateCall = (prisma.driverProfile.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.profilePhotoKey).toBeUndefined();
    });
  });
});
