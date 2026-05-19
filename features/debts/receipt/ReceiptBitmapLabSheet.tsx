import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import {
  DEFAULT_THERMALIZE_OPTIONS,
  type ColorMode,
  type PixelShape,
  type ThermalizeOptions,
} from '@/features/debts/receipt/thermalPortrait';
import { useAppBottomSheetLayout } from '@/lib/appBottomSheet';
import { sansForWeight } from '@/lib/appFonts';
import { radius, space, type, useColors, type ColorPalette } from '@/lib/platform';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { HeroUINativeProvider, Slider, type SliderValue } from 'heroui-native';
import { Check, X } from 'lucide-react-native';
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export interface ReceiptBitmapLabSheetHandle {
  present: () => void;
  dismiss: () => void;
}

interface ReceiptBitmapLabSheetProps {
  /** When false (from Profile), sliders are disabled and original photo is shown. */
  thermalEnabled: boolean;
  options: ThermalizeOptions;
  onOptionsChange: (options: ThermalizeOptions) => void;
}

type RGB = [number, number, number];

type DuotonePreset = { mode: 'duotone'; label: string; fg: RGB; bg: RGB };
type TritonePreset = { mode: 'tritone'; label: string; fg: RGB; mid: RGB; bg: RGB };

const DUOTONE_PRESETS: DuotonePreset[] = [
  { mode: 'duotone', label: 'Light', fg: [28, 28, 28], bg: [255, 255, 255] },
  { mode: 'duotone', label: 'Dark', fg: [240, 240, 240], bg: [18, 18, 18] },
  { mode: 'duotone', label: 'Amber', fg: [230, 140, 20], bg: [18, 8, 0] },
];

const TRITONE_PRESETS: TritonePreset[] = [
  { mode: 'tritone', label: 'Dusk', fg: [18, 14, 36], mid: [160, 80, 180], bg: [252, 220, 180] },
  { mode: 'tritone', label: 'Ocean', fg: [4, 10, 30], mid: [0, 120, 200], bg: [180, 240, 255] },
];

function thermalSliderNumber(value: SliderValue): number {
  return typeof value === 'number' ? value : (value[0] ?? 0);
}

function createStyles(palette: ColorPalette) {
  const segmentedActiveShadow =
    Platform.OS === 'ios'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.08,
          shadowRadius: 2,
        }
      : { elevation: 1 };

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
      paddingHorizontal: space[3],
      paddingTop: 0,
      backgroundColor: palette.surface,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingBottom: space[2],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.opaqueSeparator,
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: space[2],
    },
    title: {
      ...type.subheadline,
      fontWeight: '600',
      fontFamily: sansForWeight('600'),
      color: palette.label,
      textAlign: 'center',
    },
    profileHint: {
      ...type.caption2,
      color: palette.labelSecondary,
      textAlign: 'center',
      marginTop: space[2],
      marginBottom: space[2],
      paddingHorizontal: space[1],
      lineHeight: 15,
    },
    compactSection: {
      marginBottom: space[2],
    },
    microLabel: {
      ...type.caption2,
      color: palette.labelTertiary,
      fontWeight: '600',
      fontFamily: sansForWeight('600'),
      letterSpacing: 0.8,
      marginBottom: space[1],
      textTransform: 'uppercase',
    },
    segmentedTrack: {
      flexDirection: 'row',
      backgroundColor: palette.fill,
      borderRadius: radius.pill,
      padding: 2,
    },
    segmentedItem: {
      flex: 1,
      paddingVertical: 7,
      paddingHorizontal: space[2],
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentedItemActive: {
      backgroundColor: palette.surface,
      ...segmentedActiveShadow,
    },
    segmentedLabel: {
      ...type.caption1,
      color: palette.labelSecondary,
      fontWeight: '500',
      fontFamily: sansForWeight('500'),
    },
    segmentedLabelActive: {
      color: palette.label,
      fontWeight: '600',
      fontFamily: sansForWeight('600'),
    },
    presetScroll: {
      marginLeft: -space[1],
    },
    presetChip: {
      paddingHorizontal: space[2],
      paddingVertical: 6,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: palette.opaqueSeparator,
      backgroundColor: 'transparent',
      minHeight: 32,
      justifyContent: 'center',
    },
    presetChipActive: {
      borderColor: palette.tint,
      backgroundColor: palette.tintMuted,
    },
    presetChipText: {
      ...type.caption1,
      color: palette.labelSecondary,
      fontWeight: '500',
      fontFamily: sansForWeight('500'),
    },
    presetChipTextActive: {
      color: palette.label,
      fontWeight: '600',
      fontFamily: sansForWeight('600'),
    },
    paletteHint: {
      ...type.caption1,
      color: palette.labelSecondary,
      lineHeight: 18,
    },
    shapeRow: {
      flexDirection: 'row',
      gap: space[1],
      alignItems: 'center',
    },
    tuningBlock: {
      marginBottom: space[2],
      width: '100%',
    },
    tuningBlockLast: {
      marginBottom: 0,
    },
    tuningTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: space[1],
      gap: space[2],
    },
    tuningLabel: {
      ...type.caption1,
      color: palette.label,
      fontWeight: '500',
      fontFamily: sansForWeight('500'),
      flexShrink: 0,
    },
  });
}

function isSameRgb(a: RGB | undefined, b: RGB | undefined) {
  if (!a || !b) return false;
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

function presetMatchesDuotone(opts: ThermalizeOptions, p: DuotonePreset) {
  return (
    opts.colorMode === 'duotone' &&
    isSameRgb(opts.fgColor, p.fg) &&
    isSameRgb(opts.bgColor, p.bg)
  );
}

function presetMatchesTritone(opts: ThermalizeOptions, p: TritonePreset) {
  return (
    opts.colorMode === 'tritone' &&
    isSameRgb(opts.fgColor, p.fg) &&
    isSameRgb(opts.midColor, p.mid) &&
    isSameRgb(opts.bgColor, p.bg)
  );
}

export const ReceiptBitmapLabSheet = forwardRef<
  ReceiptBitmapLabSheetHandle,
  ReceiptBitmapLabSheetProps
>(function ReceiptBitmapLabSheet(
  { thermalEnabled, options, onOptionsChange },
  ref,
) {
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
  const snapPoints = useMemo(() => ['32%'], []);

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
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
        opacity={0.22}
      />
    ),
    [],
  );

  const setColorMode = useCallback(
    (mode: ColorMode) => {
      if (mode === 'duotone') {
        const p = DUOTONE_PRESETS[0]!;
        onOptionsChange({
          ...options,
          colorMode: 'duotone',
          fgColor: [...p.fg],
          bgColor: [...p.bg],
          midColor: undefined,
        });
      } else if (mode === 'tritone') {
        const p = TRITONE_PRESETS[0]!;
        onOptionsChange({
          ...options,
          colorMode: 'tritone',
          fgColor: [...p.fg],
          midColor: [...p.mid],
          bgColor: [...p.bg],
        });
      } else {
        onOptionsChange({
          ...options,
          colorMode: 'color',
          midColor: undefined,
        });
      }
    },
    [onOptionsChange, options],
  );

  const applyDuotonePreset = useCallback(
    (p: DuotonePreset) => {
      onOptionsChange({
        ...options,
        colorMode: 'duotone',
        fgColor: [...p.fg],
        bgColor: [...p.bg],
        midColor: undefined,
      });
    },
    [onOptionsChange, options],
  );

  const applyTritonePreset = useCallback(
    (p: TritonePreset) => {
      onOptionsChange({
        ...options,
        colorMode: 'tritone',
        fgColor: [...p.fg],
        midColor: [...p.mid],
        bgColor: [...p.bg],
      });
    },
    [onOptionsChange, options],
  );

  const setPixelShape = useCallback(
    (pixelShape: PixelShape) => {
      onOptionsChange({ ...options, pixelShape });
    },
    [onOptionsChange, options],
  );

  const mode = options.colorMode ?? DEFAULT_THERMALIZE_OPTIONS.colorMode!;

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
        <BottomSheetScrollView
          contentContainerStyle={[styles.content, { paddingBottom: contentBottomPadding }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerRow}>
            <HeaderIconButton icon={X} accessibilityLabel="Close" onPress={dismiss} />
            <View style={styles.headerCenter}>
              <Text style={styles.title}>Bitmap lab</Text>
            </View>
            <HeaderIconButton
              icon={Check}
              accessibilityLabel="Done"
              onPress={dismiss}
              variant="tint"
            />
          </View>

          {!thermalEnabled ? (
            <Text style={styles.profileHint}>
              Enable Thermal receipt photos in Profile to edit.
            </Text>
          ) : null}

          <View style={styles.compactSection}>
            <Text style={styles.microLabel}>Mode</Text>
            <View style={styles.segmentedTrack}>
              <Pressable
                disabled={!thermalEnabled}
                onPress={() => setColorMode('duotone')}
                style={[
                  styles.segmentedItem,
                  mode === 'duotone' && styles.segmentedItemActive,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: mode === 'duotone', disabled: !thermalEnabled }}
              >
                <Text
                  style={[
                    styles.segmentedLabel,
                    mode === 'duotone' && styles.segmentedLabelActive,
                  ]}
                >
                  2-color
                </Text>
              </Pressable>
              <Pressable
                disabled={!thermalEnabled}
                onPress={() => setColorMode('tritone')}
                style={[
                  styles.segmentedItem,
                  mode === 'tritone' && styles.segmentedItemActive,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: mode === 'tritone', disabled: !thermalEnabled }}
              >
                <Text
                  style={[
                    styles.segmentedLabel,
                    mode === 'tritone' && styles.segmentedLabelActive,
                  ]}
                >
                  3-color
                </Text>
              </Pressable>
              <Pressable
                disabled={!thermalEnabled}
                onPress={() => setColorMode('color')}
                style={[
                  styles.segmentedItem,
                  mode === 'color' && styles.segmentedItemActive,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: mode === 'color', disabled: !thermalEnabled }}
              >
                <Text
                  style={[
                    styles.segmentedLabel,
                    mode === 'color' && styles.segmentedLabelActive,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  Color
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.compactSection}>
            <Text style={styles.microLabel}>Palette</Text>
            {mode === 'color' ? (
              <Text style={styles.paletteHint}>
                Uses each tile's average color from the photo; dither still follows brightness.
              </Text>
            ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.presetScroll}
              contentContainerStyle={{ gap: space[1], paddingHorizontal: space[1], paddingRight: space[2] }}
            >
              {mode === 'duotone'
                ? DUOTONE_PRESETS.map((p) => {
                    const active = presetMatchesDuotone(options, p);
                    return (
                      <Pressable
                        key={p.label}
                        disabled={!thermalEnabled}
                        onPress={() => applyDuotonePreset(p)}
                        style={[styles.presetChip, active && styles.presetChipActive]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active, disabled: !thermalEnabled }}
                      >
                        <Text
                          style={[styles.presetChipText, active && styles.presetChipTextActive]}
                        >
                          {p.label}
                        </Text>
                      </Pressable>
                    );
                  })
                : TRITONE_PRESETS.map((p) => {
                    const active = presetMatchesTritone(options, p);
                    return (
                      <Pressable
                        key={p.label}
                        disabled={!thermalEnabled}
                        onPress={() => applyTritonePreset(p)}
                        style={[styles.presetChip, active && styles.presetChipActive]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active, disabled: !thermalEnabled }}
                      >
                        <Text
                          style={[styles.presetChipText, active && styles.presetChipTextActive]}
                        >
                          {p.label}
                        </Text>
                      </Pressable>
                    );
                  })}
            </ScrollView>
            )}
          </View>

          <View style={styles.compactSection}>
            <Text style={styles.microLabel}>Shape</Text>
            <View style={styles.shapeRow}>
              {(
                [
                  ['square', 'Grid'] as const,
                  ['circle-solid', 'Solid'] as const,
                  ['circle-outline', 'Ring'] as const,
                ] as const
              ).map(([shape, label]) => {
                const active = (options.pixelShape ?? 'square') === shape;
                return (
                  <Pressable
                    key={shape}
                    disabled={!thermalEnabled}
                    onPress={() => setPixelShape(shape)}
                    style={[
                      styles.presetChip,
                      { flex: 1, minWidth: 0 },
                      active && styles.presetChipActive,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active, disabled: !thermalEnabled }}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        active && styles.presetChipTextActive,
                        { textAlign: 'center' },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.compactSection}>
            <Text style={styles.microLabel}>Tune</Text>

            <View style={styles.tuningBlock}>
              <Slider
                className="w-full"
                value={options.pixelSize}
                onChange={(v) =>
                  onOptionsChange({ ...options, pixelSize: thermalSliderNumber(v) })
                }
                minValue={2}
                maxValue={8}
                step={1}
                isDisabled={!thermalEnabled}
                formatOptions={{ maximumFractionDigits: 0 }}
              >
                <View style={styles.tuningTopRow}>
                  <Text style={styles.tuningLabel}>Pixel size</Text>
                  <Slider.Output classNames={{ text: 'text-foreground' }} />
                </View>
                <Slider.Track>
                  <Slider.Fill />
                  <Slider.Thumb />
                </Slider.Track>
              </Slider>
            </View>

            <View style={styles.tuningBlock}>
              <Slider
                className="w-full"
                value={options.contrast}
                onChange={(v) =>
                  onOptionsChange({ ...options, contrast: thermalSliderNumber(v) })
                }
                minValue={0.6}
                maxValue={2}
                step={0.05}
                isDisabled={!thermalEnabled}
                formatOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
              >
                <View style={styles.tuningTopRow}>
                  <Text style={styles.tuningLabel}>Contrast</Text>
                  <Slider.Output classNames={{ text: 'text-foreground' }} />
                </View>
                <Slider.Track>
                  <Slider.Fill />
                  <Slider.Thumb />
                </Slider.Track>
              </Slider>
            </View>

            <View style={[styles.tuningBlock, styles.tuningBlockLast]}>
              <Slider
                className="w-full"
                value={options.intensity}
                onChange={(v) =>
                  onOptionsChange({ ...options, intensity: thermalSliderNumber(v) })
                }
                minValue={0}
                maxValue={1}
                step={0.05}
                isDisabled={!thermalEnabled}
                formatOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
              >
                <View style={styles.tuningTopRow}>
                  <Text style={styles.tuningLabel}>Dither</Text>
                  <Slider.Output classNames={{ text: 'text-foreground' }} />
                </View>
                <Slider.Track>
                  <Slider.Fill />
                  <Slider.Thumb />
                </Slider.Track>
              </Slider>
            </View>
          </View>
        </BottomSheetScrollView>
      </HeroUINativeProvider>
    </BottomSheetModal>
  );
});

ReceiptBitmapLabSheet.displayName = 'ReceiptBitmapLabSheet';
