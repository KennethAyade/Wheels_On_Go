import {
  INestApplication,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { EncryptionService } from '../encryption/encryption.service';
import {
  PII_FIELDS,
  SEARCHABLE_ENCRYPTED_FIELDS,
  getHashColumnName,
} from '../encryption/encryption.constants';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly encryptionService: EncryptionService) {
    super();
  }

  async onModuleInit() {
    await this.$connect();

    // Encryption middleware - automatically encrypt/decrypt PII fields
    this.$use(async (params, next) => {
      const model = params.model;
      const fields = PII_FIELDS[model as string];
      const searchableFields = SEARCHABLE_ENCRYPTED_FIELDS[model as string] || [];

      // Encrypt before write operations
      if (['create', 'update', 'upsert'].includes(params.action) && fields) {
        const dataToProcess =
          params.action === 'upsert' ? params.args.create : params.args.data;

        if (dataToProcess) {
          for (const field of fields) {
            const plainValue = dataToProcess[field];

            if (plainValue && typeof plainValue === 'string') {
              // Encrypt the field
              dataToProcess[field] = this.encryptionService.encrypt(plainValue);

              // Add hash for searchable fields
              if (searchableFields.includes(field)) {
                const hashColumnName = getHashColumnName(field);
                dataToProcess[hashColumnName] =
                  this.encryptionService.hashForSearch(plainValue);
              }
            }
          }

          // For upsert, also process the update data
          if (params.action === 'upsert' && params.args.update) {
            for (const field of fields) {
              const plainValue = params.args.update[field];

              if (plainValue && typeof plainValue === 'string') {
                params.args.update[field] =
                  this.encryptionService.encrypt(plainValue);

                if (searchableFields.includes(field)) {
                  const hashColumnName = getHashColumnName(field);
                  params.args.update[hashColumnName] =
                    this.encryptionService.hashForSearch(plainValue);
                }
              }
            }
          }
        }
      }

      // Transform search queries for encrypted searchable fields
      if (['findUnique', 'findFirst', 'findMany'].includes(params.action) && fields) {
        const where = params.args?.where;

        if (where) {
          for (const field of searchableFields) {
            if (where[field] && typeof where[field] === 'string') {
              // Replace direct field search with hash search
              const hashColumnName = getHashColumnName(field);
              where[hashColumnName] = this.encryptionService.hashForSearch(
                where[field],
              );
              delete where[field];
            }
          }
        }
      }

      const result = await next(params);

      // Decrypt after read operations
      if (
        ['findUnique', 'findFirst', 'findMany'].includes(params.action) &&
        fields &&
        result
      ) {
        const decryptResult = (record: any) => {
          if (!record) return record;

          for (const field of fields) {
            if (
              record[field] &&
              typeof record[field] === 'string' &&
              this.encryptionService.isEncrypted(record[field])
            ) {
              record[field] = this.encryptionService.decrypt(record[field]);
            }
          }

          return record;
        };

        if (Array.isArray(result)) {
          result.forEach(decryptResult);
        } else {
          decryptResult(result);
        }
      }

      return result;
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async enableShutdownHooks(app: INestApplication) {
    // Cast to any to keep compatibility across Prisma versions.
    (this as any).$on('beforeExit', async () => {
      await app.close();
    });
  }
}
