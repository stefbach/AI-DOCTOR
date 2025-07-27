// lib/consultation-cache-service.ts

interface CacheOptions {
  ttl?: number; // Time to live en millisecondes
  version?: string;
  namespace?: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: string;
  checksum?: string;
}

class ConsultationCacheService {
  private defaultTTL = 30 * 60 * 1000; // 30 minutes par défaut
  private version = '1.0.0';
  private namespace = 'consultation_cache';

  /**
   * Génère une clé de cache unique
   */
  private getCacheKey(key: string, namespace?: string): string {
    return `${namespace || this.namespace}_${key}`;
  }

  /**
   * Calcule un checksum simple pour les données
   */
  private calculateChecksum(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir en entier 32-bit
    }
    return hash.toString(16);
  }

  /**
   * Sauvegarde dans le cache avec gestion d'erreur
   */
  async set<T>(key: string, data: T, options?: CacheOptions): Promise<boolean> {
    try {
      const cacheKey = this.getCacheKey(key, options?.namespace);
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        version: options?.version || this.version,
        checksum: this.calculateChecksum(data)
      };

      // Essayer localStorage en premier
      try {
        localStorage.setItem(cacheKey, JSON.stringify(entry));
        return true;
      } catch (e) {
        // Si localStorage est plein, essayer sessionStorage
        console.warn('localStorage plein, utilisation de sessionStorage');
        sessionStorage.setItem(cacheKey, JSON.stringify(entry));
        return true;
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde dans le cache:', error);
      return false;
    }
  }

  /**
   * Récupère depuis le cache avec validation
   */
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    try {
      const cacheKey = this.getCacheKey(key, options?.namespace);
      const ttl = options?.ttl || this.defaultTTL;
      
      // Vérifier localStorage puis sessionStorage
      let cached = localStorage.getItem(cacheKey);
      if (!cached) {
        cached = sessionStorage.getItem(cacheKey);
      }
      
      if (!cached) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(cached);
      const now = Date.now();

      // Vérifier la version
      if (entry.version !== (options?.version || this.version)) {
        console.log('Version du cache différente, invalidation');
        this.remove(key, options);
        return null;
      }

      // Vérifier le TTL
      if (now - entry.timestamp > ttl) {
        console.log('Cache expiré, invalidation');
        this.remove(key, options);
        return null;
      }

      // Vérifier l'intégrité si possible
      if (entry.checksum) {
        const currentChecksum = this.calculateChecksum(entry.data);
        if (currentChecksum !== entry.checksum) {
          console.warn('Checksum invalide, données possiblement corrompues');
          this.remove(key, options);
          return null;
        }
      }

      return entry.data;
    } catch (error) {
      console.error('Erreur lors de la lecture du cache:', error);
      return null;
    }
  }

  /**
   * Supprime une entrée du cache
   */
  remove(key: string, options?: CacheOptions): void {
    const cacheKey = this.getCacheKey(key, options?.namespace);
    localStorage.removeItem(cacheKey);
    sessionStorage.removeItem(cacheKey);
  }

  /**
   * Nettoie toutes les entrées expirées
   */
  cleanup(options?: CacheOptions): void {
    const prefix = options?.namespace || this.namespace;
    const ttl = options?.ttl || this.defaultTTL;
    const now = Date.now();

    // Nettoyer localStorage
    const localKeys = Object.keys(localStorage);
    localKeys.forEach(key => {
      if (key.startsWith(prefix)) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const entry = JSON.parse(item);
            if (now - entry.timestamp > ttl) {
              localStorage.removeItem(key);
            }
          }
        } catch (e) {
          // Supprimer les entrées corrompues
          localStorage.removeItem(key);
        }
      }
    });

    // Nettoyer sessionStorage
    const sessionKeys = Object.keys(sessionStorage);
    sessionKeys.forEach(key => {
      if (key.startsWith(prefix)) {
        try {
          const item = sessionStorage.getItem(key);
          if (item) {
            const entry = JSON.parse(item);
            if (now - entry.timestamp > ttl) {
              sessionStorage.removeItem(key);
            }
          }
        } catch (e) {
          sessionStorage.removeItem(key);
        }
      }
    });
  }

  /**
   * Obtient toutes les entrées du cache pour un namespace
   */
  async getAll<T>(namespace?: string): Promise<Map<string, T>> {
    const prefix = namespace || this.namespace;
    const result = new Map<string, T>();

    // Récupérer depuis localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(prefix)) {
        const simpleKey = key.replace(`${prefix}_`, '');
        const data = this.get<T>(simpleKey, { namespace });
        if (data) {
          result.set(simpleKey, data as T);
        }
      }
    });

    // Récupérer depuis sessionStorage si pas dans localStorage
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith(prefix) && !result.has(key.replace(`${prefix}_`, ''))) {
        const simpleKey = key.replace(`${prefix}_`, '');
        const data = this.get<T>(simpleKey, { namespace });
        if (data) {
          result.set(simpleKey, data as T);
        }
      }
    });

    return result;
  }

  /**
   * Vide tout le cache pour un namespace
   */
  clear(namespace?: string): void {
    const prefix = namespace || this.namespace;
    
    // Vider localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    });

    // Vider sessionStorage
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith(prefix)) {
        sessionStorage.removeItem(key);
      }
    });
  }

  /**
   * Obtient des statistiques sur l'utilisation du cache
   */
  getStats(namespace?: string): {
    totalEntries: number;
    localStorageEntries: number;
    sessionStorageEntries: number;
    totalSize: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  } {
    const prefix = namespace || this.namespace;
    let totalEntries = 0;
    let localStorageEntries = 0;
    let sessionStorageEntries = 0;
    let totalSize = 0;
    let oldestTimestamp = Infinity;
    let newestTimestamp = 0;

    // Analyser localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(prefix)) {
        localStorageEntries++;
        totalEntries++;
        const item = localStorage.getItem(key);
        if (item) {
          totalSize += item.length;
          try {
            const entry = JSON.parse(item);
            if (entry.timestamp < oldestTimestamp) oldestTimestamp = entry.timestamp;
            if (entry.timestamp > newestTimestamp) newestTimestamp = entry.timestamp;
          } catch (e) {}
        }
      }
    });

    // Analyser sessionStorage
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith(prefix)) {
        sessionStorageEntries++;
        totalEntries++;
        const item = sessionStorage.getItem(key);
        if (item) {
          totalSize += item.length;
          try {
            const entry = JSON.parse(item);
            if (entry.timestamp < oldestTimestamp) oldestTimestamp = entry.timestamp;
            if (entry.timestamp > newestTimestamp) newestTimestamp = entry.timestamp;
          } catch (e) {}
        }
      }
    });

    return {
      totalEntries,
      localStorageEntries,
      sessionStorageEntries,
      totalSize,
      oldestEntry: oldestTimestamp === Infinity ? null : new Date(oldestTimestamp),
      newestEntry: newestTimestamp === 0 ? null : new Date(newestTimestamp)
    };
  }
}

// Export d'une instance singleton
export const consultationCacheService = new ConsultationCacheService();

// Export de la classe pour des instances personnalisées
export default ConsultationCacheService;
