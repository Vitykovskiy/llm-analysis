import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export type TaskType = 'epic' | 'task' | 'subtask';
export type TaskStatus = 'backlog' | 'in_progress' | 'done';

export interface Task {
  id: number;
  type: TaskType;
  description: string;
  status: TaskStatus;
  createdAt: string;
}

const TASK_TYPES: TaskType[] = ['epic', 'task', 'subtask'];
const TASK_STATUSES: TaskStatus[] = ['backlog', 'in_progress', 'done'];

@Injectable()
export class TasksService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(): Promise<Task[]> {
    return this.databaseService.listTasks();
  }

  async create(payload: {
    type?: string;
    description?: string;
    status?: string;
  }): Promise<Task> {
    const type = this.parseType(payload.type);
    const description = this.parseDescription(payload.description);
    const status = this.parseStatus(payload.status, 'backlog');

    return this.databaseService.createTask({
      type,
      description,
      status,
    });
  }

  async update(
    id: number,
    payload: {
      type?: string;
      description?: string;
      status?: string;
    },
  ): Promise<Task> {
    const updates: Partial<{
      type: TaskType;
      description: string;
      status: TaskStatus;
    }> = {};

    if (payload.type !== undefined) {
      updates.type = this.parseType(payload.type);
    }
    if (payload.description !== undefined) {
      updates.description = this.parseDescription(payload.description);
    }
    if (payload.status !== undefined) {
      updates.status = this.parseStatus(payload.status);
    }

    if (!Object.keys(updates).length) {
      throw new BadRequestException('Nothing to update');
    }

    try {
      return await this.databaseService.updateTask(id, updates);
    } catch (err) {
      if ((err as Error).message === 'Task not found') {
        throw new NotFoundException(`Task ${id} not found`);
      }
      throw err;
    }
  }

  private parseType(type?: string): TaskType {
    if (!type) {
      throw new BadRequestException('Task type is required');
    }

    if (!TASK_TYPES.includes(type as TaskType)) {
      throw new BadRequestException(
        `Unknown task type: ${type}. Allowed: ${TASK_TYPES.join(', ')}`,
      );
    }

    return type as TaskType;
  }

  private parseStatus(status?: string, fallback?: TaskStatus): TaskStatus {
    if (!status) {
      if (fallback) {
        return fallback;
      }
      throw new BadRequestException('Task status is required');
    }

    if (!TASK_STATUSES.includes(status as TaskStatus)) {
      throw new BadRequestException(
        `Unknown task status: ${status}. Allowed: ${TASK_STATUSES.join(', ')}`,
      );
    }

    return status as TaskStatus;
  }

  private parseDescription(description?: string): string {
    const value = description?.trim();
    if (!value) {
      throw new BadRequestException('Task description is required');
    }
    return value;
  }
}
