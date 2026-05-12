import { useCallback, type ComponentType, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { layout } from '@/lib/platform';

function IOSBottomSheetContainer({ children }: PropsWithChildren) {
  return <FullWindowOverlay>{children}</FullWindowOverlay>;
}

const iosBottomSheetContainer: ComponentType<PropsWithChildren> = IOSBottomSheetContainer;

export function useAppBottomSheetLayout() {
  const insets = useSafeAreaInsets();

  const containerComponent = Platform.OS === 'ios' ? iosBottomSheetContainer : undefined;

  const presentSheet = useCallback((present: () => void) => {
    requestAnimationFrame(() => {
      present();
    });
  }, []);

  return {
    topInset: insets.top,
    bottomInset: 0,
    contentBottomPadding: insets.bottom + layout.screenPaddingBottom,
    containerComponent,
    presentSheet,
  };
}
