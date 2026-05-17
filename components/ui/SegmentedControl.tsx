import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useColors, type ColorPalette } from '@/lib/platform';
import { BlurView } from 'expo-blur';
import { Tabs } from 'heroui-native';
import type { LucideIcon } from 'lucide-react-native';
import React, { useMemo } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

interface SegmentedControlProps {
  options: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  /** Max width vs parent (`100` fills). Narrower widths are centered. Default `100`. */
  trackWidthPercent?: number;
  /** Toolbar vs form layout hints (`inline` avoids flex-child overflow in tight rows). */
  variant?: 'default' | 'inline';
  /** Applied to `Tabs.List` (sizes, spacing). Border is drawn on outer track chrome; fills are ignored. */
  trackStyle?: StyleProp<ViewStyle>;
  /** Optional icon per segment; omit or `undefined` for text-only tabs (e.g. “All”). */
  icons?: (LucideIcon | undefined)[];
  /** When segment is selected, sets label + icon color (fallback: semantic active label color). */
  selectedForegroundByIndex?: (string | undefined)[];
}

const SEGMENT_ICON_SIZE = 15;

/**
 * Horizontal inset inside the pill (`Tabs.List`). HeroUI applies `p-[3px]` via className; Uniwind
 * usually merges those styles after `style`, so `paddingHorizontal` on `style` won’t stick — reset
 * with `p-0`, then set `px-*` / `py-[3px]` here (`space[2]` is `px-2` on our 4pt grid).
 */
const TRACK_HORIZONTAL_TAILWIND = 'px-1';

/** Matches HeroUI `Tabs` primary list `rounded-3xl` (Tailwind 1.5rem). */
const TRACK_CORNER_RADIUS = 24;

const ANDROID_TRACK_OPACITY = 0.9;

/**
 * Neutral gray translucent track on Android light — reads as a pill over white / grouped `#F6F6F6`;
 * opaque white `@ 0.9` alpha sits too close to elevated surfaces underneath.
 */
const ANDROID_LIGHT_TRACK_FILL = 'rgba(120,120,128, 0.24)';

/** Softer blur + scrim so underlying content stays subtly visible vs `FloatingPillTabBar`-level frost. */
const IOS_SEGMENT_BLUR_INTENSITY = { light: 36, dark: 30 } as const;
const IOS_SEGMENT_SCRIM = { light: 'rgba(0,0,0,0.08)', dark: 'rgba(0,0,0,0.22)' } as const;

function elevatedSurfaceAlpha(surfaceHex: string, alpha: number): string {
  const raw = surfaceHex.replace('#', '');
  if (raw.length !== 6 && raw.length !== 3) return surfaceHex;
  const h = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function foregroundForSegment(
  palette: ColorPalette,
  isSelected: boolean,
  accent: string | undefined
) {
  return isSelected ? accent ?? palette.label : palette.labelSecondary;
}

function clampPercent(pct: number): number {
  if (!Number.isFinite(pct)) return 100;
  return Math.min(100, Math.max(8, pct));
}

export function SegmentedControl({
  options,
  selectedIndex,
  onChange,
  trackWidthPercent = 100,
  variant = 'default',
  trackStyle,
  icons,
  selectedForegroundByIndex,
}: SegmentedControlProps) {
  const palette = useColors();
  const scheme = useAppColorScheme();

  const { chromeBorder, listRest } = useMemo(() => {
    const f = StyleSheet.flatten(trackStyle) as ViewStyle | undefined;
    if (!f) return { chromeBorder: {} as ViewStyle, listRest: {} as ViewStyle };
    const { backgroundColor: _bg, borderWidth, borderColor, ...rest } = f;
    const chrome: ViewStyle = {};
    if (borderWidth !== undefined) chrome.borderWidth = borderWidth;
    if (borderColor !== undefined) chrome.borderColor = borderColor;
    return { chromeBorder: chrome, listRest: rest };
  }, [trackStyle]);

  const androidTrackFill =
    scheme === 'light'
      ? ANDROID_LIGHT_TRACK_FILL
      : elevatedSurfaceAlpha(palette.surface, ANDROID_TRACK_OPACITY);
  const blurTint = scheme === 'dark' ? 'dark' : 'light';
  const blurIntensity = IOS_SEGMENT_BLUR_INTENSITY[scheme];

  const pct = clampPercent(trackWidthPercent);
  const fillsParent = pct >= 99.9;
  const rootClassName = [variant === 'inline' ? 'min-w-0' : '', 'gap-0 flex-col'].filter(Boolean).join(' ');
  const rootWidthStyle =
    fillsParent ?
      ({
        width: '100%',
        maxWidth: '100%',
        alignSelf: 'stretch',
      } as const)
    : ({
        width: `${pct}%`,
        maxWidth: '100%',
        alignSelf: 'center',
      } as const);

  const listClassName = [
    'w-full self-stretch',
    'p-0',
    'bg-transparent',
    TRACK_HORIZONTAL_TAILWIND,
    // 'py-[2.5px]',
  ].join(' ');

  const trackFill =
    Platform.OS === 'ios' ? (
      <>
        <BlurView
          pointerEvents="none"
          intensity={blurIntensity}
          tint={blurTint}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, { backgroundColor: IOS_SEGMENT_SCRIM[scheme] }]}
        />
      </>
    ) : (
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { backgroundColor: androidTrackFill }]}
      />
    );

  return (
    <Tabs
      value={String(selectedIndex)}
      onValueChange={(v) => onChange(Number(v))}
      variant="primary"
      className={rootClassName}
      style={rootWidthStyle}
    >
      <View
        style={[
          styles.trackShell,
          { borderRadius: TRACK_CORNER_RADIUS },
          Platform.OS === 'ios' ? { borderCurve: 'continuous' as const } : null,
          chromeBorder,
        ]}
      >
        {trackFill}
        <Tabs.List className={listClassName} style={[listRest, styles.listAboveFill]}>
          <Tabs.Indicator />
          {options.map((option, index) => {
            const Icon = icons?.[index];
            const accent = selectedForegroundByIndex?.[index];

            return (
              <Tabs.Trigger key={`${option}-${index}`} value={String(index)} className="min-w-0 flex-1 px-1 py-2.5">
                {({ isSelected }) => {
                  const fg = foregroundForSegment(palette, isSelected, accent);

                  return Icon ? (
                    <>
                      <Icon size={SEGMENT_ICON_SIZE} color={fg} strokeWidth={2.25} />
                      <Tabs.Label
                        numberOfLines={1}
                        className={`text-[13px] leading-tight ${isSelected ? 'font-semibold' : 'font-medium'}`}
                        style={{ color: fg }}
                      >
                        {option}
                      </Tabs.Label>
                    </>
                  ) : (
                    <Tabs.Label
                      numberOfLines={1}
                      className={`text-[13px] leading-tight ${isSelected ? 'font-semibold' : 'font-medium'}`}
                      style={{ color: fg }}
                    >
                      {option}
                    </Tabs.Label>
                  );
                }}
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>
      </View>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  trackShell: {
    width: '100%',
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  listAboveFill: {
    zIndex: 1,
    backgroundColor: 'transparent',
  },
});
