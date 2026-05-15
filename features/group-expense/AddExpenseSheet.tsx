import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { ChevronDown } from 'lucide-react-native';
import { Description, HeroUINativeProvider, Label, TextField } from 'heroui-native';
import { GlassButton } from '@/components/ui/GlassButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import {
  amountToMinor,
  createDefaultShares,
  getCurrentUserMember,
} from '@/features/group-expense/balanceEngine';
import type { GroupExpense, SplitGroup, SplitMethod } from '@/features/group-expense/types';
import { useAppBottomSheetLayout } from '@/lib/appBottomSheet';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useCurrency } from '@/hooks/useCurrency';
import { minorToMajor } from '@/features/debts/money';
import { useColors, space, type, type ColorPalette } from '@/lib/platform';
import { useGroupExpenseStore } from '@/stores/groupExpenseStore';

export interface AddExpenseSheetHandle {
  present: (groupId: string, expenseId?: string) => void;
  dismiss: () => void;
}

const SPLIT_OPTIONS = ['Equal', 'Custom', '%'];

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
      paddingVertical: space[2],
    },
    advancedLabel: {
      ...type.subheadline,
      fontWeight: '500',
      color: palette.label,
    },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: space[2],
    },
    shareInput: {
      width: 72,
      textAlign: 'right',
      paddingHorizontal: space[2],
      paddingVertical: space[1],
      borderRadius: 8,
      backgroundColor: palette.fill,
      color: palette.label,
    },
  });
}

export const AddExpenseSheet = forwardRef<AddExpenseSheetHandle>(function AddExpenseSheet(_, ref) {
  const palette = useColors();
  const colorScheme = useAppColorScheme();
  const styles = useMemo(() => createSheetStyles(palette), [palette]);
  const keyboardAppearance = colorScheme === 'dark' ? 'dark' : 'light';
  const sheetRef = useRef<BottomSheetModal>(null);
  const { symbol } = useCurrency();
  const { contentBottomPadding, containerComponent, presentSheet } = useAppBottomSheetLayout();
  const addExpense = useGroupExpenseStore((s) => s.addExpense);
  const updateExpense = useGroupExpenseStore((s) => s.updateExpense);
  const deleteExpense = useGroupExpenseStore((s) => s.deleteExpense);
  const groups = useGroupExpenseStore((s) => s.groups);
  const expenses = useGroupExpenseStore((s) => s.expenses);

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
  const splitMethod: SplitMethod =
    splitIndex === 1 ? 'exact' : splitIndex === 2 ? 'percentage' : 'equal';

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
    setSplitIndex(method === 'exact' ? 1 : method === 'percentage' ? 2 : 0);
    setShowAdvanced(Boolean(existing && existing.splitMethod !== 'equal'));
    if (existing?.shares) {
      const inputs: Record<string, string> = {};
      for (const s of existing.shares) {
        if (s.valueMinor != null) inputs[s.memberId] = String(minorToMajor(s.valueMinor));
        if (s.percentBps != null) inputs[s.memberId] = String(s.percentBps / 100);
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

  const toggleMember = (memberId: string) => {
    setIncludedIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleSave = () => {
    if (!groupId || !group) return;
    const parsed = parseFloat(amount.replace(/,/g, ''));
    if (!title.trim() || !Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert('Missing info', 'Add a description and amount.');
      return;
    }

    const amountMinor = amountToMinor(parsed);
    let shares = createDefaultShares(splitMethod, includedIds, amountMinor);

    if (splitMethod === 'exact') {
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

    const payload = {
      groupId,
      title,
      amount: parsed,
      paidByMemberId,
      splitMethod,
      includedMemberIds: includedIds,
      shares,
    };

    const error = expenseId ? updateExpense(expenseId, payload) : addExpense(payload);
    if (error) {
      Alert.alert('Could not save', error);
      return;
    }
    sheetRef.current?.dismiss();
  };

  if (!group) return null;

  const splitSummary = `Split equally · ${includedIds.length} people`;

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
              onChangeText={setAmount}
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
              <Description>{splitSummary}</Description>
            ) : null}
          </TextField>

          <Pressable
            style={styles.advancedToggle}
            onPress={() => setShowAdvanced((v) => !v)}
          >
            <Text style={styles.advancedLabel}>Adjust split</Text>
            <ChevronDown
              size={18}
              color={palette.labelSecondary}
              style={{ transform: [{ rotate: showAdvanced ? '180deg' : '0deg' }] }}
            />
          </Pressable>

          {showAdvanced ? (
            <>
              <SegmentedControl
                options={SPLIT_OPTIONS}
                selectedIndex={splitIndex}
                onChange={setSplitIndex}
              />
              <TextField>
                <Label>Split with</Label>
                {group.members.map((m) => {
                  const on = includedIds.includes(m.id);
                  return (
                    <Pressable
                      key={m.id}
                      style={styles.memberRow}
                      onPress={() => toggleMember(m.id)}
                    >
                      <Text style={styles.chipText}>{m.displayName}</Text>
                      <Text style={[styles.chipText, on && { color: palette.tint }]}>
                        {on ? 'Included' : 'Excluded'}
                      </Text>
                    </Pressable>
                  );
                })}
              </TextField>
              {splitMethod !== 'equal'
                ? includedIds.map((memberId) => {
                    const member = group.members.find((m) => m.id === memberId);
                    return (
                      <View key={memberId} style={styles.memberRow}>
                        <Text style={styles.chipText}>{member?.displayName}</Text>
                        <BottomSheetTextInput
                          style={styles.shareInput}
                          value={shareInputs[memberId] ?? ''}
                          onChangeText={(v) =>
                            setShareInputs((prev) => ({ ...prev, [memberId]: v }))
                          }
                          keyboardType="decimal-pad"
                          placeholder={splitMethod === 'percentage' ? '%' : symbol}
                          placeholderTextColor={palette.labelTertiary}
                          keyboardAppearance={keyboardAppearance}
                        />
                      </View>
                    );
                  })
                : null}
            </>
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
                      deleteExpense(expenseId);
                      sheetRef.current?.dismiss();
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
