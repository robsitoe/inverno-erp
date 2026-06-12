import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { ProfilesService } from '../users/profiles.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private profilesService: ProfilesService,
        private jwtService: JwtService,
    ) { }

    async validateUser(username: string, pass: string): Promise<any> {
        let user;
        try {
            user = await this.usersService.findOneByUsername(username);
        } catch (err) {
            console.error(`Database error during login for ${username}:`, err.message);
        }

        if (!user) {
            // Emergency bootstrap fallback — DISABLED by default. Only enabled when
            // ALLOW_ADMIN_FALLBACK=true (e.g. first-run recovery when the DB has no users).
            if (process.env.ALLOW_ADMIN_FALLBACK === 'true' && username === 'admin' && pass === 'admin') {
                console.warn('[Auth] Emergency admin fallback used — set ALLOW_ADMIN_FALLBACK=false after recovery.');
                return {
                    id: 'admin', username: 'admin', name: 'Administrator',
                    isAdmin: true, isSuperAdmin: true, isTechnical: true,
                    isActive: true, language: 'pt', permissions: [],
                };
            }
            return null;
        }

        const isMatch = await bcrypt.compare(pass, user.password);
        if (isMatch) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async login(loginDto: LoginDto) {
        const user = await this.validateUser(loginDto.username, loginDto.password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Segregação de funções: resolve the user's profile assignments into
        // concrete permission keys and embed them in the JWT (admins bypass
        // checks anyway, so an empty list is fine for them).
        let permissionKeys: string[] = [];
        try {
            permissionKeys = await this.profilesService.resolvePermissionKeys(user, user.companyId);
        } catch (err) {
            console.error('[Auth] Failed to resolve permission keys:', err.message);
        }

        const payload = {
            username: user.username,
            sub: user.id,
            isAdmin: !!user.isAdmin,
            isSuperAdmin: !!user.isSuperAdmin,
            isTechnical: !!user.isTechnical,
            companyId: user.companyId,
            customerId: user.customerId,
            employeeId: user.employeeId,
            userType: user.userType,
            name: user.name,
            permissionKeys,
        };
        return {
            access_token: this.jwtService.sign(payload),
            user: { ...user, permissionKeys },
        };
    }
}
