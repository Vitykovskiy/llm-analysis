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
    this.logger.log(`SQLite ready at ${this.dbFile}`);
  }

  private ensureDirectory(): void {
    const dir = join(process.cwd(), 'data');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  async saveMessage(userText: string, botReply: string): Promise<void> {
    await this.run(
      'INSERT INTO messages (user_text, bot_reply) VALUES (?, ?)',
      [userText, botReply],
    );
  }

  async getRecentMessages(
    limit = 10,
  ): Promise<{ userText: string; botReply: string; createdAt: string }[]> {
    const rows = await this.all<{
      user_text: string;
      bot_reply: string;
      created_at: string;
    }>(
      'SELECT user_text, bot_reply, created_at FROM messages ORDER BY created_at DESC LIMIT ?',
      [limit],
    );
    return rows.map((row) => ({
      userText: row.user_text,
      botReply: row.bot_reply,
      createdAt: row.created_at,
    }));
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
