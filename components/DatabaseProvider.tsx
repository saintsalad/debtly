import { bootstrapDatabase } from '@/lib/db/bootstrap';
import { DATABASE_NAME, getDb } from '@/lib/db/client';
import { attachStorePersistence } from '@/lib/db/persistence';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

const DatabaseReadyContext = createContext(true);

export function useDatabaseReady(): boolean {
  return useContext(DatabaseReadyContext);
}

/** Attaches debounced store → SQLite sync after the DB is open. */
function DatabasePersistenceGate({ children }: { children: ReactNode }) {
  const detachRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    detachRef.current = attachStorePersistence(getDb());
    return () => {
      detachRef.current?.();
      detachRef.current = null;
    };
  }, []);

  return <>{children}</>;
}

interface DatabaseProviderProps {
  children: ReactNode;
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const [initError, setInitError] = useState<Error | null>(null);

  const handleInit = useCallback(async (sqliteDb: SQLiteDatabase) => {
    setInitError(null);
    await bootstrapDatabase(sqliteDb);
  }, []);

  if (initError) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="mb-2 text-center text-lg font-semibold text-foreground">
          Could not open database
        </Text>
        <Text className="text-center text-sm text-muted">{initError.message}</Text>
      </View>
    );
  }

  return (
    <SQLiteProvider
      databaseName={DATABASE_NAME}
      onInit={handleInit}
      onError={(error) => {
        console.error('[DatabaseProvider] init failed', error);
        setInitError(error instanceof Error ? error : new Error(String(error)));
      }}>
      <DatabaseReadyContext.Provider value={true}>
        <DatabasePersistenceGate>{children}</DatabasePersistenceGate>
      </DatabaseReadyContext.Provider>
    </SQLiteProvider>
  );
}

/**
 * Optional splash while expo-sqlite opens the DB (SQLiteProvider returns null until ready).
 * Place outside DatabaseProvider if you want a visible loader during native open.
 */
export function DatabaseBootSplash() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="large" />
    </View>
  );
}
