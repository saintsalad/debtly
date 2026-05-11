import { useEffect } from 'react';
import { Uniwind } from 'uniwind';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';

export function useSyncUniwindTheme() {
  const colorScheme = useAppColorScheme();

  useEffect(() => {
    Uniwind.setTheme(colorScheme);
  }, [colorScheme]);
}
