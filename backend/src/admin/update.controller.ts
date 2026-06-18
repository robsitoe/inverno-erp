import {
    Controller, Post, Headers, UnauthorizedException,
    Logger, HttpCode, HttpStatus, Get,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';

const execAsync = promisify(exec);

/**
 * Remote update webhook + version check.
 *
 * Env vars (client server):
 *   UPDATE_WEBHOOK_SECRET  — shared secret between Roberto and the client
 *   PHONE_HOME_URL         — Roberto's central server (same as phone-home)
 *   APP_DIR                — /opt/inverno-erp (default)
 *   UPDATE_CMD             — docker compose ... up -d --build (default)
 *   APP_VERSION            — current deployed version (set in docker-compose)
 */
@Controller('admin')
export class UpdateController {
    private readonly logger = new Logger(UpdateController.name);

    constructor(
        private readonly config: ConfigService,
        private readonly http: HttpService,
    ) { }

    /** Returns current version + whether a newer version is available. */
    @Get('version')
    async getVersion() {
        const current = this.config.get<string>('APP_VERSION', '1.0.0');
        const centralUrl = this.config.get<string>('PHONE_HOME_URL');

        let latest: string | null = null;
        let updateAvailable = false;

        if (centralUrl) {
            try {
                const res$ = this.http.get(`${centralUrl}/admin/latest-version`, {
                    headers: { 'x-phone-home': '1' },
                }).pipe(timeout(5000), catchError(() => of({ data: null })));
                const { data } = await firstValueFrom(res$);
                if (data?.version) {
                    latest = data.version;
                    updateAvailable = latest !== current;
                }
            } catch { /* central unreachable — no update info */ }
        }

        return {
            version: current,
            latest: latest ?? current,
            updateAvailable,
            node: process.version,
            uptime: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
        };
    }

    /** Exposed on the central server — on-premise installs poll this. */
    @Get('latest-version')
    getLatestVersion() {
        return {
            version: this.config.get<string>('APP_VERSION', '1.0.0'),
        };
    }

    /**
     * Triggered by admin at session start (or by Roberto remotely).
     * Runs git pull + rebuild in background — returns immediately.
     */
    @Post('update')
    @HttpCode(HttpStatus.ACCEPTED)
    async triggerUpdate(@Headers('x-update-secret') secret: string) {
        const expected = this.config.get<string>('UPDATE_WEBHOOK_SECRET');
        if (!expected || secret !== expected) {
            throw new UnauthorizedException('Segredo inválido.');
        }

        const appDir = this.config.get<string>('APP_DIR', '/opt/inverno-erp');
        const updateCmd = this.config.get<string>(
            'UPDATE_CMD',
            'docker compose -f docker-compose.prod.yml up -d --build',
        );

        this.logger.log('Update triggered — pulling and rebuilding in background...');

        setImmediate(async () => {
            try {
                const { stdout } = await execAsync(
                    `cd ${appDir} && git pull origin main && ${updateCmd}`,
                    { timeout: 300_000 },
                );
                this.logger.log(`Update complete:\n${stdout}`);
            } catch (err) {
                this.logger.error(`Update failed: ${err.message}`);
            }
        });

        return { message: 'Atualização iniciada. O servidor irá reiniciar em breve (~2 min).' };
    }
}
