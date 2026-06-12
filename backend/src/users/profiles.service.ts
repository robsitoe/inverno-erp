import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { User } from './entities/user.entity';
import { DEFAULT_PROFILES, PERMISSIONS_CATALOG } from '../common/permissions.catalog';

@Injectable()
export class ProfilesService {
    constructor(
        @InjectRepository(Profile)
        private readonly profileRepo: Repository<Profile>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
    ) { }

    getCatalog() {
        return PERMISSIONS_CATALOG;
    }

    /** Lists company profiles, seeding the defaults on first access. */
    async findAll(companyId: string): Promise<Profile[]> {
        if (!companyId) return [];
        let profiles = await this.profileRepo.find({ where: { companyId }, order: { name: 'ASC' } });
        if (profiles.length === 0) {
            const seeded = DEFAULT_PROFILES.map(p => this.profileRepo.create({
                id: `PRF-${p.name}-${companyId}`,
                companyId,
                name: p.name,
                permissions: p.permissions,
                isSystem: true,
            }));
            await this.profileRepo.save(seeded);
            profiles = await this.profileRepo.find({ where: { companyId }, order: { name: 'ASC' } });
        }
        return profiles;
    }

    async create(data: Partial<Profile>): Promise<Profile> {
        if (!data.companyId || !data.name) throw new BadRequestException('companyId e name são obrigatórios.');
        const profile = this.profileRepo.create({
            id: data.id || `PRF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            companyId: data.companyId,
            name: data.name,
            permissions: data.permissions || [],
            isSystem: false,
        });
        return this.profileRepo.save(profile);
    }

    async update(id: string, data: Partial<Profile>): Promise<Profile> {
        const profile = await this.profileRepo.findOne({ where: { id } });
        if (!profile) throw new NotFoundException('Perfil não encontrado.');
        if (data.name !== undefined) profile.name = data.name;
        if (data.permissions !== undefined) profile.permissions = data.permissions;
        return this.profileRepo.save(profile);
    }

    async remove(id: string): Promise<{ success: boolean }> {
        const profile = await this.profileRepo.findOne({ where: { id } });
        if (!profile) throw new NotFoundException('Perfil não encontrado.');
        const users = await this.userRepo.find();
        const inUse = users.some(u => (u.permissions || []).some((p: any) => p?.profileId === id));
        if (inUse) throw new BadRequestException('Este perfil está atribuído a utilizadores e não pode ser eliminado.');
        await this.profileRepo.remove(profile);
        return { success: true };
    }

    /**
     * Resolves a user's effective permission keys for a company by joining
     * the user's profile assignments with the Profile rows. Used at login.
     */
    async resolvePermissionKeys(user: User, companyId?: string): Promise<string[]> {
        const assignments: any[] = Array.isArray(user.permissions) ? user.permissions : [];
        if (assignments.length === 0) return [];
        const targetCompany = companyId || user.companyId;
        const profileIds = assignments
            .filter((a: any) => a && a.profileId && (!targetCompany || !a.companyId || a.companyId === targetCompany))
            .map((a: any) => a.profileId);
        if (profileIds.length === 0) return [];
        const profiles = await this.profileRepo.findByIds
            ? await this.profileRepo.find({ where: profileIds.map(id => ({ id })) })
            : [];
        const keys = new Set<string>();
        profiles.forEach(p => (p.permissions || []).forEach(k => keys.add(k)));
        return Array.from(keys);
    }
}
