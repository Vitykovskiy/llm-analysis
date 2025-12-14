import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { LangchainService } from '../langchain/langchain.service';

export interface ChatMessage {
  id: number;
  userText: string;
  botReply: string;
  createdAt: string;
}

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly langchainService: LangchainService,
  ) {}

  async sendMessage(text: string): Promise<ChatMessage> {
    const userText = text ?? '';
    const trimmed = userText.trim();

    if (!trimmed) {
      throw new BadRequestException('Message text is required');
    }

    const botReply =
      await this.langchainService.generateTaskAwareReply(userText);
    const saved = await this.databaseService.saveMessage(userText, botReply);
    this.logger.debug(`Saved message #${saved.id}`);
    return saved;
  }

  async listMessages(limit = 20): Promise<ChatMessage[]> {
    return this.databaseService.getRecentMessages(limit);
  }
}
