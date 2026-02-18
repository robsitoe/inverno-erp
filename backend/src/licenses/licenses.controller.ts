import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    Req,
    UseGuards,
    HttpCode,
    HttpStatus,
    Delete,
} from '@nestjs/common';
import { LicensesService } from './licenses.service';
import { GenerateLicenseDto, ActivateLicenseDto } from './dto/generate-license.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('licenses')
export class LicensesController {
    constructor(private readonly licensesService: LicensesService) { }

    // ─── GENERATE (SuperAdmin only) ───────────────────────────────────────────
    // POST /licenses/generate
    @UseGuards(JwtAuthGuard)
    @Post('generate')
    async generate(@Body() dto: GenerateLicenseDto, @Req() req: any) {
        const user = req.user;
        if (!user?.isSuperAdmin && !user?.isAdmin) {
            return { error: 'Acesso negado. Apenas administradores podem gerar licenças.' };
        }
        const result = await this.licensesService.generate(dto, user.username || user.sub);
        return {
            token: result.token,
            licenseId: result.license.id,
            companyId: result.license.companyId,
            plan: result.license.plan,
            expiresAt: result.license.expiresAt,
            message: 'Licença gerada com sucesso. Copie o token e envie ao cliente.',
        };
    }

    // ─── ACTIVATE (Client activates their license) ────────────────────────────
    // POST /licenses/activate
    @Post('activate')
    @HttpCode(HttpStatus.OK)
    async activate(@Body() dto: ActivateLicenseDto, @Req() req: any) {
        const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
        return this.licensesService.activate(dto.token, ip);
    }

    // ─── STATUS (Frontend polls this) ─────────────────────────────────────────
    // GET /licenses/status/:companyId
    @Get('status/:companyId')
    async getStatus(@Param('companyId') companyId: string) {
        return this.licensesService.getStatus(companyId);
    }

    // ─── REVOKE (SuperAdmin only) ─────────────────────────────────────────────
    // DELETE /licenses/:companyId
    @UseGuards(JwtAuthGuard)
    @Delete(':companyId')
    async revoke(
        @Param('companyId') companyId: string,
        @Body() body: { reason: string },
        @Req() req: any,
    ) {
        const user = req.user;
        if (!user?.isSuperAdmin) {
            return { error: 'Acesso negado. Apenas super-administradores podem revogar licenças.' };
        }
        await this.licensesService.revoke(companyId, body.reason, user.username || user.sub);
        return { message: `Licença da empresa ${companyId} revogada com sucesso.` };
    }

    // ─── LIST ALL (SuperAdmin only) ───────────────────────────────────────────
    // GET /licenses
    @UseGuards(JwtAuthGuard)
    @Get()
    async listAll(@Req() req: any) {
        const user = req.user;
        if (!user?.isSuperAdmin && !user?.isAdmin) {
            return { error: 'Acesso negado.' };
        }
        return this.licensesService.listAll();
    }
}
