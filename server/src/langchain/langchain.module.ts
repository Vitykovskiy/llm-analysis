import { Module } from '@nestjs/common';
import { LangchainService } from './langchain.service';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [TasksModule],
  providers: [LangchainService],
  exports: [LangchainService],
})
export class LangchainModule {}
