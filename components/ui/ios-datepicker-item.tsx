import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';

type Range = { start: number; end: number };

function isRange(length: number | Range): length is Range {
  return typeof length === 'object' && length !== null;
}

export const IosDatePickerItem = memo(function IosDatePickerItem({
  value,
  length,
  onChange,
  formatter,
  style,
}: Readonly<{
  value: number;
  length: number | Range;
  onChange: (value: number) => void;
  formatter?: (value: number) => string;
  style?: StyleProp<ViewStyle>;
}>) {
  const [api, setApi] = useState<CarouselApi>();
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  valueRef.current = value;
  onChangeRef.current = onChange;

  const data = useMemo(
    () =>
      Array.from({
        length: isRange(length) ? length.end - length.start + 1 : length,
      }).map((_, index) => (isRange(length) ? index + length.start : index + 1)),
    [length],
  );

  useEffect(() => {
    if (!api) return;

    const snapToValue = () => {
      const index = data.findIndex((item) => item === valueRef.current);
      if (index >= 0) {
        api.scrollTo(index, false);
      }
    };

    const onSettle = () => {
      const index = api.selectedScrollSnap();
      const newValue = isRange(length) ? index + length.start : index + 1;
      if (newValue !== valueRef.current) {
        onChangeRef.current(newValue);
      }
    };

    api.on('init', snapToValue);
    api.on('reInit', snapToValue);
    api.on('settle', onSettle);

    snapToValue();

    return () => {
      api.off('init', snapToValue);
      api.off('reInit', snapToValue);
      api.off('settle', onSettle);
    };
  }, [api, data, length]);

  return (
    <View style={[styles.column, style]}>
      <Carousel orientation="vertical" setApi={setApi}>
        <CarouselContent style={styles.wheel}>
          {data.map((val) => (
            <CarouselItem key={val}>
              {formatter?.(val) ?? String(val)}
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </View>
  );
});

IosDatePickerItem.displayName = 'IosDatePickerItem';

const styles = StyleSheet.create({
  column: {
    flex: 1,
    alignItems: 'center',
    overflow: 'visible',
  },
  wheel: {
    width: '100%',
  },
});
