import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

type CollapsibleHeaderContextValue = {
  onScroll: ReturnType<typeof useAnimatedScrollHandler>;
  registerHeaderHeight: (height: number) => void;
  resetHeader: () => void;
  headerSpacerHeight: number;
  headerTranslateY: SharedValue<number>;
};

const CollapsibleHeaderContext = createContext<CollapsibleHeaderContextValue | null>(null);

export function CollapsibleHeaderProvider({ children }: { children: React.ReactNode }) {
  const headerTranslateY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const headerHeight = useSharedValue(0);
  const [headerSpacerHeight, setHeaderSpacerHeight] = useState(0);

  const registerHeaderHeight = useCallback((height: number) => {
    headerHeight.value = height;
    setHeaderSpacerHeight((previous) => (previous === height ? previous : height));
  }, [headerHeight]);

  const resetHeader = useCallback(() => {
    headerTranslateY.value = 0;
    lastScrollY.value = 0;
  }, [headerTranslateY, lastScrollY]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y;
      const delta = y - lastScrollY.value;

      if (y <= 0) {
        headerTranslateY.value = withTiming(0, { duration: 180 });
      } else {
        const next = headerTranslateY.value - delta;
        headerTranslateY.value = Math.max(-headerHeight.value, Math.min(0, next));
      }

      lastScrollY.value = y;
    },
  });

  const value = useMemo(
    () => ({
      onScroll,
      registerHeaderHeight,
      resetHeader,
      headerSpacerHeight,
      headerTranslateY,
    }),
    [headerSpacerHeight, headerTranslateY, onScroll, registerHeaderHeight, resetHeader]
  );

  return (
    <CollapsibleHeaderContext.Provider value={value}>
      {children}
    </CollapsibleHeaderContext.Provider>
  );
}

export function useCollapsibleHeader() {
  const context = useContext(CollapsibleHeaderContext);
  if (!context) {
    throw new Error('useCollapsibleHeader must be used within CollapsibleHeaderProvider');
  }
  return context;
}
