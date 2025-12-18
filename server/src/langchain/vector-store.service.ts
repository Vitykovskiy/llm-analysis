import { Injectable, Logger } from '@nestjs/common';
import { Document } from '@langchain/core/documents';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { OpenAIEmbeddings } from '@langchain/openai';

interface SearchResult {
  content: string;
  metadata: Record<string, unknown>;
  score: number;
}

@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name);
  private readonly collectionName =
    process.env.CHROMA_COLLECTION ?? 'requirements';
  private readonly chromaUrl = process.env.CHROMA_URL;
  private readonly embeddings: OpenAIEmbeddings | null;
  private storePromise?: Promise<Chroma>;

  constructor() {
    const apiKey = process.env.LLM_API_TOKEN;
    if (!apiKey) {
      this.logger.warn('LLM_API_TOKEN is missing; Chroma integration disabled');
      this.embeddings = null;
      return;
    }

    if (!this.chromaUrl) {
      this.logger.warn('CHROMA_URL is not set; Chroma integration disabled');
      this.embeddings = null;
      return;
    }

    this.embeddings = new OpenAIEmbeddings({ apiKey });
  }

  async indexConversation(payload: {
    userText: string;
    botReply: string;
    messageId: number;
    createdAt: string;
  }): Promise<void> {
    if (!this.isEnabled()) return;

    const documents = [
      new Document({
        pageContent: payload.userText,
        metadata: {
          messageId: payload.messageId,
          role: 'user',
          createdAt: payload.createdAt,
        },
      }),
      new Document({
        pageContent: payload.botReply,
        metadata: {
          messageId: payload.messageId,
          role: 'assistant',
          createdAt: payload.createdAt,
        },
      }),
    ].filter((doc) => Boolean(doc.pageContent?.trim()));

    if (!documents.length) return;

    try {
      const store = await this.getStore();
      await store.addDocuments(documents);
    } catch (err) {
      this.logger.warn(
        `Could not index conversation in Chroma: ${(err as Error).message}`,
      );
      this.resetStore();
    }
  }

  async similaritySearch(
    query: string,
    limit = 3,
  ): Promise<SearchResult[]> {
    if (!this.isEnabled()) return [];
    const trimmed = query.trim();
    if (!trimmed) return [];

    try {
      const store = await this.getStore();
      const results = await store.similaritySearchWithScore(
        trimmed,
        Math.min(Math.max(limit, 1), 10),
      );
      return results.map(([doc, score]) => ({
        content: doc.pageContent,
        metadata: doc.metadata as Record<string, unknown>,
        score,
      }));
    } catch (err) {
      this.logger.warn(
        `Chroma similarity search failed: ${(err as Error).message}`,
      );
      this.resetStore();
      return [];
    }
  }

  private isEnabled(): boolean {
    return Boolean(this.embeddings && this.chromaUrl);
  }

  private async getStore(): Promise<Chroma> {
    if (!this.isEnabled() || !this.embeddings || !this.chromaUrl) {
      throw new Error('Chroma is not configured');
    }

    if (!this.storePromise) {
      this.storePromise = Chroma.fromExistingCollection(this.embeddings, {
        collectionName: this.collectionName,
        url: this.chromaUrl,
      }).catch(async (err) => {
        this.logger.warn(
          `Chroma collection lookup failed (${(err as Error).message}), attempting to create a new one`,
        );
        return Chroma.fromTexts([], [], this.embeddings!, {
          collectionName: this.collectionName,
          url: this.chromaUrl,
        });
      });
    }

    return this.storePromise;
  }

  private resetStore(): void {
    this.storePromise = undefined;
  }
}
