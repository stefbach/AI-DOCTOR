// hooks/useConsultationCache.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { consultationCacheService } from '@/lib/consultation-cache-service';

interface UseConsultationCacheOptions {
  key: string;
  ttl?: number;
  autoSync?: boolean;
  syncInterval?: number;
  onSync?: (data: any) => Promise<void>;
  onError?: (error: Error) => void;
}

interface UseConsultationCacheReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  lastSync: Date | null;
  isSyncing: boolean;
  
  // Actions
  setData: (data: T) => Promise<void>;
  refresh: () => Promise<void>;
  sync: () => Promise<void>;
  clear: () => void;
  
  // État du cache
  cacheStats: {
    isStale: boolean;
    age: number;
    size: number;
  };
}

export function useConsultationCache<T = any>(
  options: UseConsultationCacheOptions
): UseConsultationCacheReturn<T> {
  const {
    key,
    ttl = 30 * 60 * 1000, // 30 minutes par défaut
    autoSync = true,
    syncInterval = 5 * 60 * 1000, // 5 minutes par défaut
    onSync,
    onError
  } = options;

  // États
  const [data, setDataState] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cacheAge, setCacheAge] = useState(0);

  // Refs pour éviter les re-renders inutiles
  const syncTimeoutRef = useRef<NodeJS.Timeout>();
  const ageIntervalRef = useRef<NodeJS.Timeout>();

  // Charger les données depuis le cache
  const loadFromCache = useCallback(async () => {
    try {
      setLoading(true);
      const cachedData = await consultationCacheService.get<T>(key, { ttl });
      
      if (cachedData) {
        setDataState(cachedData);
        console.log(`✅ Cache hit for key: ${key}`);
      } else {
        console.log(`❌ Cache miss for key: ${key}`);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erreur de cache');
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [key, ttl, onError]);

  // Sauvegarder les données dans le cache
  const setData = useCallback(async (newData: T) => {
    try {
      const success = await consultationCacheService.set(key, newData, { ttl });
      
      if (success) {
        setDataState(newData);
        setError(null);
        console.log(`💾 Data saved to cache for key: ${key}`);
      } else {
        throw new Error('Échec de la sauvegarde dans le cache');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erreur de sauvegarde');
      setError(error);
      onError?.(error);
    }
  }, [key, ttl, onError]);

  // Synchroniser avec le backend
  const sync = useCallback(async () => {
    if (!onSync || !data) return;

    try {
      setIsSyncing(true);
      await onSync(data);
      setLastSync(new Date());
      console.log(`🔄 Sync completed for key: ${key}`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erreur de synchronisation');
      setError(error);
      onError?.(error);
    } finally {
      setIsSyncing(false);
    }
  }, [data, key, onSync, onError]);

  // Rafraîchir les données (recharger depuis le cache)
  const refresh = useCallback(async () => {
    await loadFromCache();
  }, [loadFromCache]);

  // Vider le cache
  const clear = useCallback(() => {
    consultationCacheService.remove(key);
    setDataState(null);
    setLastSync(null);
    console.log(`🗑️ Cache cleared for key: ${key}`);
  }, [key]);

  // Calculer l'âge du cache
  const updateCacheAge = useCallback(async () => {
    try {
      const stats = await consultationCacheService.getStats();
      const cacheKey = `consultation_cache_${key}`;
      
      // Essayer de récupérer l'entrée pour obtenir son timestamp
      const localItem = localStorage.getItem(cacheKey);
      const sessionItem = sessionStorage.getItem(cacheKey);
      const item = localItem || sessionItem;
      
      if (item) {
        const entry = JSON.parse(item);
        const age = Date.now() - entry.timestamp;
        setCacheAge(age);
      }
    } catch (err) {
      // Ignorer les erreurs de calcul d'âge
    }
  }, [key]);

  // Charger les données au montage
  useEffect(() => {
    loadFromCache();
  }, [loadFromCache]);

  // Auto-sync si activé
  useEffect(() => {
    if (!autoSync || !data || !onSync) return;

    const setupSync = () => {
      syncTimeoutRef.current = setTimeout(() => {
        sync();
        setupSync(); // Replanifier le prochain sync
      }, syncInterval);
    };

    setupSync();

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [autoSync, data, syncInterval, sync, onSync]);

  // Mettre à jour l'âge du cache périodiquement
  useEffect(() => {
    updateCacheAge();
    
    ageIntervalRef.current = setInterval(updateCacheAge, 10000); // Toutes les 10 secondes

    return () => {
      if (ageIntervalRef.current) {
        clearInterval(ageIntervalRef.current);
      }
    };
  }, [updateCacheAge]);

  // Calculer les statistiques du cache
  const cacheStats = {
    isStale: cacheAge > ttl,
    age: cacheAge,
    size: data ? JSON.stringify(data).length : 0
  };

  return {
    data,
    loading,
    error,
    lastSync,
    isSyncing,
    setData,
    refresh,
    sync,
    clear,
    cacheStats
  };
}

// Hook pour gérer plusieurs clés de cache
export function useMultipleConsultationCache<T extends Record<string, any>>(
  keys: string[],
  options?: Omit<UseConsultationCacheOptions, 'key'>
): {
  data: Partial<T>;
  loading: boolean;
  errors: Record<string, Error>;
  setData: (key: keyof T, data: T[keyof T]) => Promise<void>;
  refresh: (key?: keyof T) => Promise<void>;
  syncAll: () => Promise<void>;
  clearAll: () => void;
} {
  const [data, setDataState] = useState<Partial<T>>({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, Error>>({});

  // Charger toutes les clés
  const loadAll = useCallback(async () => {
    setLoading(true);
    const newData: Partial<T> = {};
    const newErrors: Record<string, Error> = {};

    await Promise.all(
      keys.map(async (key) => {
        try {
          const cachedData = await consultationCacheService.get(key, { ttl: options?.ttl });
          if (cachedData) {
            newData[key as keyof T] = cachedData;
          }
        } catch (err) {
          newErrors[key] = err instanceof Error ? err : new Error('Erreur de cache');
        }
      })
    );

    setDataState(newData);
    setErrors(newErrors);
    setLoading(false);
  }, [keys, options?.ttl]);

  // Sauvegarder une clé spécifique
  const setData = useCallback(async (key: keyof T, value: T[keyof T]) => {
    try {
      await consultationCacheService.set(String(key), value, { ttl: options?.ttl });
      setDataState(prev => ({ ...prev, [key]: value }));
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[String(key)];
        return newErrors;
      });
    } catch (err) {
      setErrors(prev => ({
        ...prev,
        [String(key)]: err instanceof Error ? err : new Error('Erreur de sauvegarde')
      }));
    }
  }, [options?.ttl]);

  // Rafraîchir une ou toutes les clés
  const refresh = useCallback(async (key?: keyof T) => {
    if (key) {
      try {
        const cachedData = await consultationCacheService.get(String(key), { ttl: options?.ttl });
        if (cachedData) {
          setDataState(prev => ({ ...prev, [key]: cachedData }));
        }
      } catch (err) {
        setErrors(prev => ({
          ...prev,
          [String(key)]: err instanceof Error ? err : new Error('Erreur de cache')
        }));
      }
    } else {
      await loadAll();
    }
  }, [loadAll, options?.ttl]);

  // Synchroniser toutes les clés
  const syncAll = useCallback(async () => {
    if (!options?.onSync) return;

    await Promise.all(
      Object.entries(data).map(async ([key, value]) => {
        try {
          await options.onSync(value);
        } catch (err) {
          setErrors(prev => ({
            ...prev,
            [key]: err instanceof Error ? err : new Error('Erreur de synchronisation')
          }));
        }
      })
    );
  }, [data, options?.onSync]);

  // Vider toutes les clés
  const clearAll = useCallback(() => {
    keys.forEach(key => consultationCacheService.remove(key));
    setDataState({});
  }, [keys]);

  // Charger au montage
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return {
    data,
    loading,
    errors,
    setData,
    refresh,
    syncAll,
    clearAll
  };
}
