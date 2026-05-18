import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ChevronRight, HandCoins, Pencil, Receipt, Trash2, Undo2, UserMinus, UserPlus, Users } from 'lucide-react-native';
import { formatActivityDate } from '@/features/group-expense/activityFeed';
import type { ActivityItem, ActivityKind } from '@/features/group-expense/types';
import { useCurrency } from '@/hooks/useCurrency';
import { minorToMajor } from '@/features/debts/money';
import { useGlassSurfacePressed } from '@/lib/glassSurface';
import { useColors, space, type, type ColorPalette } from '@/lib/platform';

interface ActivityFeedItemProps {
  item: ActivityItem;
  onPress?: () => void;
  /** Group member display names; matching runs (case-insensitive) are bolded in title/subtitle. */
  highlightMemberNames?: string[];
}

function isProminentExpense(kind: ActivityKind): boolean {
  return kind === 'expense_added';
}

function isMutedKind(kind: ActivityKind): boolean {
  return kind !== 'expense_added';
}

function activityIcon(kind: ActivityKind) {
  switch (kind) {
    case 'settlement_recorded':
      return HandCoins;
    case 'settlements_voided':
      return Undo2;
    case 'expense_edited':
      return Pencil;
    case 'expense_deleted':
      return Trash2;
    case 'member_joined':
      return UserPlus;
    case 'member_removed':
      return UserMinus;
    case 'member_renamed':
      return Pencil;
    case 'group_created':
    case 'group_updated':
      return Users;
    default:
      return Receipt;
  }
}

function normalizeHighlightNames(names: string[] | undefined): string[] {
  if (!names?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    const t = n.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out.sort((a, b) => b.length - a.length);
}

function splitMemberNameChunks(text: string, namesSortedLongFirst: string[]): { str: string; mention: boolean }[] {
  if (!text) return [{ str: '', mention: false }];
  if (namesSortedLongFirst.length === 0) return [{ str: text, mention: false }];
  const lower = text.toLowerCase();
  const lowers = namesSortedLongFirst.map((n) => n.toLowerCase());
  const raw: { str: string; mention: boolean }[] = [];
  let i = 0;
  while (i < text.length) {
    let matched = false;
    for (let k = 0; k < namesSortedLongFirst.length; k++) {
      const nl = lowers[k]!;
      const len = nl.length;
      if (i + len <= text.length && lower.slice(i, i + len) === nl) {
        raw.push({ str: text.slice(i, i + len), mention: true });
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      raw.push({ str: text[i]!, mention: false });
      i += 1;
    }
  }
  if (raw.length === 0) return [{ str: text, mention: false }];
  const merged: { str: string; mention: boolean }[] = [];
  for (const c of raw) {
    const prev = merged[merged.length - 1];
    if (prev && prev.mention === c.mention) prev.str += c.str;
    else merged.push({ str: c.str, mention: c.mention });
  }
  return merged;
}

/** Copy typography + color onto every nested span so sizes match (RN nested Text inheritance is flaky). */
function pickChildBaseStyle(flat: TextStyle): TextStyle {
  const m: TextStyle = {};
  const keys = [
    'fontSize',
    'lineHeight',
    'letterSpacing',
    'fontFamily',
    'fontVariant',
    'fontWeight',
    'fontStyle',
    'color',
    'textTransform',
  ] as const;
  for (const k of keys) {
    const v = flat[k];
    if (v !== undefined) (m as Record<string, unknown>)[k] = v;
  }
  return m;
}

function ActivityTextWithMentions({
  text,
  memberNames,
  style,
  mentionExtraStyle,
  numberOfLines,
}: {
  text: string;
  memberNames?: string[];
  style: StyleProp<TextStyle>;
  mentionExtraStyle: TextStyle;
  numberOfLines?: number;
}) {
  const resolved = useMemo(() => normalizeHighlightNames(memberNames), [memberNames]);
  const parentFlat = useMemo(() => StyleSheet.flatten(style) as TextStyle, [style]);
  const baseChildStyle = useMemo(() => pickChildBaseStyle(parentFlat), [parentFlat]);
  if (resolved.length === 0) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }
  const chunks = splitMemberNameChunks(text, resolved);
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {chunks.map((c, i) => (
        <Text
          key={i}
          style={c.mention ? [baseChildStyle, mentionExtraStyle] : baseChildStyle}
        >
          {c.str}
        </Text>
      ))}
    </Text>
  );
}
function createStyles(palette: ColorPalette, rowPressedColor: string) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: space[4],
      paddingVertical: space[4],
      gap: space[3],
      minHeight: 68,
    },
    rowMuted: {
      opacity: 0.72,
    },
    rowPressed: { backgroundColor: rowPressedColor },
    iconColumn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      backgroundColor: palette.fill,
    },
    iconColumnExpense: {
      backgroundColor: palette.tintMuted,
    },
    body: { flex: 1, minWidth: 0, gap: 2 },
    expenseLabel: {
      ...type.caption2,
      fontWeight: '600',
      color: palette.tint,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    title: {
      ...type.subheadline,
      fontWeight: '500',
      color: palette.label,
    },
    titleExpense: {
      ...type.headline,
      fontWeight: '600',
      color: palette.label,
    },
    titleMuted: {
      ...type.footnote,
      fontWeight: '400',
      color: palette.labelSecondary,
    },
    meta: {
      ...type.footnote,
      color: palette.labelSecondary,
    },
    metaAudit: {
      ...type.caption1,
      color: palette.labelTertiary,
    },
    amount: {
      ...type.callout,
      fontWeight: '600',
      color: palette.label,
    },
    amountExpense: {
      ...type.headline,
      fontWeight: '600',
      color: palette.label,
    },
    amountMuted: {
      ...type.footnote,
      fontWeight: '500',
      color: palette.labelTertiary,
    },
    mentionBold: {
      fontWeight: '700',
    },
    trailing: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[1],
      flexShrink: 0,
    },
  });
}

export function ActivityFeedItem({ item, onPress, highlightMemberNames }: ActivityFeedItemProps) {
  const palette = useColors();
  const rowPressedColor = useGlassSurfacePressed();
  const styles = useMemo(
    () => createStyles(palette, rowPressedColor),
    [palette, rowPressedColor]
  );
  const { fmt } = useCurrency();

  const isExpense = isProminentExpense(item.kind);
  const isMuted = isMutedKind(item.kind);
  const Icon = activityIcon(item.kind);

  const handlePress = useCallback(() => {
    if (!onPress) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const accessibilityLabel = isExpense
    ? `Expense ${item.title}, ${item.amountMinor != null ? fmt(minorToMajor(item.amountMinor)) : ''}, ${item.subtitle ?? ''}, double tap to edit`
    : item.subtitle
      ? `${item.title}. ${item.subtitle}`
      : item.title;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        isMuted && styles.rowMuted,
        pressed && onPress && styles.rowPressed,
      ]}
      onPress={handlePress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={accessibilityLabel}
    >
      <View style={[styles.iconColumn, isExpense && styles.iconColumnExpense]}>
        <Icon
          size={isExpense ? 20 : 16}
          color={isExpense ? palette.tint : palette.labelTertiary}
        />
      </View>
      <View style={styles.body}>
        {isExpense ? <Text style={styles.expenseLabel}>Expense</Text> : null}
        <ActivityTextWithMentions
          text={item.title}
          memberNames={highlightMemberNames}
          style={[styles.title, isExpense && styles.titleExpense, isMuted && styles.titleMuted]}
          mentionExtraStyle={styles.mentionBold}
          numberOfLines={isExpense ? 1 : 2}
        />
        {isExpense ? (
          <>
            <ActivityTextWithMentions
              text={item.subtitle ?? ''}
              memberNames={highlightMemberNames}
              style={styles.meta}
              mentionExtraStyle={styles.mentionBold}
              numberOfLines={1}
            />
            <Text style={styles.meta}>{formatActivityDate(item.at)}</Text>
          </>
        ) : (
          <>
            {item.subtitle ? (
              <ActivityTextWithMentions
                text={item.subtitle}
                memberNames={highlightMemberNames}
                style={styles.metaAudit}
                mentionExtraStyle={styles.mentionBold}
                numberOfLines={item.kind === 'expense_edited' ? 5 : 2}
              />
            ) : null}
            <Text style={styles.meta}>{formatActivityDate(item.at)}</Text>
          </>
        )}
      </View>
      {item.amountMinor != null || onPress ? (
        <View style={styles.trailing}>
          {item.amountMinor != null ? (
            <Text
              style={[
                styles.amount,
                isExpense && styles.amountExpense,
                isMuted && styles.amountMuted,
              ]}
            >
              {fmt(minorToMajor(item.amountMinor))}
            </Text>
          ) : null}
          {onPress ? (
            <ChevronRight size={18} color={palette.labelTertiary} />
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}
