import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const errorLog = {
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            status,
            exception: exception instanceof Error ? {
                name: exception.name,
                message: exception.message,
                stack: exception.stack,
            } : exception,
            body: request.body,
            query: request.query,
        };

        // Log to file for AI to read
        const logPath = path.join(process.cwd(), 'error-debug.log');
        fs.appendFileSync(logPath, JSON.stringify(errorLog, null, 2) + '\n---\n');

        console.error('[GlobalExceptionFilter] Caught exception:', errorLog.exception);

        const message = exception instanceof HttpException
            ? (exception.getResponse() as any).message || exception.message
            : exception instanceof Error ? exception.message : 'Internal server error';

        response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message: Array.isArray(message) ? message.join(', ') : message,
        });
    }
}
