import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { Check, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import { ListDivider } from '@/components/ui/ListDivider';
import { useAppBottomSheetLayout } from '@/lib/appBottomSheet';
import {
  CURRENCIES,
  SUPPORTED_CURRENCY_CODES,
  type SupportedCurrencyCode,
} from '@/lib/utils';
import { radius, space, type, useColors, type ColorPalette } from '@/lib/platform';

export interface CurrencyPickerSheetHandle {
  present: () => void;
  dismiss: () => void;
}

interface CurrencyPickerSheetProps {
  selectedCode: string;
  onSelect: (code: SupportedCurrencyCode) => void;
}

const ANDROID_SHEET_HEIGHT = 368;

function createStyles(palette: ColorPalette) {
  return StyleSheet.create({
    sheet: {
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      backgroundColor: palette.surface,
    },
    handle: {
      width: 40,
      backgroundColor: palette.opaqueSeparator,
    },
    content: {
      flex: 1,
      paddingHorizontal: space[5],
      backgroundColor: palette.surface,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: space[3],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.opaqueSeparator,
    },
    title: {
      flex: 1,
      ...type.headline,
      color: palette.label,
      textAlign: 'center',
    },
    headerSpacer: {
      width: 36,
      height: 36,
    },
    body: {
      paddingTop: space[4],
    },
    hint: {
      ...type.footnote,
      color: palette.labelSecondary,
      marginBottom: space[3],
      paddingHorizontal: space[1],
    },
    optionGroup: {
      backgroundColor: palette.fillSecondary,
      borderRadius: radius.lg,
      overflow: 'hidden',
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      paddingHorizontal: space[4],
      paddingVertical: 14,
    },
    optionRowPressed: {
      opacity: 0.82,
    },
    symbolBadge: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      backgroundColor: palette.fill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    symbolText: {
      ...type.headline,
      color: palette.label,
    },
    optionCopy: {
      flex: 1,
      gap: 2,
    },
    optionLabel: {
      ...type.body,
      color: palette.label,
    },
    optionCode: {
      ...type.footnote,
      color: palette.labelSecondary,
    },
    checkSlot: {
      width: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}

export const CurrencyPickerSheet = forwardRef<CurrencyPickerSheetHandle, CurrencyPickerSheetProps>(
  function CurrencyPickerSheet({ selectedCode, onSelect }, ref) {
    const palette = useColors();
    const styles = useMemo(() => createStyles(palette), [palette]);
    const {
      topInset,
      bottomInset,
      contentBottomPadding,
      containerComponent,
      presentSheet,
    } = useAppBottomSheetLayout();
    const insets = useSafeAreaInsets();
    const sheetRef = useRef<BottomSheetModal>(null);
    const isAndroid = Platform.OS === 'android';
    const snapPoints = useMemo(
      () =>
        isAndroid
          ? [ANDROID_SHEET_HEIGHT + insets.bottom]
          : ['38%'],
      [insets.bottom, isAndroid],
    );
    const sheetContentBottomPadding = isAndroid
      ? insets.bottom + space[4]
      : contentBottomPadding;

    const dismiss = useCallback(() => {
      sheetRef.current?.dismiss();
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        present: () => {
          presentSheet(() => {
            sheetRef.current?.present();
          });
        },
        dismiss,
      }),
      [dismiss, presentSheet],
    );

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
      ),
      [],
    );

    const handleSelect = (code: SupportedCurrencyCode) => {
      void Haptics.selectionAsync();
      onSelect(code);
      dismiss();
    };

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        topInset={topInset}
        bottomInset={bottomInset}
        containerComponent={containerComponent}
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.sheet}
      >
        <BottomSheetView style={[styles.content, { paddingBottom: sheetContentBottomPadding }]}>
          <View style={styles.header}>
            <HeaderIconButton icon={X} accessibilityLabel="Close currency picker" onPress={dismiss} />
            <Text style={styles.title}>Currency</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.body}>
            <Text style={styles.hint}>Amounts across the app use this currency.</Text>
            <View style={styles.optionGroup}>
              {SUPPORTED_CURRENCY_CODES.map((code, index) => {
                const { symbol, label } = CURRENCIES[code];
                const active = selectedCode === code;

                return (
                  <React.Fragment key={code}>
                    {index > 0 ? <ListDivider /> : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${label}, ${code}`}
                      accessibilityState={{ selected: active }}
                      onPress={() => handleSelect(code)}
                      style={({ pressed }) => [
                        styles.optionRow,
                        pressed && styles.optionRowPressed,
                      ]}
                      android_ripple={{ color: palette.fill, borderless: false }}
                    >
                      <View style={styles.symbolBadge}>
                        <Text style={styles.symbolText}>{symbol}</Text>
                      </View>
                      <View style={styles.optionCopy}>
                        <Text style={styles.optionLabel}>{label}</Text>
                        <Text style={styles.optionCode}>{code}</Text>
                      </View>
                      <View style={styles.checkSlot}>
                        {active ? <Check size={22} color={palette.tint} strokeWidth={2.5} /> : null}
                      </View>
                    </Pressable>
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

CurrencyPickerSheet.displayName = 'CurrencyPickerSheet';
