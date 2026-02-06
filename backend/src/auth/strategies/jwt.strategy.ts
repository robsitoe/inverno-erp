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
      secretOrKey: configService.get<string>('JWT_SECRET') || 'secretKey', // Fallback for dev
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      username: payload.username,
      profile: payload.profile,
      isAdmin: Boolean(payload.isAdmin),
      isSuperAdmin: Boolean(payload.isSuperAdmin),
      isTechnical: Boolean(payload.isTechnical),
      permissions: Array.isArray(payload.permissions)
        ? payload.permissions
        : [],
    };
  }
}
