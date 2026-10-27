import { Controller, Post, UseGuards, Request, Body, Get, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private usersService: UsersService,
        private configService: ConfigService,
    ) { }

    @UseGuards(AuthGuard('local'))
    @Post('login')
    @ApiOperation({ summary: 'User login' })
    @ApiBody({ type: LoginDto })
    @ApiResponse({ status: 200, description: 'Return JWT access token' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async login(@Request() req, @Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    /**
     * Admin code session — exchange the admin bypass code for a real JWT.
     * Used by the frontend when entering via "código especial", so that
     * subsequent protected API calls (create user, etc.) have valid auth.
     */
    @Post('admin-session')
    async adminSession(@Body() body: { code: string }) {
        const expected = this.configService.get<string>('ADMIN_CODE', 'admin');
        if (!body?.code || body.code !== expected) {
            throw new UnauthorizedException('Código de administrador inválido.');
        }
        // Find or fall back to the seeded superAdmin user
        const adminUser = await this.usersService.findOneByUsername('admin');
        if (!adminUser) {
            throw new UnauthorizedException('Utilizador administrador não encontrado.');
        }
        return this.authService.loginDirect(adminUser);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('profile')
    @ApiOperation({ summary: 'Get user profile' })
    async getProfile(@Request() req) {
        const user = await this.usersService.findOne(req.user.userId || req.user.sub);
        console.log(`[AuthController] Profile requested for ${user.username}. Status: ${user.status}`);
        return UsersService.toPublic(user);
    }
}
