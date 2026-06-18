import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { UpdateController } from './update.controller';

@Module({
    imports: [HttpModule],
    controllers: [UpdateController],
})
export class AdminModule { }
