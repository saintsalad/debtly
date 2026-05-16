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
  RECEIPT_ASPECT_PRESETS,
  type ReceiptAspectPresetId,
} from '@/features/debts/receipt/receiptAspectPresets';
import { useAppBottomSheetLayout } from '@/lib/appBottomSheet';
import { radius, space, type, useColors, type ColorPalette } from '@/lib/platform';

export interface ReceiptAspectSheetHandle {
  present: () => void;
  dismiss: () => void;
}

interface ReceiptAspectSheetProps {
  selectedId: ReceiptAspectPresetId;
  onSelect: (id: ReceiptAspectPresetId) => void;
}

const ICON_BOX = 52;

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
    option: {
      width: 84,
      alignItems: 'center',
      gap: space[2],
    },
    iconBox: {
      width: ICON_BOX,
      height: ICON_BOX,
      borderRadius: radius.md,
      borderWidth: 2,
      borderColor: palette.opaqueSeparator,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.fill,
    },
    iconBoxActive: {
      borderColor: palette.tint,
      borderWidth: 2.5,
      backgroundColor: palette.surface,
    },
    label: {
      ...type.caption1,
      color: palette.labelSecondary,
    },
    labelActive: {
      color: palette.label,
      fontWeight: '600',
    },
  });
}

function AspectIcon({
  frameWidth,
  frameHeight,
  borderColor,
}: {
  frameWidth: number;
  frameHeight: number;
  borderColor: string;
}) {
  const max = 34;
  const scale = max / Math.max(frameWidth, frameHeight);
  const w = Math.round(frameWidth * scale);
  const h = Math.round(frameHeight * scale);
  return (
    <View
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}
    >
      <View style={{ width: w, height: h, borderWidth: 2, borderColor, borderRadius: 2 }} />
    </View>
  );
}

export const ReceiptAspectSheet = forwardRef<ReceiptAspectSheetHandle, ReceiptAspectSheetProps>(
  function ReceiptAspectSheet({ selectedId, onSelect }, ref) {
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
    const snapPoints = useMemo(() => ['42%'], []);

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

    const handleSelect = (id: ReceiptAspectPresetId) => {
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
              <Text style={styles.title}>Canvas size</Text>
              <HeaderIconButton
                icon={Check}
                accessibilityLabel="Done"
                onPress={dismiss}
                variant="tint"
              />
            </View>
            <View style={styles.body}>
              <Text style={styles.hint}>Common photo ratios for the receipt background.</Text>
              <View style={styles.grid}>
                {RECEIPT_ASPECT_PRESETS.map((preset) => {
                  const active = preset.id === selectedId;
                  return (
                    <Pressable
                      key={preset.id}
                      style={styles.option}
                      onPress={() => handleSelect(preset.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${preset.label} aspect ratio`}
                      accessibilityState={{ selected: active }}
                    >
                      <View style={[styles.iconBox, active && styles.iconBoxActive]}>
                        <AspectIcon
                          frameWidth={preset.frameWidth}
                          frameHeight={preset.frameHeight}
                          borderColor={palette.label}
                        />
                        {active ? (
                          <View
                            style={{
                              position: 'absolute',
                              right: 2,
                              bottom: 2,
                              backgroundColor: palette.surface,
                              borderRadius: radius.pill,
                              padding: 3,
                              borderWidth: StyleSheet.hairlineWidth,
                              borderColor: palette.tint,
                            }}
                          >
                            <Check size={12} color={palette.tint} strokeWidth={3} />
                          </View>
                        ) : null}
                      </View>
                      <Text style={[styles.label, active && styles.labelActive]}>{preset.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </BottomSheetView>
        </HeroUINativeProvider>
      </BottomSheetModal>
    );
  },
);

ReceiptAspectSheet.displayName = 'ReceiptAspectSheet';
