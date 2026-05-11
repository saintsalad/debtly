import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProfileStore } from '@/stores/profileStore';

export function useAppColorScheme(): 'light' | 'dark' {
  const systemScheme = useColorScheme() ?? 'light';
  const appearance = useProfileStore((state) => state.appearance);

  if (appearance === 'system') {
    return systemScheme;
  }

  return appearance;
}
