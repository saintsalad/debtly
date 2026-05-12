import { Calendar, Check, X } from 'lucide-react-native';
import {
  format,
  getDate,
  getDaysInMonth,
  getMonth,
  getYear,
  setDate,
  setMonth,
} from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WHEEL_HEIGHT, WHEEL_ITEM_SIZE } from '@/components/ui/carousel';
import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import { IosDatePickerItem } from '@/components/ui/ios-datepicker-item';
import { useColors, radius, space, type ColorPalette } from '@/lib/platform';

const SHOW_DATE = 'd MMMM yyyy';

type YearRange = { start: number; end: number };

type IosDatePickerProps = {
  onChange?: (date: Date) => void;
  value?: Date;
  yearRange?: YearRange | number;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

function isYearRange(value: YearRange | number): value is YearRange {
  return typeof value === 'object' && value !== null;
}

function createStyles(palette: ColorPalette) {
  return StyleSheet.create({
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      alignSelf: 'stretch',
      paddingHorizontal: space[4],
      paddingVertical: 12,
      borderRadius: radius.md,
      backgroundColor: palette.fill,
    },
    triggerDisabled: {
      opacity: 0.5,
    },
    triggerPressed: {
      opacity: 0.85,
    },
    triggerText: {
      flex: 1,
      fontSize: 17,
      color: palette.label,
    },
    triggerPlaceholder: {
      flex: 1,
      fontSize: 17,
      color: palette.placeholder,
    },
    modalRoot: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdropPressable: {
      ...StyleSheet.absoluteFillObject,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheet: {
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      backgroundColor: palette.surface,
      paddingHorizontal: space[4],
      paddingTop: space[2],
    },
    dragArea: {
      paddingBottom: space[1],
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: radius.pill,
      backgroundColor: palette.opaqueSeparator,
      marginBottom: space[2],
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: space[3],
    },
    title: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      color: palette.label,
      textAlign: 'center',
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: palette.opaqueSeparator,
    },
    wheels: {
      position: 'relative',
      height: WHEEL_HEIGHT,
      overflow: 'visible',
    },
    wheelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      height: WHEEL_HEIGHT,
      zIndex: 1,
      overflow: 'visible',
    },
    dayColumn: {
      flex: 0.7,
    },
    monthColumn: {
      flex: 1.35,
    },
    yearColumn: {
      flex: 0.95,
    },
    selection: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: (WHEEL_HEIGHT - WHEEL_ITEM_SIZE) / 2,
      height: WHEEL_ITEM_SIZE,
      borderRadius: radius.md,
      backgroundColor: palette.fillSecondary,
      zIndex: 0,
    },
    fadeTop: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height: 56,
      backgroundColor: palette.surface,
      opacity: 0.94,
      zIndex: 2,
    },
    fadeBottom: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 56,
      backgroundColor: palette.surface,
      opacity: 0.94,
      zIndex: 2,
    },
  });
}

export function IosDatePicker({
  value,
  placeholder = 'Select a date',
  disabled,
  style,
  onChange,
  yearRange = 25,
}: Readonly<IosDatePickerProps>) {
  const palette = useColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const today = new Date();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [daysInMonth, setDaysInMonth] = useState(getDaysInMonth(value ?? today));
  const [dateVal, setDateVal] = useState<Date>(value ?? today);
  const sheetHeight = useSharedValue(320);
  const translateY = useSharedValue(320);
  const backdropOpacity = useSharedValue(0);
  const dragStartY = useSharedValue(0);

  const openPicker = () => {
    const next = value ?? new Date();
    setDateVal(next);
    setDaysInMonth(getDaysInMonth(next));
    setVisible(true);
  };

  const closePicker = useCallback(() => {
    backdropOpacity.value = withTiming(0, { duration: 220 });
    translateY.value = withTiming(sheetHeight.value, { duration: 260 }, (finished) => {
      if (finished) {
        runOnJS(setVisible)(false);
      }
    });
  }, [backdropOpacity, sheetHeight, translateY]);

  useEffect(() => {
    if (!visible) return;
    translateY.value = sheetHeight.value;
    backdropOpacity.value = withTiming(1, { duration: 220 });
    translateY.value = withTiming(0, { duration: 260 });
  }, [backdropOpacity, sheetHeight, translateY, visible]);

  const handleSheetLayout = useCallback(
    (event: LayoutChangeEvent) => {
      sheetHeight.value = event.nativeEvent.layout.height;
    },
    [sheetHeight],
  );

  const backdropStyle = useAnimatedStyle(() => {
    const dragProgress = interpolate(
      translateY.value,
      [0, Math.max(sheetHeight.value, 1)],
      [1, 0],
      Extrapolation.CLAMP,
    );

    return {
      opacity: backdropOpacity.value * dragProgress,
    };
  });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const dragGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(8)
        .failOffsetX([-20, 20])
        .onBegin(() => {
          dragStartY.value = translateY.value;
        })
        .onUpdate((event) => {
          translateY.value = Math.max(0, dragStartY.value + event.translationY);
        })
        .onEnd((event) => {
          const shouldDismiss =
            translateY.value > sheetHeight.value * 0.28 || event.velocityY > 850;

          if (shouldDismiss) {
            runOnJS(closePicker)();
            return;
          }

          translateY.value = withTiming(0, { duration: 220 });
          backdropOpacity.value = withTiming(1, { duration: 220 });
        }),
    [backdropOpacity, closePicker, dragStartY, sheetHeight, translateY],
  );

  const handleCancel = () => {
    closePicker();
  };

  const handleDone = () => {
    onChange?.(dateVal);
    closePicker();
  };

  const handleDateChange = useCallback((next: number) => {
    setDateVal((prev) => setDate(prev, next));
  }, []);

  const handleMonthChange = useCallback((next: number) => {
    setDateVal((prev) => {
      const baseDate = new Date(getYear(prev), next - 1, 1);
      const days = getDaysInMonth(baseDate);
      setDaysInMonth(days);
      const currentDate = getDate(prev);
      return currentDate < days ? setDate(baseDate, currentDate) : setDate(baseDate, days);
    });
  }, []);

  const handleYearChange = useCallback((next: number) => {
    setDateVal((prev) => {
      const baseDate = new Date(next, getMonth(prev), 1);
      const days = getDaysInMonth(baseDate);
      setDaysInMonth(days);
      const currentDate = getDate(prev);
      return currentDate < days ? setDate(baseDate, currentDate) : setDate(baseDate, days);
    });
  }, []);

  const yearLength = isYearRange(yearRange)
    ? { start: yearRange.start, end: yearRange.end }
    : {
        start: getYear(today) - yearRange,
        end: getYear(today) + 5,
      };

  const bottomInset = Math.max(insets.bottom, space[4]);

  useEffect(() => {
    if (!value) return;
    setDateVal(value);
    setDaysInMonth(getDaysInMonth(value));
  }, [value]);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Select a date"
        disabled={disabled}
        onPress={openPicker}
        style={({ pressed }) => [
          styles.trigger,
          style,
          disabled && styles.triggerDisabled,
          pressed && !disabled && styles.triggerPressed,
        ]}
      >
        <Calendar size={18} color={palette.labelSecondary} />
        <Text style={value ? styles.triggerText : styles.triggerPlaceholder} numberOfLines={1}>
          {value ? format(value, SHOW_DATE) : placeholder}
        </Text>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={handleCancel}
        statusBarTranslucent
      >
        <GestureHandlerRootView style={styles.modalRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close date picker"
            onPress={handleCancel}
            style={styles.backdropPressable}
          >
            <Animated.View pointerEvents="none" style={[styles.backdrop, backdropStyle]} />
          </Pressable>
          <Animated.View
            onLayout={handleSheetLayout}
            style={[styles.sheet, { paddingBottom: bottomInset }, sheetStyle]}
          >
            <GestureDetector gesture={dragGesture}>
              <View style={styles.dragArea}>
                <View style={styles.handle} />
                <View style={styles.headerRow}>
                  <HeaderIconButton
                    icon={X}
                    accessibilityLabel="Close"
                    onPress={handleCancel}
                  />

                  <Text style={styles.title}>Select a date</Text>

                  <HeaderIconButton
                    icon={Check}
                    accessibilityLabel="Confirm"
                    onPress={handleDone}
                    variant="tint"
                  />
                </View>
              </View>
            </GestureDetector>

            <View style={styles.divider} />

            <View style={styles.wheels}>
              <View pointerEvents="none" style={styles.selection} />
              <View style={styles.wheelRow}>
                <IosDatePickerItem
                  style={styles.dayColumn}
                  value={getDate(dateVal)}
                  length={daysInMonth}
                  onChange={handleDateChange}
                />
                <IosDatePickerItem
                  style={styles.monthColumn}
                  value={getMonth(dateVal) + 1}
                  onChange={handleMonthChange}
                  length={12}
                  formatter={(month) => format(setMonth(dateVal, month - 1), 'MMMM')}
                />
                <IosDatePickerItem
                  style={styles.yearColumn}
                  value={getYear(dateVal)}
                  onChange={handleYearChange}
                  length={yearLength}
                />
              </View>
              <View pointerEvents="none" style={styles.fadeTop} />
              <View pointerEvents="none" style={styles.fadeBottom} />
            </View>
          </Animated.View>
        </GestureHandlerRootView>
      </Modal>
    </>
  );
}

