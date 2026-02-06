import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditQueryDto } from './dto/audit-query.dto';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async log(entry: Partial<AuditLog>) {
    const entity = this.auditRepo.create(entry);
    return this.auditRepo.save(entity);
  }

  async findAll(filters: AuditQueryDto, companyId?: string) {
    const qb = this.auditRepo.createQueryBuilder('audit').orderBy('audit.timestamp', 'DESC');

    if (companyId) {
      qb.andWhere('audit.companyId = :companyId', { companyId });
    }

    if (filters.from) {
      qb.andWhere('audit.timestamp >= :from', { from: filters.from });
    }

    if (filters.to) {
      qb.andWhere('audit.timestamp <= :to', { to: filters.to });
    }

    if (filters.user) {
      qb.andWhere('(LOWER(audit.username) LIKE :user OR LOWER(audit.userId) LIKE :user)', {
        user: `%${filters.user.toLowerCase()}%`,
      });
    }

    if (filters.module) {
      qb.andWhere('LOWER(audit.module) = :module', { module: filters.module.toLowerCase() });
    }

    return qb.getMany();
  }
}
