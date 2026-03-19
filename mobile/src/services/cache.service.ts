import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  timestamp: number;
  data: T;
}

export const cacheService = {
  async set<T>(key: string, data: T): Promise<void> {
    const payload: CacheEntry<T> = {
      timestamp: Date.now(),
      data,
    };
    await AsyncStorage.setItem(key, JSON.stringify(payload));
  },

  async get<T>(key: string, maxAgeMs: number): Promise<{ data: T | null; isStale: boolean }> {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return { data: null, isStale: true };
    }

    try {
      const parsed = JSON.parse(raw) as CacheEntry<T>;
      const age = Date.now() - parsed.timestamp;
      return { data: parsed.data, isStale: age > maxAgeMs };
    } catch {
      return { data: null, isStale: true };
    }
  },
};
