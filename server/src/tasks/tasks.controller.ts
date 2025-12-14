import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { TasksService, Task } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  list(): Promise<Task[]> {
    return this.tasksService.list();
  }

  @Post()
  create(
    @Body('type') type: string,
    @Body('title') title: string,
    @Body('description') description: string,
    @Body('status') status?: string,
  ): Promise<Task> {
    return this.tasksService.create({ type, title, description, status });
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body('type') type?: string,
    @Body('title') title?: string,
    @Body('description') description?: string,
    @Body('status') status?: string,
  ): Promise<Task> {
    const numericId = Number(id);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      throw new BadRequestException('Task id must be a positive number');
    }

    return this.tasksService.update(numericId, { type, title, description, status });
  }
}
