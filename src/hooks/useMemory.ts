import { useState, useEffect } from 'react';
import { openDB, IDBPDatabase } from 'idb';
import { OpenAICompatClient as GoogleGenAI } from "../utils/openai";

const DB_NAME = 'neurion-memory-v2';
const DB_VERSION = 2;

// Three memory stores
const STORE_INTERACTIONS = 'interactions'; // canvas prompts, AI exchanges
const STORE_PROFILE      = 'profile';      // user preferences, products, style
const STORE_RESULTS      = 'results';      // campaign results, what worked

export interface MemoryEntry {
  id?: number;
  userId: string;
  content: string;
  embedding: number[];
  timestamp: number;
  type: 'interaction' | 'feedback' | 'context' | 'profile' | 'result';
  metadata?: any;
}

export const useMemory = (userId: string) => {
  const [db, setDb] = useState<IDBPDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initDb = async () => {
      try {
        const database = await openDB(DB_NAME, DB_VERSION, {
          upgrade(db, oldVersion) {
            const stores = [STORE_INTERACTIONS, STORE_PROFILE, STORE_RESULTS];
            stores.forEach(name => {
              if (!db.objectStoreNames.contains(name)) {
                const store = db.createObjectStore(name, { keyPath: 'id', autoIncrement: true });
                store.createIndex('userId', 'userId');
                store.createIndex('timestamp', 'timestamp');
              }
            });
          },
        });
        setDb(database);
        setIsReady(true);
      } catch (err) {
        console.warn('Memory DB init error:', err);
      }
    };
    initDb();
  }, []);

  const generateEmbedding = async (text: string): Promise<number[]> => {
    try {
      const apiKey = (window as any).__NEURION_KEY__ || localStorage.getItem('neurion_openai_api_key') || '';
      if (!apiKey || !text?.trim()) return [];
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: [{ parts: [{ text }] }],
      });
      return response?.embeddings?.[0]?.values ?? [];
    } catch {
      return [];
    }
  };

  const addMemory = async (
    content: string,
    type: MemoryEntry['type'] = 'interaction',
    metadata?: any
  ) => {
    if (!db || !userId || !content?.trim()) return;
    const store = type === 'profile' ? STORE_PROFILE
                : type === 'result' ? STORE_RESULTS
                : STORE_INTERACTIONS;
    const embedding = await generateEmbedding(content);
    const entry: Omit<MemoryEntry, 'id'> = {
      userId, content, embedding: embedding || [],
      timestamp: Date.now(), type, metadata
    };
    try {
      const tx = db.transaction(store, 'readwrite');
      await tx.store.add(entry);
      await tx.done;
    } catch (err) {
      console.warn('addMemory error:', err);
    }
  };

  const retrieveMemories = async (query: string, limit = 5): Promise<MemoryEntry[]> => {
    if (!db || !userId) return [];
    const queryEmbedding = await generateEmbedding(query);
    if (!queryEmbedding?.length) return [];

    // Search all 3 stores, merge and rank
    const allMemories: MemoryEntry[] = [];
    const stores = [STORE_INTERACTIONS, STORE_PROFILE, STORE_RESULTS];
    for (const storeName of stores) {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const all = await tx.store.index('userId').getAll(IDBKeyRange.only(userId));
        allMemories.push(...(all as MemoryEntry[]));
      } catch {}
    }

    if (!allMemories.length) return [];

    const scored = allMemories
      .filter(m => m.embedding?.length > 0)
      .map(m => ({ ...m, score: cosineSimilarity(queryEmbedding, m.embedding) }))
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, limit);

    return scored;
  };

  const saveProfile = async (key: string, value: string) => {
    await addMemory(`${key}: ${value}`, 'profile', { key });
  };

  const saveResult = async (description: string, metadata?: any) => {
    await addMemory(description, 'result', metadata);
  };

  const clearMemories = async () => {
    if (!db) return;
    const stores = [STORE_INTERACTIONS, STORE_PROFILE, STORE_RESULTS];
    for (const storeName of stores) {
      const tx = db.transaction(storeName, 'readwrite');
      const all = await tx.store.index('userId').getAllKeys(IDBKeyRange.only(userId));
      for (const key of all) await tx.store.delete(key);
      await tx.done;
    }
  };

  return { addMemory, retrieveMemories, saveProfile, saveResult, clearMemories, isReady };
};

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA?.length || vecA.length !== vecB?.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot   += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

