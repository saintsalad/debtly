import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Check, X } from 'lucide-react-native';
import { HeroUINativeProvider } from 'heroui-native';
import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import {
  RECEIPT_CANVAS_PRESETS,
  type ReceiptCanvasPresetId,
} from '@/features/debts/receipt/receiptCanvasPresets';
import { useAppBottomSheetLayout } from '@/lib/appBottomSheet';
import { radius, space, type, useColors, type ColorPalette } from '@/lib/platform';

export interface ReceiptBackgroundSheetHandle {
  present: () => void;
  dismiss: () => void;
}

interface ReceiptBackgroundSheetProps {
  selectedId: ReceiptCanvasPresetId;
  onSelect: (id: ReceiptCanvasPresetId) => void;
}

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
    body: {
      paddingTop: space[4],
      gap: space[3],
    },
    hint: {
      ...type.subheadline,
      color: palette.labelSecondary,
      textAlign: 'center',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space[3],
      justifyContent: 'center',
    },
    swatch: {
      width: 72,
      alignItems: 'center',
      gap: space[2],
    },
    swatchCircle: {
      width: 52,
      height: 52,
      borderRadius: radius.pill,
      borderWidth: 2,
      borderColor: palette.opaqueSeparator,
      alignItems: 'center',
      justifyContent: 'center',
    },
    swatchCircleActive: {
      borderColor: palette.tint,
      borderWidth: 2.5,
    },
    swatchLabel: {
      ...type.caption1,
      color: palette.labelSecondary,
    },
    swatchLabelActive: {
      color: palette.label,
      fontWeight: '600',
    },
  });
}

export const ReceiptBackgroundSheet = forwardRef<
  ReceiptBackgroundSheetHandle,
  ReceiptBackgroundSheetProps
>(function ReceiptBackgroundSheet({ selectedId, onSelect }, ref) {
  const palette = useColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const {
    topInset,
    bottomInset,
    contentBottomPadding,
    containerComponent,
    presentSheet,
  } = useAppBottomSheetLayout();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['38%'], []);

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
    [dismiss, presentSheet]
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
    ),
    []
  );

  const handleSelect = (id: ReceiptCanvasPresetId) => {
    onSelect(id);
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
      <HeroUINativeProvider>
        <BottomSheetView style={[styles.content, { paddingBottom: contentBottomPadding }]}>
          <View style={styles.header}>
            <HeaderIconButton icon={X} accessibilityLabel="Close" onPress={dismiss} />
            <Text style={styles.title}>Background</Text>
            <HeaderIconButton
              icon={Check}
              accessibilityLabel="Done"
              onPress={dismiss}
              variant="tint"
            />
          </View>
          <View style={styles.body}>
            <Text style={styles.hint}>Pick a color behind your thermal receipt.</Text>
            <View style={styles.grid}>
              {RECEIPT_CANVAS_PRESETS.map((preset) => {
                const active = preset.id === selectedId;
                return (
                  <Pressable
                    key={preset.id}
                    style={styles.swatch}
                    onPress={() => handleSelect(preset.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${preset.label} background`}
                    accessibilityState={{ selected: active }}
                  >
                    <View
                      style={[
                        styles.swatchCircle,
                        { backgroundColor: preset.color },
                        active && styles.swatchCircleActive,
                      ]}
                    >
                      {active ? (
                        <Check
                          size={18}
                          color={preset.id === 'black' ? '#FFFFFF' : palette.tint}
                        />
                      ) : null}
                    </View>
                    <Text style={[styles.swatchLabel, active && styles.swatchLabelActive]}>
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </BottomSheetView>
      </HeroUINativeProvider>
    </BottomSheetModal>
  );
});

ReceiptBackgroundSheet.displayName = 'ReceiptBackgroundSheet';
