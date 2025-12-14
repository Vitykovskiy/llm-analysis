import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Database, verbose } from 'sqlite3';

const sqlite3 = verbose();

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private db?: Database;
  private readonly logger = new Logger(DatabaseService.name);
  private readonly dbFile = join(process.cwd(), 'data', 'app.sqlite');

  async onModuleInit(): Promise<void> {
    this.ensureDirectory();
    this.db = new sqlite3.Database(this.dbFile);
    await this.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_text TEXT NOT NULL,
        bot_reply TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK (type IN ('epic', 'task', 'subtask')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('backlog', 'in_progress', 'done')),
        code TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.run(
      "ALTER TABLE tasks ADD COLUMN title TEXT NOT NULL DEFAULT ''",
    ).catch(() => undefined);
    await this.run(
      "ALTER TABLE tasks ADD COLUMN code TEXT UNIQUE NOT NULL DEFAULT ''",
    ).catch(() => undefined);
    this.logger.log(`SQLite ready at ${this.dbFile}`);
  }

  private ensureDirectory(): void {
    const dir = join(process.cwd(), 'data');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  async saveMessage(
    userText: string,
    botReply: string,
  ): Promise<{
    id: number;
    userText: string;
    botReply: string;
    createdAt: string;
  }> {
    await this.run(
      'INSERT INTO messages (user_text, bot_reply) VALUES (?, ?)',
      [userText, botReply],
    );

    const row = await this.get<{
      id: number;
      user_text: string;
      bot_reply: string;
      created_at: string;
    }>(
      'SELECT id, user_text, bot_reply, created_at FROM messages WHERE id = last_insert_rowid()',
    );

    if (!row) {
      throw new Error('Failed to read saved message');
    }

    return {
      id: row.id,
      userText: row.user_text,
      botReply: row.bot_reply,
      createdAt: row.created_at,
    };
  }

  async getRecentMessages(limit = 10): Promise<
    {
      id: number;
      userText: string;
      botReply: string;
      createdAt: string;
    }[]
  > {
    const rows = await this.all<{
      id: number;
      user_text: string;
      bot_reply: string;
      created_at: string;
    }>(
      'SELECT id, user_text, bot_reply, created_at FROM messages ORDER BY created_at DESC LIMIT ?',
      [limit],
    );
    return rows
      .map((row) => ({
        id: row.id,
        userText: row.user_text,
        botReply: row.bot_reply,
        createdAt: row.created_at,
      }))
      .reverse();
  }

  async createTask(task: {
    type: 'epic' | 'task' | 'subtask';
    title: string;
    description: string;
    status: 'backlog' | 'in_progress' | 'done';
  }): Promise<{
    id: number;
    type: 'epic' | 'task' | 'subtask';
    title: string;
    description: string;
    status: 'backlog' | 'in_progress' | 'done';
    code: string;
    createdAt: string;
  }> {
    const next = await this.get<{ next: number }>(
      "SELECT COALESCE(MAX(CAST(substr(code, instr(code, '-') + 1) AS INTEGER)), 0) + 1 as next FROM tasks WHERE code LIKE 'TASK-%'",
    );
    const code = `TASK-${String(next?.next ?? 1).padStart(4, '0')}`;

    await this.run(
      'INSERT INTO tasks (type, title, description, status, code) VALUES (?, ?, ?, ?, ?)',
      [task.type, task.title, task.description, task.status, code],
    );

    const row = await this.get<{
      id: number;
      type: 'epic' | 'task' | 'subtask';
      title: string;
      description: string;
      status: 'backlog' | 'in_progress' | 'done';
      code: string;
      created_at: string;
    }>('SELECT * FROM tasks WHERE id = last_insert_rowid()');

    if (!row) {
      throw new Error('Failed to read saved task');
    }

    return {
      id: row.id,
      type: row.type,
      title: row.title,
      description: row.description,
      status: row.status,
      code: row.code,
      createdAt: row.created_at,
    };
  }

  async listTasks(): Promise<
    {
      id: number;
      type: 'epic' | 'task' | 'subtask';
      title: string;
      description: string;
      status: 'backlog' | 'in_progress' | 'done';
      code: string;
      createdAt: string;
    }[]
  > {
    const rows = await this.all<{
      id: number;
      type: 'epic' | 'task' | 'subtask';
      title: string;
      description: string;
      status: 'backlog' | 'in_progress' | 'done';
      code: string;
      created_at: string;
    }>('SELECT * FROM tasks ORDER BY created_at DESC');

    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      description: row.description,
      status: row.status,
      code: row.code,
      createdAt: row.created_at,
    }));
  }

  async updateTask(
    id: number,
    updates: Partial<{
      type: 'epic' | 'task' | 'subtask';
      title: string;
      description: string;
      status: 'backlog' | 'in_progress' | 'done';
    }>,
  ): Promise<{
    id: number;
    type: 'epic' | 'task' | 'subtask';
    title: string;
    description: string;
    status: 'backlog' | 'in_progress' | 'done';
    code: string;
    createdAt: string;
  }> {
    const sets: string[] = [];
    const params: unknown[] = [];

    if (updates.type) {
      sets.push('type = ?');
      params.push(updates.type);
    }
    if (updates.description) {
      sets.push('description = ?');
      params.push(updates.description);
    }
    if (updates.title) {
      sets.push('title = ?');
      params.push(updates.title);
    }
    if (updates.status) {
      sets.push('status = ?');
      params.push(updates.status);
    }

    if (!sets.length) {
      throw new Error('No fields to update');
    }

    params.push(id);
    await this.run(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, params);

    const row = await this.get<{
      id: number;
      type: 'epic' | 'task' | 'subtask';
      title: string;
      description: string;
      status: 'backlog' | 'in_progress' | 'done';
      code: string;
      created_at: string;
    }>('SELECT * FROM tasks WHERE id = ?', [id]);

    if (!row) {
      throw new Error('Task not found');
    }

    return {
      id: row.id,
      type: row.type,
      title: row.title,
      description: row.description,
      status: row.status,
      code: row.code,
      createdAt: row.created_at,
    };
  }

  private run(sql: string, params: unknown[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.run(sql, params, (err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  private all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.all<T>(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  private get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.get<T>(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row as T);
        }
      });
    });
  }

  async onModuleDestroy(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
