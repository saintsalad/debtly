import { Avatar } from '@/components/ui/Avatar';
import { ContextMenuDropdown, type ContextMenuItem, type ContextMenuSection } from '@/components/ui/ContextMenuDropdown';
import { minorToMajor } from '@/features/debts/money';
import type { MemberBalance } from '@/features/group-expense/types';
import { useProfileStore } from '@/stores/profileStore';
import { formatCurrency } from '@/lib/utils';
import { useGlassSurfacePressed } from '@/lib/glassSurface';
import { sansForWeight } from '@/lib/appFonts';
import { space, type, useColors, type ColorPalette } from '@/lib/platform';
import * as Haptics from 'expo-haptics';
import { CheckCircle, MessageCircle, Undo2 } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface MemberBalanceRowProps {
  balance: MemberBalance;
  /** ISO 4217 for row amounts; falls back to profile currency. */
  currencyCode?: string;
  /** True if any settlement exists between the viewer and this member (either direction). */
  hasRecordedSettlements: boolean;
  onSendMessage: () => void;
  onMarkPaid: () => void;
  onMarkUnpaid: () => void;
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
      fontFamily: sansForWeight('500'),
      color: palette.label,
    },
    sub: {
      ...type.footnote,
      color: palette.labelSecondary,
    },
    subSettled: {
      ...type.footnote,
      color: palette.labelTertiary,
      fontWeight: '500',
      fontFamily: sansForWeight('500'),
    },
    amount: {
      ...type.callout,
      fontWeight: '600',
      fontFamily: sansForWeight('600'),
    },
    amountSettled: {
      textDecorationLine: 'line-through',
      opacity: 0.72,
    },
    positive: { color: palette.positive },
    negative: { color: palette.negative },
    neutral: { color: palette.labelTertiary },
  });
}

export function MemberBalanceRow({
  balance,
  currencyCode,
  hasRecordedSettlements,
  onSendMessage,
  onMarkPaid,
  onMarkUnpaid,
}: MemberBalanceRowProps) {
  const palette = useColors();
  const rowPressedColor = useGlassSurfacePressed();
  const styles = useMemo(
    () => createStyles(palette, rowPressedColor),
    [palette, rowPressedColor]
  );
  const profileCurrency = useProfileStore((s) => s.currency);
  const code = currencyCode ?? profileCurrency;
  const fmt = useMemo(() => (amount: number) => formatCurrency(amount, code), [code]);

  const [menuOpen, setMenuOpen] = useState(false);
  const anchorRef = useRef<View>(null);

  const ledgerSquare = balance.netMinor === 0;
  const showMarkPaid = !ledgerSquare;
  const showMarkUnpaid = ledgerSquare && hasRecordedSettlements;

  const menuSections = useMemo((): ContextMenuSection[] => {
    const items: ContextMenuItem[] = [
      {
        id: 'message',
        title: 'Send message',
        icon: MessageCircle,
        onPress: onSendMessage,
      },
    ];
    if (showMarkUnpaid) {
      items.push({
        id: 'unpaid',
        title: 'Mark as unpaid',
        icon: Undo2,
        onPress: onMarkUnpaid,
      });
    } else if (showMarkPaid) {
      items.push({
        id: 'paid',
        title: 'Mark as paid',
        icon: CheckCircle,
        onPress: onMarkPaid,
      });
    }
    return [{ items }];
  }, [onSendMessage, onMarkPaid, onMarkUnpaid, showMarkPaid, showMarkUnpaid]);

  const openMenu = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMenuOpen(true);
  }, []);

  if (balance.isCurrentUser) {
    return (
      <View style={styles.row}>
        <Avatar
          name={balance.displayName}
          seed={balance.memberId}
          size={40}
          imageUri={balance.avatarUri}
        />
        <View style={styles.body}>
          <Text style={styles.name}>{balance.displayName}</Text>
          <Text style={styles.sub}>You</Text>
        </View>
      </View>
    );
  }

  const baseLabel =
    balance.netMinor > 0
      ? `owes you ${fmt(minorToMajor(balance.netMinor))}`
      : balance.netMinor < 0
        ? `you owe ${fmt(minorToMajor(Math.abs(balance.netMinor)))}`
        : 'settled up';

  const rowInner = (
    <>
      <Avatar
        name={balance.displayName}
        seed={balance.memberId}
        size={40}
        imageUri={balance.avatarUri}
      />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {balance.displayName}
        </Text>
        {ledgerSquare ? (
          <Text style={styles.subSettled}>Settled up</Text>
        ) : (
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
            {baseLabel}
          </Text>
        )}
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
      ) : (
        <Text style={[styles.amount, styles.neutral, styles.amountSettled]}>
          {fmt(0)}
        </Text>
      )}
    </>
  );

  return (
    <>
      <Pressable
        ref={anchorRef}
        collapsable={false}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={openMenu}
        accessibilityRole="button"
        accessibilityLabel={`Balance options for ${balance.displayName}`}
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
