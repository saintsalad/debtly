import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Check, X } from 'lucide-react-native';
import { HeroUINativeProvider, Slider, type SliderValue } from 'heroui-native';
import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import {
  type ColorMode,
  DEFAULT_THERMALIZE_OPTIONS,
  type PixelShape,
  type ThermalizeOptions,
} from '@/features/debts/receipt/thermalPortrait';
import { useAppBottomSheetLayout } from '@/lib/appBottomSheet';
import { radius, space, type, useColors, type ColorPalette } from '@/lib/platform';

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
  { mode: 'duotone', label: 'Light', fg: [28, 28, 28], bg: [248, 248, 248] },
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
      paddingHorizontal: space[4],
      backgroundColor: palette.surface,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: space[2],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.opaqueSeparator,
    },
    title: {
      flex: 1,
      ...type.subheadline,
      fontWeight: '600',
      color: palette.label,
      textAlign: 'center',
    },
    topToolbar: {
      marginTop: space[2],
      marginBottom: space[2],
    },
    profileHint: {
      ...type.caption2,
      color: palette.labelSecondary,
      marginBottom: space[2],
    },
    modeRowCompact: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: space[2],
    },
    tuningBlock: {
      marginBottom: space[2],
      width: '100%',
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
      color: palette.labelSecondary,
      letterSpacing: 0.5,
      flexShrink: 0,
    },
    modeChip: {
      paddingHorizontal: space[2],
      paddingVertical: space[1],
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: palette.opaqueSeparator,
    },
    modeChipActive: {
      borderColor: palette.tint,
      backgroundColor: palette.fillSecondary,
    },
    modeChipText: {
      ...type.caption2,
      color: palette.labelSecondary,
    },
    modeChipTextActive: {
      color: palette.label,
      fontWeight: '600',
    },
    presetScroll: {
      marginBottom: space[2],
    },
    presetChip: {
      paddingHorizontal: space[2],
      paddingVertical: space[1],
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: palette.opaqueSeparator,
    },
    presetChipActive: {
      borderColor: palette.tint,
    },
    presetChipText: {
      ...type.caption2,
      color: palette.labelSecondary,
    },
    shapeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      marginBottom: space[2],
    },
    shapeLabel: {
      ...type.caption2,
      color: palette.labelTertiary,
      width: 52,
    },
    shapeChips: {
      flex: 1,
      flexDirection: 'row',
      gap: space[1],
      justifyContent: 'flex-end',
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
    [dismiss, presentSheet],
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
        opacity={0.32}
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
      } else {
        const p = TRITONE_PRESETS[0]!;
        onOptionsChange({
          ...options,
          colorMode: 'tritone',
          fgColor: [...p.fg],
          midColor: [...p.mid],
          bgColor: [...p.bg],
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
          <View style={styles.header}>
            <HeaderIconButton icon={X} accessibilityLabel="Close" onPress={dismiss} />
            <Text style={styles.title}>Bitmap lab</Text>
            <HeaderIconButton
              icon={Check}
              accessibilityLabel="Done"
              onPress={dismiss}
              variant="tint"
            />
          </View>

          <View style={styles.topToolbar}>
            <View style={styles.modeRowCompact}>
              <Pressable
                onPress={() => setColorMode('duotone')}
                style={[styles.modeChip, mode === 'duotone' && styles.modeChipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: mode === 'duotone' }}
              >
                <Text
                  style={[styles.modeChipText, mode === 'duotone' && styles.modeChipTextActive]}
                >
                  2-color
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setColorMode('tritone')}
                style={[styles.modeChip, mode === 'tritone' && styles.modeChipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: mode === 'tritone' }}
              >
                <Text
                  style={[styles.modeChipText, mode === 'tritone' && styles.modeChipTextActive]}
                >
                  3-color
                </Text>
              </Pressable>
            </View>
          </View>

          {!thermalEnabled ? (
            <Text style={styles.profileHint}>
              Turn on &quot;Thermal receipt photos&quot; in Profile to apply these settings.
            </Text>
          ) : null}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.presetScroll}
            contentContainerStyle={{ gap: space[2], paddingRight: space[2] }}
          >
            {mode === 'duotone'
              ? DUOTONE_PRESETS.map((p) => {
                  const active = presetMatchesDuotone(options, p);
                  return (
                    <Pressable
                      key={p.label}
                      onPress={() => applyDuotonePreset(p)}
                      style={[styles.presetChip, active && styles.presetChipActive]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={styles.presetChipText}>{p.label}</Text>
                    </Pressable>
                  );
                })
              : TRITONE_PRESETS.map((p) => {
                  const active = presetMatchesTritone(options, p);
                  return (
                    <Pressable
                      key={p.label}
                      onPress={() => applyTritonePreset(p)}
                      style={[styles.presetChip, active && styles.presetChipActive]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={styles.presetChipText}>{p.label}</Text>
                    </Pressable>
                  );
                })}
          </ScrollView>

          <View style={styles.shapeRow}>
            <Text style={styles.shapeLabel}>Shape</Text>
            <View style={styles.shapeChips}>
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
                    onPress={() => setPixelShape(shape)}
                    style={[styles.presetChip, active && styles.presetChipActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={styles.presetChipText}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

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

          <View style={styles.tuningBlock}>
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
        </BottomSheetScrollView>
      </HeroUINativeProvider>
    </BottomSheetModal>
  );
});

ReceiptBitmapLabSheet.displayName = 'ReceiptBitmapLabSheet';
