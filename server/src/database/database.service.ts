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
    await this.run(`
      CREATE TABLE IF NOT EXISTS task_links (
        parent_id INTEGER NOT NULL,
        child_id INTEGER NOT NULL,
        PRIMARY KEY (parent_id, child_id)
      )
    `);
    await this.run(
      "ALTER TABLE tasks ADD COLUMN title TEXT NOT NULL DEFAULT ''",
    ).catch(() => undefined);
    await this.ensureTaskCodeColumn();
    this.logger.log(`SQLite ready at ${this.dbFile}`);
  }

  private async ensureTaskCodeColumn(): Promise<void> {
    const columns = await this.all<{ name: string }>(
      "PRAGMA table_info('tasks')",
    );
    const hasCode = columns.some((col) => col.name === 'code');

    if (!hasCode) {
      await this.run('ALTER TABLE tasks ADD COLUMN code TEXT');

      const existing = await this.all<{ id: number }>(
        'SELECT id FROM tasks ORDER BY id ASC',
      );
      for (let idx = 0; idx < existing.length; idx += 1) {
        const code = `TASK-${String(idx + 1).padStart(4, '0')}`;
        await this.run('UPDATE tasks SET code = ? WHERE id = ?', [
          code,
          existing[idx].id,
        ]);
      }
    }

    await this.run(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_code ON tasks(code)',
    );
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

  async clearMessages(): Promise<void> {
    await this.run('DELETE FROM messages');
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
    parents: { id: number; code: string; title: string }[];
    children: { id: number; code: string; title: string }[];
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
      parents: [],
      children: [],
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
      parents: { id: number; code: string; title: string }[];
      children: { id: number; code: string; title: string }[];
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

    const links = await this.all<{ parent_id: number; child_id: number }>(
      'SELECT parent_id, child_id FROM task_links',
    );

    const byId = new Map<
      number,
      {
        id: number;
        type: 'epic' | 'task' | 'subtask';
        title: string;
        description: string;
        status: 'backlog' | 'in_progress' | 'done';
        code: string;
        createdAt: string;
      }
    >(
      rows.map((row) => [
        row.id,
        {
          id: row.id,
          type: row.type,
          title: row.title,
          description: row.description,
          status: row.status,
          code: row.code,
          createdAt: row.created_at,
        },
      ]),
    );

    const parentMap = new Map<number, number[]>();
    const childMap = new Map<number, number[]>();

    links.forEach((link) => {
      parentMap.set(link.child_id, [
        ...(parentMap.get(link.child_id) ?? []),
        link.parent_id,
      ]);
      childMap.set(link.parent_id, [
        ...(childMap.get(link.parent_id) ?? []),
        link.child_id,
      ]);
    });

    const result = rows.map((row) => {
      const parents =
        parentMap
          .get(row.id)
          ?.map((id) => byId.get(id))
          .filter(Boolean)
          .map((entry) => ({
            id: entry!.id,
            code: entry!.code,
            title: entry!.title,
          })) ?? [];

      const children =
        childMap
          .get(row.id)
          ?.map((id) => byId.get(id))
          .filter(Boolean)
          .map((entry) => ({
            id: entry!.id,
            code: entry!.code,
            title: entry!.title,
          })) ?? [];

      return {
        id: row.id,
        type: row.type,
        title: row.title,
        description: row.description,
        status: row.status,
        code: row.code,
        createdAt: row.created_at,
        parents,
        children,
      };
    });

    return result;
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
    parents: { id: number; code: string; title: string }[];
    children: { id: number; code: string; title: string }[];
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
      parents: [],
      children: [],
    };
  }

  async setTaskRelations(
    taskId: number,
    parents?: number[],
    children?: number[],
  ): Promise<void> {
    if (parents) {
      await this.run('DELETE FROM task_links WHERE child_id = ?', [taskId]);
      for (const parentId of parents) {
        if (parentId === taskId) continue;
        await this.run(
          'INSERT OR IGNORE INTO task_links (parent_id, child_id) VALUES (?, ?)',
          [parentId, taskId],
        );
      }
    }

    if (children) {
      await this.run('DELETE FROM task_links WHERE parent_id = ?', [taskId]);
      for (const childId of children) {
        if (childId === taskId) continue;
        await this.run(
          'INSERT OR IGNORE INTO task_links (parent_id, child_id) VALUES (?, ?)',
          [taskId, childId],
        );
      }
    }
  }

  async getTaskWithRelations(id: number): Promise<{
    id: number;
    type: 'epic' | 'task' | 'subtask';
    title: string;
    description: string;
    status: 'backlog' | 'in_progress' | 'done';
    code: string;
    createdAt: string;
    parents: { id: number; code: string; title: string }[];
    children: { id: number; code: string; title: string }[];
  }> {
    const task = await this.get<{
      id: number;
      type: 'epic' | 'task' | 'subtask';
      title: string;
      description: string;
      status: 'backlog' | 'in_progress' | 'done';
      code: string;
      created_at: string;
    }>('SELECT * FROM tasks WHERE id = ?', [id]);

    if (!task) {
      throw new Error('Task not found');
    }

    const parents = await this.all<{
      id: number;
      code: string;
      title: string;
    }>(
      `
        SELECT t.id, t.code, t.title
        FROM tasks t
        INNER JOIN task_links l ON t.id = l.parent_id
        WHERE l.child_id = ?
      `,
      [id],
    );

    const children = await this.all<{
      id: number;
      code: string;
      title: string;
    }>(
      `
        SELECT t.id, t.code, t.title
        FROM tasks t
        INNER JOIN task_links l ON t.id = l.child_id
        WHERE l.parent_id = ?
      `,
      [id],
    );

    return {
      id: task.id,
      type: task.type,
      title: task.title,
      description: task.description,
      status: task.status,
      code: task.code,
      createdAt: task.created_at,
      parents,
      children,
    };
  }

  async getTasksByIds(
    ids: number[],
  ): Promise<{ id: number; code: string; title: string }[]> {
    if (!ids.length) return [];
    const placeholders = ids.map(() => '?').join(', ');
    return this.all<{ id: number; code: string; title: string }>(
      `SELECT id, code, title FROM tasks WHERE id IN (${placeholders})`,
      ids,
    );
  }

  async deleteTask(id: number): Promise<void> {
    const existing = await this.get<{ id: number }>(
      'SELECT id FROM tasks WHERE id = ?',
      [id],
    );

    if (!existing) {
      throw new Error('Task not found');
    }

    await this.run(
      'DELETE FROM task_links WHERE parent_id = ? OR child_id = ?',
      [id, id],
    );
    await this.run('DELETE FROM tasks WHERE id = ?', [id]);
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
          resolve(row);
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
