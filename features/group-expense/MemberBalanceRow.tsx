import { Avatar } from '@/components/ui/Avatar';
import { ContextMenuDropdown, type ContextMenuSection } from '@/components/ui/ContextMenuDropdown';
import { minorToMajor } from '@/features/debts/money';
import type { MemberBalance } from '@/features/group-expense/types';
import { useCurrency } from '@/hooks/useCurrency';
import { useGlassSurfacePressed } from '@/lib/glassSurface';
import { space, type, useColors, type ColorPalette } from '@/lib/platform';
import * as Haptics from 'expo-haptics';
import { MessageCircle, Share2 } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface MemberBalanceCreditMenu {
  onShareReceipt: () => void;
  onSendMessage: () => void;
}

interface MemberBalanceRowProps {
  balance: MemberBalance;
  /** Shown when someone owes you; opens a context menu (share / message). */
  creditMenu?: MemberBalanceCreditMenu;
}

function createStyles(palette: ColorPalette, rowPressedColor: string) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: space[4],
      paddingVertical: space[3],
      gap: space[3],
      minHeight: 56,
    },
    rowPressed: { backgroundColor: rowPressedColor },
    body: { flex: 1, minWidth: 0, gap: 2 },
    name: {
      ...type.subheadline,
      fontWeight: '500',
      color: palette.label,
    },
    sub: {
      ...type.footnote,
      color: palette.labelSecondary,
    },
    amount: {
      ...type.callout,
      fontWeight: '600',
    },
    positive: { color: palette.positive },
    negative: { color: palette.negative },
    neutral: { color: palette.labelTertiary },
  });
}

export function MemberBalanceRow({ balance, creditMenu }: MemberBalanceRowProps) {
  const palette = useColors();
  const rowPressedColor = useGlassSurfacePressed();
  const styles = useMemo(
    () => createStyles(palette, rowPressedColor),
    [palette, rowPressedColor]
  );
  const { fmt } = useCurrency();
  const [menuOpen, setMenuOpen] = useState(false);
  const anchorRef = useRef<View>(null);

  const menuSections = useMemo((): ContextMenuSection[] => {
    if (!creditMenu) return [];
    return [
      {
        items: [
          {
            id: 'share',
            title: 'Share receipt',
            icon: Share2,
            onPress: creditMenu.onShareReceipt,
          },
          {
            id: 'message',
            title: 'Send message',
            icon: MessageCircle,
            onPress: creditMenu.onSendMessage,
          },
        ],
      },
    ];
  }, [creditMenu]);

  const openMenu = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMenuOpen(true);
  }, []);

  if (balance.isCurrentUser) {
    return (
      <View style={styles.row}>
        <Avatar name={balance.displayName} size={40} />
        <View style={styles.body}>
          <Text style={styles.name}>{balance.displayName}</Text>
          <Text style={styles.sub}>You</Text>
        </View>
      </View>
    );
  }

  const label =
    balance.netMinor > 0
      ? `owes you ${fmt(minorToMajor(balance.netMinor))}`
      : balance.netMinor < 0
        ? `you owe ${fmt(minorToMajor(Math.abs(balance.netMinor)))}`
        : 'settled up';

  const rowInner = (
    <>
      <Avatar
        name={balance.displayName}
        size={40}
        tone={balance.netMinor > 0 ? 'credit' : balance.netMinor < 0 ? 'debit' : undefined}
      />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {balance.displayName}
        </Text>
        <Text
          style={[
            styles.sub,
            balance.netMinor > 0
              ? styles.positive
              : balance.netMinor < 0
                ? styles.negative
                : styles.neutral,
          ]}
        >
          {label}
        </Text>
      </View>
      {balance.netMinor !== 0 ? (
        <Text
          style={[
            styles.amount,
            balance.netMinor > 0 ? styles.positive : styles.negative,
          ]}
        >
          {fmt(minorToMajor(Math.abs(balance.netMinor)))}
        </Text>
      ) : null}
    </>
  );

  if (balance.netMinor > 0 && creditMenu) {
    return (
      <>
        <Pressable
          ref={anchorRef}
          collapsable={false}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={openMenu}
          accessibilityRole="button"
          accessibilityLabel="Balance options"
        >
          {rowInner}
        </Pressable>
        <ContextMenuDropdown
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          anchorRef={anchorRef}
          sections={menuSections}
        />
      </>
    );
  }

  return <View style={styles.row}>{rowInner}</View>;
}
