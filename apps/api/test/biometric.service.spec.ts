import { ConfigService } from '@nestjs/config';
import { BiometricService } from '../src/biometric/biometric.service';
import { StorageService } from '../src/storage/storage.service';
import { PrismaService } from '../src/prisma/prisma.service';

const createPrismaMock = () =>
  ({
    biometricVerification: {
      create: jest.fn().mockResolvedValue({}),
    },
    driverProfile: {
      update: jest.fn().mockResolvedValue({}),
    },
  } as unknown as PrismaService);

const mockDriverProfile = {
  id: 'profile-1',
  userId: 'user-1',
  profilePhotoKey: 'drivers/profile-1/photo.jpg',
  status: 'PENDING',
};

const createMockConfig = (overrides: Record<string, any> = {}) => {
  const defaults: Record<string, any> = {
    BIOMETRIC_MODE: 'mock',
    AWS_REGION: 'us-east-1',
    AWS_ACCESS_KEY_ID: 'test-key',
    AWS_SECRET_ACCESS_KEY: 'test-secret',
    BIOMETRIC_MIN_CONFIDENCE: 90,
  };
  const values = { ...defaults, ...overrides };
  return {
    get: jest.fn((key: string, defaultVal?: any) => values[key] ?? defaultVal),
  } as unknown as ConfigService;
};

describe('BiometricService', () => {
  describe('verifyDriverFace() - mock mode', () => {
    let service: BiometricService;
    let prisma: ReturnType<typeof createPrismaMock>;

    beforeEach(() => {
      prisma = createPrismaMock() as any;
      const config = createMockConfig({ BIOMETRIC_MODE: 'mock' });
      const storage = {} as StorageService;
      service = new BiometricService(config, storage, prisma as any);
    });

    it('returns match=true, confidence=100 in mock mode', async () => {
      const result = await service.verifyDriverFace(mockDriverProfile as any, 'base64data');

      expect(result.match).toBe(true);
      expect(result.confidence).toBe(100);
    });

    it('records biometric verification result in DB', async () => {
      await service.verifyDriverFace(mockDriverProfile as any, 'base64data');

      expect(prisma.biometricVerification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          driverProfileId: 'profile-1',
          success: true,
          confidence: 100,
        }),
      });
    });

    it('updates driverProfile.biometricVerifiedAt on success', async () => {
      await service.verifyDriverFace(mockDriverProfile as any, 'base64data');

      expect(prisma.driverProfile.update).toHaveBeenCalledWith({
        where: { id: 'profile-1' },
        data: { biometricVerifiedAt: expect.any(Date) },
      });
    });
  });

  describe('verifyDriverFace() - rekognition mode', () => {
    let prisma: ReturnType<typeof createPrismaMock>;
    let storage: StorageService;
    let service: BiometricService;
    let mockSend: jest.Mock;

    beforeEach(() => {
      prisma = createPrismaMock() as any;
      const config = createMockConfig({ BIOMETRIC_MODE: 'rekognition' });
      storage = {
        getObjectBytes: jest.fn().mockResolvedValue(Buffer.from('photo-bytes')),
      } as unknown as StorageService;

      service = new BiometricService(config, storage, prisma as any);

      // Override the Rekognition client with a mock
      mockSend = jest.fn();
      (service as any).client = { send: mockSend };
    });

    it('fetches stored photo via StorageService.getObjectBytes', async () => {
      mockSend.mockResolvedValue({ FaceMatches: [{ Similarity: 95.5 }] });

      await service.verifyDriverFace(mockDriverProfile as any, 'bGl2ZWltYWdl');

      expect(storage.getObjectBytes).toHaveBeenCalledWith('drivers/profile-1/photo.jpg');
    });

    it('returns match=true when Rekognition confidence >= threshold', async () => {
      mockSend.mockResolvedValue({ FaceMatches: [{ Similarity: 95.5 }] });

      const result = await service.verifyDriverFace(mockDriverProfile as any, 'bGl2ZWltYWdl');

      expect(result.match).toBe(true);
      expect(result.confidence).toBe(95.5);
    });

    it('returns match=false when confidence < BIOMETRIC_MIN_CONFIDENCE', async () => {
      mockSend.mockResolvedValue({ FaceMatches: [] });

      const result = await service.verifyDriverFace(mockDriverProfile as any, 'bGl2ZWltYWdl');

      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it('records failure reason when no face match found', async () => {
      mockSend.mockResolvedValue({ FaceMatches: [] });

      await service.verifyDriverFace(mockDriverProfile as any, 'bGl2ZWltYWdl');

      expect(prisma.biometricVerification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          success: false,
          reason: 'No facial match',
        }),
      });
    });
  });
});
