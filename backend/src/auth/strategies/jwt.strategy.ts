import { getSecret } from '../../common/secrets';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: getSecret('JWT_SECRET', 'dev-only-jwt-secret-not-for-production'), // Fallback for dev
        });
    }

    async validate(payload: any) {
        return {
            userId: payload.sub,
            username: payload.username,
            role: payload.role,
            isAdmin: !!payload.isAdmin,
            isSuperAdmin: !!payload.isSuperAdmin,
            isTechnical: !!payload.isTechnical,
            permissionKeys: Array.isArray(payload.permissionKeys) ? payload.permissionKeys : [],
            name: payload.name,
            companyId: payload.companyId,
            customerId: payload.customerId,
            employeeId: payload.employeeId
        };
    }
}
