import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowHistory } from './entities/workflow-history.entity';
import { WorkflowService } from './workflow.service';

@Global()
@Module({
    imports: [TypeOrmModule.forFeature([WorkflowHistory])],
    providers: [WorkflowService],
    exports: [WorkflowService],
})
export class WorkflowModule { }
