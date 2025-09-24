/**
 * Advanced caching system to reduce RPC calls and prevent runaway costs
 * Implements TTL, cache invalidation, and usage tracking
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 30 * 60 * 1000; // 30 minutes default
  private readonly maxCacheSize = 100; // Prevent memory bloat

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      this.cleanup();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now()
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access tracking
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    // Remove least recently used entries
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    // Remove oldest 20% of entries
    const toRemove = Math.ceil(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  getStats() {
    const entries = Array.from(this.cache.values());
    return {
      size: this.cache.size,
      totalAccesses: entries.reduce((sum, entry) => sum + entry.accessCount, 0),
      averageAge: entries.length > 0 
        ? entries.reduce((sum, entry) => sum + (Date.now() - entry.timestamp), 0) / entries.length
        : 0
    };
  }
}

// Global cache manager
export const cacheManager = new CacheManager();

// Cache keys for different data types
export const CACHE_KEYS = {
  AUCTION_DATA: (contractAddress: string) => `auctions-${contractAddress}`,
  NFT_METADATA: 'nft-metadata',
  NFT_IMAGES: 'nft-images',
  AUCTION_DETAIL: (contractAddress: string, tokenId: string) => `auction-${contractAddress}-${tokenId}`,
  USER_BALANCE: (address: string) => `balance-${address}`,
  USER_NFTS: (address: string) => `user-nfts-${address}`,
} as const;

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  AUCTION_DATA: 30 * 60 * 1000, // 30 minutes
  NFT_METADATA: 60 * 60 * 1000, // 1 hour (static data)
  NFT_IMAGES: 60 * 60 * 1000, // 1 hour (static data)
  AUCTION_DETAIL: 15 * 60 * 1000, // 15 minutes
  USER_BALANCE: 2 * 60 * 1000, // 2 minutes
  USER_NFTS: 10 * 60 * 1000, // 10 minutes
} as const;

// Helper functions for common cache operations
export function getCachedData<T>(key: string): T | null {
  return cacheManager.get<T>(key);
}

export function setCachedData<T>(key: string, data: T, ttl?: number): void {
  cacheManager.set(key, data, ttl);
}

export function isCached(key: string): boolean {
  return cacheManager.has(key);
}

// LocalStorage integration for persistence
export function getCachedDataFromStorage<T>(key: string): T | null {
  // Only run on client side
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const { data, timestamp, ttl } = JSON.parse(cached);
    
    // Check if expired
    if (Date.now() - timestamp > ttl) {
      localStorage.removeItem(key);
      return null;
    }
    
    return data as T;
  } catch (error) {
    console.warn(`Failed to get cached data from storage for key: ${key}`, error);
    return null;
  }
}

// Helper function to convert BigInt values to strings for JSON serialization
function convertBigIntToStrings(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToStrings);
  }
  
  if (typeof obj === 'object') {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertBigIntToStrings(value);
    }
    return converted;
  }
  
  return obj;
}

export function setCachedDataToStorage<T>(key: string, data: T, ttl: number): void {
  // Only run on client side
  if (typeof window === 'undefined') return;
  
  try {
    // Convert BigInt values to strings before caching
    const serializableData = convertBigIntToStrings(data);
    
    const cacheEntry = {
      data: serializableData,
      timestamp: Date.now(),
      ttl
    };
    localStorage.setItem(key, JSON.stringify(cacheEntry));
  } catch (error) {
    console.warn(`Failed to cache data to storage for key: ${key}`, error);
  }
}
