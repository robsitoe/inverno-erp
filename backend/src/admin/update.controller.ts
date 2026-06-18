import {
    Controller, Post, Headers, UnauthorizedException,
    Logger, HttpCode, HttpStatus, Get,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Remote update webhook. Roberto calls POST /admin/update from his central
 * panel with the UPDATE_WEBHOOK_SECRET. The server does git pull + rebuild.
 *
 * Required env vars on the client server:
 *   UPDATE_WEBHOOK_SECRET=<random-secret-shared-with-roberto>
 *   APP_DIR=/opt/inverno-erp          (default)
 *   UPDATE_CMD=docker compose -f docker-compose.prod.yml up -d --build  (default)
 */
@Controller('admin')
export class UpdateController {
    private readonly logger = new Logger(UpdateController.name);

    constructor(private readonly config: ConfigService) { }

    @Get('version')
    getVersion() {
        return {
            version: process.env.npm_package_version || '1.0.0',
            node: process.version,
            uptime: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
        };
    }

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

        this.logger.log('Remote update triggered — pulling and rebuilding...');

        // Run async — return immediately so the HTTP response gets sent
        // before the process potentially restarts.
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

        return { message: 'Atualização iniciada. O servidor irá reiniciar em breve.' };
    }
}
