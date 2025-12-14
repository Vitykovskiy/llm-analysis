import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { LangchainModule } from './langchain/langchain.module';
import { MessagesModule } from './messages/messages.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [DatabaseModule, LangchainModule, MessagesModule, TasksModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
