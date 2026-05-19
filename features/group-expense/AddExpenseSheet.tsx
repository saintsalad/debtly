import { GlassButton } from '@/components/ui/GlassButton';
import { ListDivider } from '@/components/ui/ListDivider';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import {
  AMOUNT_EXCEEDS_MAX_MESSAGE,
  isMajorWithinInputCap,
  minorToMajor,
  sanitizeExpenseMajorInput,
  sanitizePercentMajorInput,
  sanitizeSignedMajorInput,
} from '@/features/debts/money';
import {
  allocateEqualShares,
  amountToMinor,
  createDefaultShares,
  getCurrentUserMember,
} from '@/features/group-expense/balanceEngine';
import { isCloudSplitGroup } from '@/features/group-expense/mergeConvexSplitSnapshot';
import type { GroupExpense, SplitGroup, SplitMethod } from '@/features/group-expense/types';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useCurrency } from '@/hooks/useCurrency';
import { useAppBottomSheetLayout } from '@/lib/appBottomSheet';
import { radius, space, type, useColors, type ColorPalette } from '@/lib/platform';
import { useGroupExpenseStore } from '@/stores/groupExpenseStore';
import { useProfileStore } from '@/stores/profileStore';
import { notifySuccess } from '@/lib/appToast';
import { sansForWeight } from '@/lib/appFonts';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Description, HeroUINativeProvider, Label, TextField, useToast } from 'heroui-native';
import { ChevronDown } from 'lucide-react-native';
import React, { forwardRef, Fragment, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

export interface AddExpenseSheetHandle {
  present: (groupId: string, expenseId?: string) => void;
  dismiss: () => void;
}

const SPLIT_OPTIONS = ['Equal', 'Custom', '%', 'Shares', 'Adjust'] as const;

function splitMethodFromIndex(i: number): SplitMethod {
  switch (i) {
    case 1:
      return 'exact';
    case 2:
      return 'percentage';
    case 3:
      return 'shares';
    case 4:
      return 'adjustment';
    default:
      return 'equal';
  }
}

function splitIndexFromMethod(m: SplitMethod): number {
  switch (m) {
    case 'exact':
      return 1;
    case 'percentage':
      return 2;
    case 'shares':
      return 3;
    case 'adjustment':
      return 4;
    default:
      return 0;
  }
}

/** Signed basis-points delta from 100% (positive = remaining to assign). */
function formatPercentDeltaFromBps(bpsSigned: number): string {
  const majors = Math.round(bpsSigned) / 100;
  const rounded = Math.round(majors * 100) / 100;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2);
}

/** One or two short lines under Split method; plain language. */
const SPLIT_METHOD_DESCRIPTIONS: Record<SplitMethod, string> = {
  equal:
    "Splits the bill evenly between everyone who's included. You don't enter amounts for each person.",
  exact:
    'Type exactly how much each included person owes. Those amounts must add up to the bill total.',
  percentage:
    'Each included person owes a percent of the total. Entries must add up to 100%. Below you can see how much is left.',
  shares:
    'Give each person a "share" number (for example 2 and 1 means one person pays twice as much). Only the ratios matter.',
  adjustment:
    'Each row starts from an equal share. Type + / − tweaks; overall they must cancel (net zero).',
};

function createSheetStyles(palette: ColorPalette) {
  return StyleSheet.create({
    sheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      backgroundColor: palette.surface,
    },
    handle: { width: 40, backgroundColor: palette.opaqueSeparator },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space[5],
      paddingBottom: space[3],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.opaqueSeparator,
    },
    title: { ...type.headline, fontWeight: '600', color: palette.label },
    form: {
      gap: space[4],
      paddingHorizontal: space[5],
      paddingTop: space[4],
    },
    input: {
      paddingHorizontal: space[4],
      paddingVertical: space[3],
      borderRadius: 14,
      backgroundColor: palette.fill,
      color: palette.label,
      fontSize: 17,
    },
    amountHero: {
      fontSize: 34,
      fontWeight: '700',
      fontFamily: sansForWeight('700'),
      letterSpacing: -0.5,
      textAlign: 'center',
      paddingVertical: space[2],
      color: palette.label,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    chip: {
      paddingHorizontal: space[3],
      paddingVertical: space[2],
      borderRadius: 14,
      backgroundColor: palette.fill,
    },
    chipOn: { backgroundColor: palette.tint },
    chipText: { ...type.subheadline, color: palette.label },
    chipTextOn: { color: '#fff' },
    advancedToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: space[3],
      gap: space[3],
    },
    shareInput: {
      width: 88,
      minWidth: 88,
      textAlign: 'right',
      paddingHorizontal: space[3],
      paddingVertical: space[2],
      borderRadius: 14,
      backgroundColor: palette.surface,
      color: palette.label,
      fontSize: 17,
    },
    adjustIntroTitle: {
      ...type.subheadline,
      fontWeight: '600',
      fontFamily: sansForWeight('600'),
      color: palette.label,
    },
    adjustIntroHint: {
      ...type.footnote,
      color: palette.labelSecondary,
      marginTop: space[1],
      lineHeight: 18,
    },
    adjustIntroColumn: {
      flex: 1,
      paddingRight: space[2],
    },
    adjustPanel: {
      gap: space[5],
      paddingHorizontal: space[4],
      paddingVertical: space[5],
      borderRadius: radius.lg,
      backgroundColor: palette.fillSecondary,
    },
    sectionLabel: {
      ...type.subheadline,
      fontWeight: '600',
      fontFamily: sansForWeight('600'),
      color: palette.label,
    },
    splitMethodDescription: {
      ...type.footnote,
      color: palette.labelSecondary,
      lineHeight: 20,
      marginTop: space[2],
    },
    groupedList: {
      borderRadius: radius.md,
      overflow: 'hidden' as const,
      backgroundColor: palette.fill,
    },
    groupedRowInner: {
      paddingHorizontal: space[4],
      paddingVertical: space[4],
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 48,
    },
    groupedRowLabel: {
      ...type.body,
      color: palette.label,
      flex: 1,
      paddingRight: space[3],
    },
    peopleRowLeft: {
      flex: 1,
      minWidth: 0,
      paddingRight: space[2],
      justifyContent: 'center',
    },
    peopleName: {
      ...type.body,
      color: palette.label,
    },
    peopleIncludeChip: {
      flexShrink: 0,
      paddingVertical: space[2],
      paddingHorizontal: space[2],
      minWidth: 76,
      alignItems: 'center',
      justifyContent: 'center',
    },
    peopleValueSlot: {
      width: 88,
      flexShrink: 0,
      alignItems: 'flex-end',
      justifyContent: 'center',
      minHeight: 36,
    },
    peopleValuePlaceholder: {
      ...type.body,
      color: palette.labelTertiary,
      paddingRight: space[3],
      paddingVertical: space[2],
    },
    groupedMeta: {
      ...type.subheadline,
      fontWeight: '500',
      fontFamily: sansForWeight('500'),
      color: palette.labelSecondary,
    },
    groupedMetaOn: {
      color: palette.tint,
    },
    adjustmentRowInner: {
      alignItems: 'center',
      minHeight: 52,
    },
    adjustmentRowLeft: {
      flex: 1,
      minWidth: 0,
      paddingRight: space[3],
      justifyContent: 'center',
      gap: space[1],
    },
    adjustmentFairShareCaption: {
      ...type.caption2,
      color: palette.labelTertiary,
    },
    adjustmentNetStripe: {
      marginTop: space[2],
      paddingVertical: space[3],
      paddingHorizontal: space[4],
      borderRadius: radius.sm,
      backgroundColor: palette.fill,
    },
    adjustmentNetText: {
      ...type.footnote,
      fontWeight: '500',
      fontFamily: sansForWeight('500'),
      color: palette.labelSecondary,
      textAlign: 'center',
    },
    percentageRemainderHint: {
      ...type.footnote,
      color: palette.labelSecondary,
      lineHeight: 18,
    },
  });
}

export const AddExpenseSheet = forwardRef<AddExpenseSheetHandle>(function AddExpenseSheet(_, ref) {
  const palette = useColors();
  const colorScheme = useAppColorScheme();
  const styles = useMemo(() => createSheetStyles(palette), [palette]);
  const keyboardAppearance = colorScheme === 'dark' ? 'dark' : 'light';
  const sheetRef = useRef<BottomSheetModal>(null);
  const { symbol, fmt } = useCurrency();
  const { contentBottomPadding, containerComponent, presentSheet } = useAppBottomSheetLayout();
  const addExpense = useGroupExpenseStore((s) => s.addExpense);
  const updateExpense = useGroupExpenseStore((s) => s.updateExpense);
  const deleteExpense = useGroupExpenseStore((s) => s.deleteExpense);
  const groups = useGroupExpenseStore((s) => s.groups);
  const expenses = useGroupExpenseStore((s) => s.expenses);
  const currencyProfile = useProfileStore((s) => s.currency);

  const convexAddExpense = useMutation(api.splitGroups.addExpense);
  const convexUpdateExpense = useMutation(api.splitGroups.updateExpense);
  const convexDeleteExpense = useMutation(api.splitGroups.deleteExpense);

  const { toast } = useToast();

  const [groupId, setGroupId] = useState<string | null>(null);
  const [expenseId, setExpenseId] = useState<string | undefined>();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidByMemberId, setPaidByMemberId] = useState('');
  const [includedIds, setIncludedIds] = useState<string[]>([]);
  const [splitIndex, setSplitIndex] = useState(0);
  const [shareInputs, setShareInputs] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const group = useMemo(() => groups.find((g) => g.id === groupId), [groups, groupId]);
  const splitMethod = splitMethodFromIndex(splitIndex);

  const resetForGroup = useCallback((g: SplitGroup, existing?: GroupExpense) => {
    const current = getCurrentUserMember(g.members);
    const allIds = g.members.map((m) => m.id);
    setGroupId(g.id);
    setExpenseId(existing?.id);
    setTitle(existing?.title ?? '');
    setAmount(existing ? String(minorToMajor(existing.amountMinor)) : '');
    setPaidByMemberId(existing?.paidByMemberId ?? current?.id ?? g.members[0]?.id ?? '');
    setIncludedIds(existing?.includedMemberIds ?? allIds);
    const method = existing?.splitMethod ?? 'equal';
    setSplitIndex(splitIndexFromMethod(method));
    setShowAdvanced(Boolean(existing && existing.splitMethod !== 'equal'));
    if (existing?.shares && existing.splitMethod !== 'equal') {
      const inputs: Record<string, string> = {};
      const meth = existing.splitMethod;
      for (const s of existing.shares) {
        switch (meth) {
          case 'exact':
            if (s.valueMinor != null) inputs[s.memberId] = String(minorToMajor(s.valueMinor));
            break;
          case 'percentage':
            if (s.percentBps != null) inputs[s.memberId] = String(s.percentBps / 100);
            break;
          case 'shares':
            if (s.shareParts != null) inputs[s.memberId] = String(s.shareParts);
            break;
          case 'adjustment':
            if (s.adjustmentMinor != null) inputs[s.memberId] = String(minorToMajor(s.adjustmentMinor));
            break;
          default:
            break;
        }
      }
      setShareInputs(inputs);
    } else {
      setShareInputs({});
    }
  }, []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    []
  );

  useImperativeHandle(ref, () => ({
    present: (gid, eid) => {
      const g = groups.find((x) => x.id === gid);
      if (!g) return;
      const existing = eid ? expenses.find((e) => e.id === eid) : undefined;
      resetForGroup(g, existing);
      presentSheet(() => sheetRef.current?.present());
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const toggleMember = useCallback((memberId: string) => {
    setIncludedIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  }, []);

  const handleSplitIndexChange = useCallback((ni: number) => {
    setSplitIndex((prev) => {
      if (prev !== ni) {
        setShareInputs({});
      }
      return ni;
    });
  }, []);

  const handleSave = async () => {
    if (!groupId || !group) return;
    const parsed = parseFloat(amount.replace(/,/g, ''));
    if (!title.trim() || !Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert('Missing info', 'Add a description and amount.');
      return;
    }
    if (!isMajorWithinInputCap(parsed)) {
      Alert.alert('Amount too large', AMOUNT_EXCEEDS_MAX_MESSAGE);
      return;
    }

    const amountMinor = amountToMinor(parsed);
    let shares = createDefaultShares(splitMethod, includedIds, amountMinor);

    if (splitMethod === 'exact') {
      for (const memberId of includedIds) {
        const v = Number.parseFloat((shareInputs[memberId] ?? '').replace(/,/g, ''));
        if (!Number.isFinite(v) || !isMajorWithinInputCap(v)) {
          Alert.alert('Amount too large', AMOUNT_EXCEEDS_MAX_MESSAGE);
          return;
        }
      }
      shares = includedIds.map((memberId) => ({
        memberId,
        valueMinor: amountToMinor(parseFloat(shareInputs[memberId] || '0')),
      }));
    }
    if (splitMethod === 'percentage') {
      shares = includedIds.map((memberId) => ({
        memberId,
        percentBps: Math.round(parseFloat(shareInputs[memberId] || '0') * 100),
      }));
    }
    if (splitMethod === 'shares') {
      shares = includedIds.map((memberId) => ({
        memberId,
        shareParts: parseFloat(shareInputs[memberId] ?? '1'),
      }));
    }
    if (splitMethod === 'adjustment') {
      for (const memberId of includedIds) {
        const raw = shareInputs[memberId] ?? '0';
        if (raw === '-') {
          Alert.alert('Invalid adjustment', 'Finish the amount or leave the field blank for zero.');
          return;
        }
        const v = Number.parseFloat(raw.replace(/,/g, ''));
        if (!Number.isFinite(v) || !isMajorWithinInputCap(v)) {
          Alert.alert('Amount too large', AMOUNT_EXCEEDS_MAX_MESSAGE);
          return;
        }
      }
      shares = includedIds.map((memberId) => ({
        memberId,
        adjustmentMinor: amountToMinor(parseFloat(shareInputs[memberId] || '0')),
      }));
    }

    const payload = {
      groupId,
      title,
      amount: parsed,
      paidByMemberId,
      splitMethod,
      includedMemberIds: includedIds,
      shares,
    };

    if (isCloudSplitGroup(group)) {
      try {
        if (expenseId) {
          await convexUpdateExpense({
            expenseId: expenseId as Id<'splitGroupExpenses'>,
            title: payload.title,
            amount: payload.amount,
            paidByMemberId: payload.paidByMemberId,
            splitMethod: payload.splitMethod,
            includedMemberIds: payload.includedMemberIds,
            shares: payload.shares,
          });
          notifySuccess(toast, 'Expense updated');
        } else {
          await convexAddExpense({
            groupId: groupId as Id<'splitGroups'>,
            title: payload.title,
            amount: payload.amount,
            paidByMemberId: payload.paidByMemberId,
            splitMethod: payload.splitMethod,
            includedMemberIds: payload.includedMemberIds,
            shares: payload.shares,
            currency: currencyProfile,
          });
          notifySuccess(toast, 'Expense added');
        }
        sheetRef.current?.dismiss();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Could not save expense.';
        Alert.alert('Could not save', msg);
      }
      return;
    }

    const error = expenseId ? updateExpense(expenseId, payload) : addExpense(payload);
    if (error) {
      Alert.alert('Could not save', error);
      return;
    }
    if (expenseId) {
      notifySuccess(toast, 'Expense updated');
    } else {
      notifySuccess(toast, 'Expense added');
    }
    sheetRef.current?.dismiss();
  };

  const splitSummaryLine = useMemo(() => {
    const n = includedIds.length;
    const peoplePhrase = n === 1 ? '1 person' : `${n} people`;
    switch (splitMethod) {
      case 'equal':
        return `Split equally · ${peoplePhrase}`;
      case 'exact':
        return `Custom amounts · ${peoplePhrase}`;
      case 'percentage':
        return `Percent split · ${peoplePhrase}`;
      case 'shares':
        return `Split by shares · ${peoplePhrase}`;
      case 'adjustment':
        return `Split by adjustment · ${peoplePhrase}`;
      default:
        return `Split equally · ${peoplePhrase}`;
    }
  }, [includedIds.length, splitMethod]);

  const perPersonAccessibilitySuffix =
    splitMethod === 'percentage'
      ? 'Percent owed'
      : splitMethod === 'exact'
        ? 'Amount owed'
        : splitMethod === 'shares'
          ? 'Share weight'
          : splitMethod === 'adjustment'
            ? 'Plus or minus vs even share'
            : '';

  const perPersonPlaceholder =
    splitMethod === 'percentage'
      ? '0'
      : splitMethod === 'shares'
        ? '1'
        : splitMethod === 'adjustment'
          ? '0'
          : splitMethod === 'exact'
            ? `${symbol}`
            : '';

  const perPersonKeyboardType =
    splitMethod === 'adjustment'
      ? ('numbers-and-punctuation' as const)
      : ('decimal-pad' as const);

  const adjustmentFairShareByMember = useMemo(() => {
    if (splitMethod !== 'adjustment' || includedIds.length === 0) {
      return {} as Record<string, string>;
    }
    const parsed = parseFloat(amount.replace(/,/g, ''));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return {} as Record<string, string>;
    }
    const amountMinor = amountToMinor(parsed);
    const equalMap = allocateEqualShares(amountMinor, includedIds);
    const out: Record<string, string> = {};
    for (const id of includedIds) {
      out[id] = fmt(minorToMajor(equalMap.get(id) ?? 0));
    }
    return out;
  }, [splitMethod, includedIds, amount, fmt]);

  const adjustmentNetMinor = useMemo(() => {
    if (splitMethod !== 'adjustment' || includedIds.length === 0) return 0;
    let sum = 0;
    for (const id of includedIds) {
      sum += amountToMinor(parseFloat(shareInputs[id] || '0'));
    }
    return sum;
  }, [splitMethod, includedIds, shareInputs]);

  const percentageRemainderBps = useMemo(() => {
    if (splitMethod !== 'percentage' || includedIds.length === 0) return null;
    let sumBps = 0;
    for (const id of includedIds) {
      const raw = shareInputs[id] ?? '';
      const v = Number.parseFloat(raw.replace(/,/g, ''));
      if (Number.isFinite(v)) sumBps += Math.round(v * 100);
    }
    return 10_000 - sumBps;
  }, [splitMethod, includedIds, shareInputs]);

  if (!group) return null;

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={['88%']}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.sheet}
      containerComponent={containerComponent}
      keyboardBehavior="interactive"
    >
      <HeroUINativeProvider>
        <View style={styles.header}>
          <Text style={styles.title}>{expenseId ? 'Edit expense' : 'Add expense'}</Text>
          <GlassButton size="sm" variant="ghost" onPress={() => sheetRef.current?.dismiss()}>
            <GlassButton.Label>Cancel</GlassButton.Label>
          </GlassButton>
        </View>
        <BottomSheetScrollView
          contentContainerStyle={[styles.form, { paddingBottom: contentBottomPadding }]}
          keyboardShouldPersistTaps="handled"
        >
          <TextField>
            <Label>What was it for?</Label>
            <BottomSheetTextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Dinner, groceries, gas…"
              placeholderTextColor={palette.labelTertiary}
              keyboardAppearance={keyboardAppearance}
            />
          </TextField>

          <TextField>
            <Label>Amount</Label>
            <BottomSheetTextInput
              style={styles.amountHero}
              value={amount}
              onChangeText={(v) => setAmount(sanitizeExpenseMajorInput(v))}
              keyboardType="decimal-pad"
              placeholder={`${symbol}0`}
              placeholderTextColor={palette.labelTertiary}
              keyboardAppearance={keyboardAppearance}
            />
          </TextField>

          <TextField>
            <Label>Paid by</Label>
            <View style={styles.chipRow}>
              {group.members.map((m) => (
                <Pressable
                  key={m.id}
                  style={[styles.chip, paidByMemberId === m.id && styles.chipOn]}
                  onPress={() => setPaidByMemberId(m.id)}
                >
                  <Text
                    style={[styles.chipText, paidByMemberId === m.id && styles.chipTextOn]}
                  >
                    {m.displayName}
                  </Text>
                </Pressable>
              ))}
            </View>
            {!showAdvanced ? (
              <Description>{splitSummaryLine}</Description>
            ) : null}
          </TextField>

          <Pressable
            style={styles.advancedToggle}
            accessibilityRole="button"
            accessibilityState={{ expanded: showAdvanced }}
            onPress={() => setShowAdvanced((v) => !v)}
          >
            <View style={styles.adjustIntroColumn}>
              <Text style={styles.adjustIntroTitle}>Adjust split</Text>
              <Text style={styles.adjustIntroHint}>
                {showAdvanced
                  ? 'Choose how to divide the expense, pick who participates, then enter values.'
                  : 'Equal, fixed amounts, percents, share weights (proportional), or fine-tuning from equal (adjustments).'}
              </Text>
            </View>
            <ChevronDown
              size={20}
              color={palette.labelSecondary}
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={{ transform: [{ rotate: showAdvanced ? '180deg' : '0deg' }] }}
            />
          </Pressable>

          {showAdvanced ? (
            <View style={styles.adjustPanel}>
              <View style={{ gap: space[3] }}>
                <Text style={styles.sectionLabel}>Split method</Text>
                <SegmentedControl
                  variant="inline"
                  options={[...SPLIT_OPTIONS]}
                  selectedIndex={splitIndex}
                  onChange={handleSplitIndexChange}
                />
                <Text
                  style={styles.splitMethodDescription}
                  accessibilityLiveRegion="polite"
                >
                  {SPLIT_METHOD_DESCRIPTIONS[splitMethod]}
                </Text>
              </View>

              <View style={{ gap: space[3] }}>
                {splitMethod === 'percentage' && percentageRemainderBps != null ? (
                  <Text
                    style={[
                      styles.percentageRemainderHint,
                      percentageRemainderBps !== 0 ? { color: palette.warning } : null,
                    ]}
                    accessibilityLiveRegion="polite"
                  >
                    {percentageRemainderBps === 0
                      ? '100% assigned — percentages add up.'
                      : percentageRemainderBps > 0
                        ? `${formatPercentDeltaFromBps(percentageRemainderBps)}% left to reach 100%.`
                        : `${formatPercentDeltaFromBps(-percentageRemainderBps)}% over 100% — reduce some values.`}
                  </Text>
                ) : null}
                <View style={styles.groupedList}>
                  {group.members.map((m, index) => {
                    const on = includedIds.includes(m.id);
                    const evenShareFmt = adjustmentFairShareByMember[m.id];
                    const isAdjustment = splitMethod === 'adjustment';
                    const needsValue = splitMethod !== 'equal';

                    return (
                      <Fragment key={m.id}>
                        {index > 0 ? <ListDivider /> : null}
                        {!needsValue ? (
                          <Pressable
                            onPress={() => toggleMember(m.id)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: on }}
                            accessibilityHint="Toggle whether this person is included in the split."
                          >
                            <View style={styles.groupedRowInner}>
                              <Text style={styles.groupedRowLabel}>{m.displayName}</Text>
                              <Text style={[styles.groupedMeta, on ? styles.groupedMetaOn : null]}>
                                {on ? 'Included' : 'Excluded'}
                              </Text>
                            </View>
                          </Pressable>
                        ) : (
                          <View
                            style={[
                              styles.groupedRowInner,
                              isAdjustment && on ? styles.adjustmentRowInner : null,
                            ]}
                          >
                            <View
                              style={
                                isAdjustment && on ? styles.adjustmentRowLeft : styles.peopleRowLeft
                              }
                            >
                              <Text style={styles.peopleName}>{m.displayName}</Text>
                              {isAdjustment && on ? (
                                <Text style={styles.adjustmentFairShareCaption}>
                                  {evenShareFmt ? `Even · ${evenShareFmt}` : 'Even · —'}
                                </Text>
                              ) : null}
                            </View>
                            <Pressable
                              onPress={() => toggleMember(m.id)}
                              accessibilityRole="button"
                              accessibilityState={{ selected: on }}
                              accessibilityLabel={
                                on
                                  ? `${m.displayName}, included. Double tap to exclude.`
                                  : `${m.displayName}, excluded. Double tap to include.`
                              }
                              style={styles.peopleIncludeChip}
                            >
                              <Text
                                style={[styles.groupedMeta, on ? styles.groupedMetaOn : null]}
                                numberOfLines={1}
                              >
                                {on ? 'Included' : 'Excluded'}
                              </Text>
                            </Pressable>
                            <View style={styles.peopleValueSlot}>
                              {on ? (
                                <BottomSheetTextInput
                                  accessibilityLabel={`${m.displayName}, ${perPersonAccessibilitySuffix}`}
                                  style={styles.shareInput}
                                  value={shareInputs[m.id] ?? ''}
                                  onChangeText={(v) =>
                                    setShareInputs((prev) => ({
                                      ...prev,
                                      [m.id]:
                                        splitMethod === 'adjustment'
                                          ? sanitizeSignedMajorInput(v)
                                          : splitMethod === 'exact'
                                            ? sanitizeExpenseMajorInput(v)
                                            : splitMethod === 'percentage'
                                              ? sanitizePercentMajorInput(v)
                                              : v,
                                    }))
                                  }
                                  keyboardType={perPersonKeyboardType}
                                  placeholder={perPersonPlaceholder}
                                  placeholderTextColor={palette.labelTertiary}
                                  keyboardAppearance={keyboardAppearance}
                                />
                              ) : (
                                <Text
                                  style={styles.peopleValuePlaceholder}
                                  accessibilityElementsHidden
                                  importantForAccessibility="no"
                                >
                                  —
                                </Text>
                              )}
                            </View>
                          </View>
                        )}
                      </Fragment>
                    );
                  })}
                </View>
                {splitMethod === 'adjustment' && includedIds.length > 0 ? (
                  <View style={styles.adjustmentNetStripe} accessibilityLiveRegion="polite">
                    <Text
                      style={[
                        styles.adjustmentNetText,
                        adjustmentNetMinor !== 0 ? { color: palette.warning } : null,
                      ]}
                    >
                      {adjustmentNetMinor === 0
                        ? 'Balanced'
                        : `${adjustmentNetMinor > 0 ? '+' : ''}${fmt(minorToMajor(adjustmentNetMinor))} net`}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          <GlassButton variant="primary" onPress={handleSave}>
            <GlassButton.Label>{expenseId ? 'Save' : 'Add expense'}</GlassButton.Label>
          </GlassButton>

          {expenseId ? (
            <GlassButton
              variant="ghost"
              onPress={() => {
                Alert.alert('Delete expense?', undefined, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                      void (async () => {
                        if (group && isCloudSplitGroup(group)) {
                          try {
                            await convexDeleteExpense({ expenseId: expenseId as Id<'splitGroupExpenses'> });
                            notifySuccess(toast, 'Expense deleted');
                            sheetRef.current?.dismiss();
                          } catch (e: unknown) {
                            const msg = e instanceof Error ? e.message : 'Could not delete.';
                            Alert.alert('Delete failed', msg);
                          }
                          return;
                        }
                        deleteExpense(expenseId);
                        notifySuccess(toast, 'Expense deleted');
                        sheetRef.current?.dismiss();
                      })();
                    },
                  },
                ]);
              }}
            >
              <GlassButton.Label>Delete</GlassButton.Label>
            </GlassButton>
          ) : null}
        </BottomSheetScrollView>
      </HeroUINativeProvider>
    </BottomSheetModal>
  );
});
