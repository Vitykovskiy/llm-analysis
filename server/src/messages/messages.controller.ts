import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Query,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { ChatMessage } from './messages.service';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  getMessages(@Query('limit') limit?: string): Promise<ChatMessage[]> {
    const parsedLimit = Number(limit);
    const safeLimit =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 100)
        : 20;
    return this.messagesService.listMessages(safeLimit);
  }

  @Post()
  sendMessage(@Body('text') text: string): Promise<ChatMessage> {
    return this.messagesService.sendMessage(text);
  }

  @Delete()
  @HttpCode(204)
  clearMessages(): Promise<void> {
    return this.messagesService.clearMessages();
  }
}
