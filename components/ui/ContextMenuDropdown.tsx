import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { layout, radius, space, type, useColors, type ColorPalette } from '@/lib/platform';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  InteractionManager,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

const MENU_WIDTH = 256;
const MENU_ANCHOR_GAP = 6;
const ROW_ICON_SIZE = 20;
const ROW_MIN_HEIGHT = 46;
const ROW_PADDING_V = space[2];
const ROW_PADDING_H = space[3];
const ROW_GAP = space[3];

function androidMenuBackground(scheme: 'light' | 'dark') {
  return scheme === 'dark' ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)';
}

export type ContextMenuLeafItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  destructive?: boolean;
  onPress: () => void;
};

export type ContextMenuBranchItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  submenu: ContextMenuLeafItem[];
};

export type ContextMenuItem = ContextMenuLeafItem | ContextMenuBranchItem;

export type ContextMenuSection = {
  items: ContextMenuItem[];
};

export type ContextMenuDropdownProps = {
  visible: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<React.ComponentRef<typeof View> | null>;
  sections: ContextMenuSection[];
};

type SubmenuPane = {
  title: string;
  items: ContextMenuLeafItem[];
};

function isBranch(item: ContextMenuItem): item is ContextMenuBranchItem {
  return 'submenu' in item && Array.isArray(item.submenu);
}

function createMenuStyles(palette: ColorPalette) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.22)',
    },
    menuShell: {
      width: MENU_WIDTH,
      borderRadius: radius.lg,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.separator,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.22,
          shadowRadius: 20,
        },
        android: { elevation: 10 },
        default: {},
      }),
    },
    menuSolid: {
      width: MENU_WIDTH,
      borderRadius: radius.lg,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.separator,
      ...Platform.select({
        android: { elevation: 10 },
        default: {},
      }),
    },
    hairline: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: palette.separator,
      alignSelf: 'stretch',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: ROW_GAP,
      paddingVertical: ROW_PADDING_V,
      paddingHorizontal: ROW_PADDING_H,
      minHeight: ROW_MIN_HEIGHT,
    },
    rowPressed: {
      opacity: 0.55,
    },
    iconTrack: {
      width: ROW_ICON_SIZE + 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowTextBlock: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    rowTitle: {
      ...type.body,
      fontWeight: '500',
      color: palette.label,
    },
    rowTitleDestructive: {
      color: palette.negative,
    },
    rowSubtitle: {
      ...type.footnote,
      color: palette.labelSecondary,
    },
    chevron: {
      marginLeft: space[1],
    },
    submenuHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: ROW_GAP,
      paddingVertical: ROW_PADDING_V,
      paddingHorizontal: ROW_PADDING_H,
      minHeight: ROW_MIN_HEIGHT,
    },
    submenuHeaderTitle: {
      ...type.subheadline,
      fontWeight: '600',
      color: palette.label,
    },
  });
}

export function ContextMenuDropdown({
  visible,
  onClose,
  anchorRef,
  sections,
}: ContextMenuDropdownProps) {
  const { width: windowWidth } = useWindowDimensions();
  const palette = useColors();
  const colorScheme = useAppColorScheme();
  const styles = useMemo(() => createMenuStyles(palette), [palette]);

  const [anchorLayout, setAnchorLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [submenuStack, setSubmenuStack] = useState<SubmenuPane[]>([]);

  const resetAndClose = useCallback(() => {
    setSubmenuStack([]);
    setAnchorLayout(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!visible) {
      setSubmenuStack([]);
      setAnchorLayout(null);
      return;
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        anchorRef.current?.measureInWindow((x, y, w, h) => {
          if (w > 0 && h > 0) {
            setAnchorLayout({ x, y, width: w, height: h });
          }
        });
      });
    });
    return () => cancelAnimationFrame(id);
  }, [visible, anchorRef]);

  const menuLeft = useMemo(() => {
    if (!anchorLayout) return layout.screenPaddingX;
    const gutter = layout.screenPaddingX;
    const raw = anchorLayout.x + anchorLayout.width - MENU_WIDTH;
    return Math.min(Math.max(gutter, raw), windowWidth - MENU_WIDTH - gutter);
  }, [anchorLayout, windowWidth]);

  const menuTop = anchorLayout ? anchorLayout.y + anchorLayout.height + MENU_ANCHOR_GAP : 80;

  const blurTint =
    colorScheme === 'dark' ? ('systemChromeMaterialDark' as const) : ('systemChromeMaterialLight' as const);

  const hapticSelect = useCallback(() => {
    if (Platform.OS === 'web') return;
    void Haptics.selectionAsync();
  }, []);

  const onLeafPress = useCallback(
    (fn: () => void) => {
      hapticSelect();
      setSubmenuStack([]);
      setAnchorLayout(null);
      onClose();
      InteractionManager.runAfterInteractions(() => {
        fn();
      });
    },
    [hapticSelect, onClose]
  );

  const onBranchPress = useCallback(
    (item: ContextMenuBranchItem) => {
      hapticSelect();
      setSubmenuStack((s) => [...s, { title: item.title, items: item.submenu }]);
    },
    [hapticSelect]
  );

  const popSubmenu = useCallback(() => {
    hapticSelect();
    setSubmenuStack((s) => s.slice(0, -1));
  }, [hapticSelect]);

  const renderIconTrack = (Icon: LucideIcon | undefined, color: string) => (
    <View style={styles.iconTrack}>{Icon ? <Icon size={ROW_ICON_SIZE} color={color} /> : null}</View>
  );

  const renderRow = (item: ContextMenuItem, rowKey: string, showDividerBelow: boolean) => {
    if (isBranch(item)) {
      return (
        <React.Fragment key={rowKey}>
          <Pressable
            accessibilityRole="button"
            onPress={() => onBranchPress(item)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            {renderIconTrack(item.icon, palette.label)}
            <View style={styles.rowTextBlock}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              {item.subtitle ? <Text style={styles.rowSubtitle}>{item.subtitle}</Text> : null}
            </View>
            <ChevronRight size={18} color={palette.labelTertiary} style={styles.chevron} />
          </Pressable>
          {showDividerBelow ? <View style={styles.hairline} /> : null}
        </React.Fragment>
      );
    }

    const destructive = item.destructive === true;
    const labelColor = destructive ? palette.negative : palette.label;
    return (
      <React.Fragment key={rowKey}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onLeafPress(item.onPress)}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          {renderIconTrack(item.icon, labelColor)}
          <View style={styles.rowTextBlock}>
            <Text style={[styles.rowTitle, destructive && styles.rowTitleDestructive]}>{item.title}</Text>
            {item.subtitle ? (
              <Text style={styles.rowSubtitle} numberOfLines={2}>
                {item.subtitle}
              </Text>
            ) : null}
          </View>
        </Pressable>
        {showDividerBelow ? <View style={styles.hairline} /> : null}
      </React.Fragment>
    );
  };

  const activePane = submenuStack.length > 0 ? submenuStack[submenuStack.length - 1] : null;

  const menuBody = activePane ? (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={popSubmenu}
        style={({ pressed }) => [styles.submenuHeader, pressed && styles.rowPressed]}
      >
        <View style={styles.iconTrack}>
          <ChevronLeft size={ROW_ICON_SIZE} color={palette.tint} />
        </View>
        <View style={styles.rowTextBlock}>
          <Text style={styles.submenuHeaderTitle}>{activePane.title}</Text>
        </View>
      </Pressable>
      <View style={styles.hairline} />
      {activePane.items.map((leaf, i) => (
        <React.Fragment key={leaf.id}>
          <Pressable
            accessibilityRole="button"
            onPress={() => onLeafPress(leaf.onPress)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            {renderIconTrack(leaf.icon, leaf.destructive ? palette.negative : palette.label)}
            <View style={styles.rowTextBlock}>
              <Text style={[styles.rowTitle, leaf.destructive && styles.rowTitleDestructive]}>{leaf.title}</Text>
              {leaf.subtitle ? <Text style={styles.rowSubtitle}>{leaf.subtitle}</Text> : null}
            </View>
          </Pressable>
          {i < activePane.items.length - 1 ? <View style={styles.hairline} /> : null}
        </React.Fragment>
      ))}
    </>
  ) : (
    sections.map((section, si) => {
      const flatRows: { item: ContextMenuItem; key: string }[] = section.items.map((item) => ({
        item,
        key: `${si}-${item.id}`,
      }));
      return (
        <React.Fragment key={`sec-${si}`}>
          {si > 0 ? <View style={styles.hairline} /> : null}
          {flatRows.map(({ item, key }, ri) => {
            const showDividerBelow = ri < flatRows.length - 1;
            return renderRow(item, key, showDividerBelow);
          })}
        </React.Fragment>
      );
    })
  );

  const shellChild = <View>{menuBody}</View>;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={resetAndClose}
      accessibilityViewIsModal
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Pressable style={styles.backdrop} onPress={resetAndClose} accessibilityLabel="Dismiss menu" />
        {anchorLayout ? (
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              left: menuLeft,
              top: menuTop,
            }}
          >
            {Platform.OS === 'ios' ? (
              <BlurView intensity={72} tint={blurTint} style={styles.menuShell}>
                {shellChild}
              </BlurView>
            ) : (
              <View
                style={[
                  styles.menuSolid,
                  {
                    backgroundColor:
                      Platform.OS === 'android'
                        ? androidMenuBackground(colorScheme)
                        : colorScheme === 'dark'
                          ? 'rgba(44, 44, 46, 0.94)'
                          : 'rgba(255, 255, 255, 0.94)',
                  },
                ]}
              >
                {shellChild}
              </View>
            )}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
