import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  getReceiptCanvasBackdropTint,
  getReceiptCanvasPreset,
  RECEIPT_CANVAS_PRESETS,
  type ReceiptCanvasGradient,
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

function isLightHex(hex: string): boolean {
  const raw = hex.replace('#', '');
  if (raw.length !== 6) return true;
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return true;
  return 0.299 * r + 0.587 * g + 0.114 * b > 165;
}

function SwatchInterior({ presetId }: { presetId: ReceiptCanvasPresetId }) {
  const preset = getReceiptCanvasPreset(presetId);
  const bg = preset.background;
  if (bg.kind === 'solid') {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: bg.color }]} />;
  }
  const g = bg as ReceiptCanvasGradient;
  return (
    <LinearGradient
      style={StyleSheet.absoluteFill}
      colors={[...g.colors]}
      locations={g.locations ? ([...g.locations] as [number, number, ...number[]]) : undefined}
      start={g.start}
      end={g.end}
    />
  );
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
    gridScroll: {
      maxHeight: 340,
    },
    gridScrollContent: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space[3],
      justifyContent: 'center',
      paddingBottom: space[2],
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
      overflow: 'hidden',
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
  const snapPoints = useMemo(() => ['58%'], []);

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
            <Text style={styles.hint}>Solid colors and gradients behind your thermal receipt.</Text>
            <ScrollView
              style={styles.gridScroll}
              contentContainerStyle={styles.gridScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {RECEIPT_CANVAS_PRESETS.map((preset) => {
                const active = preset.id === selectedId;
                const tint = getReceiptCanvasBackdropTint(preset.id);
                const checkColor = isLightHex(tint) ? palette.tint : '#FFFFFF';
                return (
                  <Pressable
                    key={preset.id}
                    style={styles.swatch}
                    onPress={() => handleSelect(preset.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${preset.label} background`}
                    accessibilityState={{ selected: active }}
                  >
                    <View style={[styles.swatchCircle, active && styles.swatchCircleActive]}>
                      <SwatchInterior presetId={preset.id} />
                      {active ? (
                        <View
                          style={[
                            StyleSheet.absoluteFill,
                            {
                              alignItems: 'center',
                              justifyContent: 'center',
                              zIndex: 1,
                            },
                          ]}
                        >
                          <Check size={18} color={checkColor} />
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.swatchLabel, active && styles.swatchLabelActive]}>
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </BottomSheetView>
      </HeroUINativeProvider>
    </BottomSheetModal>
  );
});

ReceiptBackgroundSheet.displayName = 'ReceiptBackgroundSheet';
