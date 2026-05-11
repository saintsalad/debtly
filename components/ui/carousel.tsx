import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { colors } from '@/lib/platform';

export const WHEEL_HEIGHT = 216;
export const WHEEL_ITEM_SIZE = 44;

type CarouselEvent = 'init' | 'reInit' | 'scroll' | 'select' | 'settle';

export type CarouselApi = {
  scrollTo: (index: number, animated?: boolean) => void;
  selectedScrollSnap: () => number;
  slidesInView: () => number[];
  slideNodes: () => never[];
  on: (event: CarouselEvent, handler: () => void) => void;
  off: (event: CarouselEvent, handler: () => void) => void;
};

type CarouselContextValue = {
  api: CarouselApi;
  itemSize: number;
  orientation: 'horizontal' | 'vertical';
  scrollOffset: SharedValue<number>;
  itemCount: number;
};

const CarouselContext = createContext<CarouselContextValue | null>(null);

export function useCarousel() {
  const context = useContext(CarouselContext);
  if (!context) {
    throw new Error('useCarousel must be used within a <Carousel />');
  }
  return context;
}

type CarouselProps = {
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
  setApi?: (api: CarouselApi) => void;
  itemSize?: number;
  style?: StyleProp<ViewStyle>;
};

export function Carousel({
  children,
  orientation = 'horizontal',
  setApi,
  itemSize = WHEEL_ITEM_SIZE,
  style,
}: CarouselProps) {
  const listRef = useRef<Animated.FlatList<React.ReactElement> | null>(null);
  const scrollOffset = useSharedValue(0);
  const listenersRef = useRef<Map<CarouselEvent, Set<() => void>>>(new Map());
  const selectedIndexRef = useRef(0);
  const itemCountRef = useRef(0);
  const isSnappingRef = useRef(false);

  const emit = useCallback((event: CarouselEvent) => {
    listenersRef.current.get(event)?.forEach((handler) => handler());
  }, []);

  const scrollTo = useCallback(
    (index: number, animated = true) => {
      if (!listRef.current || itemCountRef.current === 0) return;
      const clamped = Math.max(0, Math.min(index, itemCountRef.current - 1));
      const targetOffset = clamped * itemSize;
      isSnappingRef.current = true;
      listRef.current.scrollToOffset({
        offset: targetOffset,
        animated,
      });
      selectedIndexRef.current = clamped;
      scrollOffset.value = targetOffset;
    },
    [itemSize, scrollOffset],
  );

  const selectedScrollSnap = useCallback(() => selectedIndexRef.current, []);

  const slidesInView = useCallback(() => {
    const active = selectedIndexRef.current;
    return [active - 1, active, active + 1].filter(
      (index) => index >= 0 && index < itemCountRef.current,
    );
  }, []);

  const api = useMemo<CarouselApi>(
    () => ({
      scrollTo,
      selectedScrollSnap,
      slidesInView,
      slideNodes: () => [],
      on: (event, handler) => {
        const handlers = listenersRef.current.get(event) ?? new Set();
        handlers.add(handler);
        listenersRef.current.set(event, handlers);
      },
      off: (event, handler) => {
        listenersRef.current.get(event)?.delete(handler);
      },
    }),
    [scrollTo, selectedScrollSnap, slidesInView],
  );

  useEffect(() => {
    setApi?.(api);
  }, [api, setApi]);

  const snapToNearest = useCallback(
    (offset: number, animated = true) => {
      if (itemCountRef.current === 0) return;
      const index = Math.max(
        0,
        Math.min(Math.round(offset / itemSize), itemCountRef.current - 1),
      );
      const targetOffset = index * itemSize;
      selectedIndexRef.current = index;
      scrollOffset.value = targetOffset;

      if (Math.abs(offset - targetOffset) > 0.5) {
        listRef.current?.scrollToOffset({ offset: targetOffset, animated });
      }

      emit('select');
      emit('settle');
    },
    [emit, itemSize, scrollOffset],
  );

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      isSnappingRef.current = false;
      const offset =
        orientation === 'vertical'
          ? event.nativeEvent.contentOffset.y
          : event.nativeEvent.contentOffset.x;
      snapToNearest(offset, false);
    },
    [orientation, snapToNearest],
  );

  const onScrollEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const velocity =
        orientation === 'vertical'
          ? event.nativeEvent.velocity?.y ?? 0
          : event.nativeEvent.velocity?.x ?? 0;

      if (Math.abs(velocity) > 0.05) {
        return;
      }

      isSnappingRef.current = false;
      const offset =
        orientation === 'vertical'
          ? event.nativeEvent.contentOffset.y
          : event.nativeEvent.contentOffset.x;
      snapToNearest(offset, true);
    },
    [orientation, snapToNearest],
  );

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (isSnappingRef.current) return;
      const offset =
        orientation === 'vertical' ? event.contentOffset.y : event.contentOffset.x;
      scrollOffset.value = offset;
      runOnJS(emit)('scroll');
    },
  });

  const contextValue = useMemo<CarouselContextValue>(
    () => ({
      api,
      itemSize,
      orientation,
      scrollOffset,
      itemCount: itemCountRef.current,
    }),
    [api, itemSize, orientation, scrollOffset],
  );

  return (
    <CarouselContext.Provider value={contextValue}>
      <View style={[styles.root, style]} accessibilityRole="adjustable">
        <CarouselListBridge
          listRef={listRef}
          scrollHandler={scrollHandler}
          onMomentumScrollEnd={onMomentumScrollEnd}
          onScrollEndDrag={onScrollEndDrag}
          itemCountRef={itemCountRef}
          emit={emit}
        >
          {children}
        </CarouselListBridge>
      </View>
    </CarouselContext.Provider>
  );
}

function CarouselListBridge({
  children,
  listRef,
  scrollHandler,
  onMomentumScrollEnd,
  onScrollEndDrag,
  itemCountRef,
  emit,
}: {
  children: React.ReactNode;
  listRef: React.RefObject<Animated.FlatList<React.ReactElement> | null>;
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  onMomentumScrollEnd: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onScrollEndDrag: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  itemCountRef: React.MutableRefObject<number>;
  emit: (event: CarouselEvent) => void;
}) {
  return (
    <>
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<CarouselContentProps>, {
              listRef,
              scrollHandler,
              onMomentumScrollEnd,
              onScrollEndDrag,
              itemCountRef,
              emit,
            })
          : child,
      )}
    </>
  );
}

type CarouselContentProps = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  listRef?: React.RefObject<Animated.FlatList<React.ReactElement> | null>;
  scrollHandler?: ReturnType<typeof useAnimatedScrollHandler>;
  onMomentumScrollEnd?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onScrollEndDrag?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  itemCountRef?: React.MutableRefObject<number>;
  emit?: (event: CarouselEvent) => void;
};

export function CarouselContent({
  children,
  style,
  listRef,
  scrollHandler,
  onMomentumScrollEnd,
  onScrollEndDrag,
  itemCountRef,
  emit,
}: CarouselContentProps) {
  const { itemSize, orientation } = useCarousel();
  const items = useMemo(
    () => React.Children.toArray(children).filter(React.isValidElement),
    [children],
  );

  const snapToOffsets = useMemo(
    () => items.map((_, index) => index * itemSize),
    [itemSize, items],
  );

  useEffect(() => {
    if (!itemCountRef) return;
    itemCountRef.current = items.length;
    emit?.('reInit');
    emit?.('init');
  }, [emit, itemCountRef, items.length]);

  const padding = WHEEL_HEIGHT / 2 - itemSize / 2;

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: itemSize,
      offset: itemSize * index,
      index,
    }),
    [itemSize],
  );

  return (
    <Animated.FlatList
      ref={listRef}
      data={items as React.ReactElement[]}
      keyExtractor={(_, index) => String(index)}
      renderItem={({ item, index }) =>
        React.cloneElement(item as React.ReactElement<CarouselItemProps>, { index })
      }
      style={[{ height: WHEEL_HEIGHT }, style]}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      snapToOffsets={snapToOffsets}
      snapToAlignment="start"
      disableIntervalMomentum
      decelerationRate="fast"
      nestedScrollEnabled
      scrollEnabled
      bounces={false}
      overScrollMode="never"
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      onMomentumScrollEnd={onMomentumScrollEnd}
      onScrollEndDrag={onScrollEndDrag}
      getItemLayout={getItemLayout}
      contentContainerStyle={
        orientation === 'vertical'
          ? { paddingVertical: padding }
          : { paddingHorizontal: padding }
      }
    />
  );
}

type CarouselItemProps = {
  children?: React.ReactNode;
  index?: number;
  style?: StyleProp<ViewStyle>;
};

export function CarouselItem({ children, index = 0, style }: CarouselItemProps) {
  const { itemSize, orientation, scrollOffset } = useCarousel();

  const animatedStyle = useAnimatedStyle(() => {
    const center = scrollOffset.value / itemSize;
    const distance = Math.abs(index - center);
    const scale = interpolate(distance, [0, 1], [1.05, 0.92], Extrapolation.CLAMP);
    const opacity = interpolate(distance, [0, 1], [1, 0.45], Extrapolation.CLAMP);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const labelStyle = useAnimatedStyle(() => {
    const center = scrollOffset.value / itemSize;
    return {
      fontWeight: Math.abs(index - center) < 0.5 ? '600' : '400',
    };
  });

  return (
    <Animated.View
      style={[
        styles.item,
        orientation === 'vertical' ? { height: itemSize } : { width: itemSize },
        style,
        animatedStyle,
      ]}
    >
      <Animated.Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        style={[styles.itemLabel, labelStyle]}
      >
        {children}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    overflow: 'visible',
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  itemLabel: {
    width: '100%',
    fontSize: 16,
    color: colors.label,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
