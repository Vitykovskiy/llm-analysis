import { Module } from '@nestjs/common';
import { LangchainService } from './langchain.service';
import { TasksModule } from '../tasks/tasks.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [TasksModule, DatabaseModule],
  providers: [LangchainService],
  exports: [LangchainService],
})
export class LangchainModule {}
