import { Module } from '@nestjs/common';
import { UpdateController } from './update.controller';

@Module({
    controllers: [UpdateController],
})
export class AdminModule { }
