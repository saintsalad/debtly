import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Description, HeroUINativeProvider, Label, TextField, useToast } from 'heroui-native';
import { GlassButton } from '@/components/ui/GlassButton';
import {
  getCurrentUserMember,
  getDirectedOutstandingMinor,
  settlementsExistBetweenMembers,
} from '@/features/group-expense/balanceEngine';
import {
  AMOUNT_EXCEEDS_MAX_MESSAGE,
  isMajorWithinInputCap,
  minorToMajor,
  sanitizeExpenseMajorInput,
} from '@/features/debts/money';
import type {
  GroupExpense,
  GroupMember,
  Settlement,
  SplitGroup,
} from '@/features/group-expense/types';
import { isCloudSplitGroup } from '@/features/group-expense/mergeConvexSplitSnapshot';
import { useAppBottomSheetLayout } from '@/lib/appBottomSheet';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useSubmitGuard } from '@/hooks/use-submit-guard';
import { useCurrency } from '@/hooks/useCurrency';
import { notifySuccess } from '@/lib/appToast';
import { sansForWeight } from '@/lib/appFonts';
import { useColors, space, type, type ColorPalette } from '@/lib/platform';
import { useGroupExpenseStore } from '@/stores/groupExpenseStore';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

export interface SettlementPreset {
  fromMemberId?: string;
  toMemberId?: string;
  amountMinor?: number;
}

export interface RecordSettlementSheetHandle {
  present: (groupId: string, preset?: SettlementPreset) => void;
  dismiss: () => void;
}

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
    fieldHint: {
      ...type.footnote,
      color: palette.labelSecondary,
      marginBottom: space[2],
    },
    input: {
      paddingHorizontal: space[4],
      paddingVertical: space[3],
      borderRadius: 14,
      backgroundColor: palette.fill,
      color: palette.label,
      fontSize: 17,
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
    mutedBox: {
      padding: space[4],
      borderRadius: 14,
      backgroundColor: palette.fill,
      gap: space[2],
    },
    mutedLead: {
      ...type.subheadline,
      fontWeight: '600',
      fontFamily: sansForWeight('600'),
      color: palette.label,
    },
    mutedSub: {
      ...type.subheadline,
      color: palette.labelSecondary,
    },
    memberLine: {
      ...type.body,
      color: palette.label,
    },
    outstandingInline: {
      ...type.caption1,
      color: palette.labelSecondary,
    },
    outstandingAmt: {
      fontWeight: '600',
      fontFamily: sansForWeight('600'),
      color: palette.label,
    },
  });
}

function findFirstOutstandingPair(
  group: SplitGroup,
  expenses: GroupExpense[],
  settlements: Settlement[],
  groupId: string
): { fromMemberId: string; toMemberId: string } | null {
  for (const p of group.members) {
    for (const r of group.members) {
      if (p.id === r.id) continue;
      if (getDirectedOutstandingMinor(expenses, settlements, groupId, p.id, r.id) > 0) {
        return { fromMemberId: p.id, toMemberId: r.id };
      }
    }
  }
  return null;
}

export const RecordSettlementSheet = forwardRef<RecordSettlementSheetHandle>(
  function RecordSettlementSheet(_, ref) {
    const palette = useColors();
    const colorScheme = useAppColorScheme();
    const styles = useMemo(() => createSheetStyles(palette), [palette]);
    const keyboardAppearance = colorScheme === 'dark' ? 'dark' : 'light';
    const sheetRef = useRef<BottomSheetModal>(null);
    const { symbol, fmt } = useCurrency();
    const { contentBottomPadding, containerComponent, presentSheet } = useAppBottomSheetLayout();
    const recordSettlement = useGroupExpenseStore((s) => s.recordSettlement);
    const voidRecordedSettlementsWithMember = useGroupExpenseStore(
      (s) => s.voidRecordedSettlementsWithMember
    );
    const groups = useGroupExpenseStore((s) => s.groups);
    const expenses = useGroupExpenseStore((s) => s.expenses);
    const settlements = useGroupExpenseStore((s) => s.settlements);

    const convexRecordSettlement = useMutation(api.splitGroups.recordSettlement);
    const convexVoidSettlements = useMutation(api.splitGroups.voidRecordedSettlementsWithMember);

    const { toast } = useToast();

    const { busy: recordingSettlement, runGuarded } = useSubmitGuard();

    const [groupId, setGroupId] = useState<string | null>(null);
    const [fromMemberId, setFromMemberId] = useState('');
    const [toMemberId, setToMemberId] = useState('');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');

    const group = useMemo(
      () => groups.find((g) => g.id === groupId),
      [groups, groupId]
    );

    const viewerMember = group ? getCurrentUserMember(group.members) : undefined;
    const viewerMemberId = viewerMember?.id;

    const payerOptions = useMemo((): GroupMember[] => {
      if (!group || !groupId) return [];
      return group.members.filter((payer) =>
        group.members.some(
          (recipient) =>
            payer.id !== recipient.id &&
            getDirectedOutstandingMinor(
              expenses,
              settlements,
              groupId,
              payer.id,
              recipient.id
            ) > 0
        )
      );
    }, [group, expenses, settlements, groupId]);

    const recipientOptions = useMemo((): GroupMember[] => {
      if (!group || !groupId || !fromMemberId) return [];
      return group.members.filter(
        (recipient) =>
          recipient.id !== fromMemberId &&
          getDirectedOutstandingMinor(
            expenses,
            settlements,
            groupId,
            fromMemberId,
            recipient.id
          ) > 0
      );
    }, [group, expenses, settlements, groupId, fromMemberId]);

    const directedMinor = useMemo(() => {
      if (!group || !groupId || !fromMemberId || !toMemberId || fromMemberId === toMemberId)
        return 0;
      return getDirectedOutstandingMinor(expenses, settlements, groupId, fromMemberId, toMemberId);
    }, [expenses, settlements, groupId, group, fromMemberId, toMemberId]);

    const hasRecordedPaymentsBetweenPair =
      !!groupId &&
      !!fromMemberId &&
      !!toMemberId &&
      settlementsExistBetweenMembers(settlements, groupId, fromMemberId, toMemberId);

    const viewerParticipates =
      !!viewerMemberId &&
      (fromMemberId === viewerMemberId || toMemberId === viewerMemberId);

    const showRecordFlow = directedMinor > 0;

    const showVoidFlow =
      directedMinor <= 0 &&
      hasRecordedPaymentsBetweenPair &&
      viewerParticipates;

    const showEmptyExplain =
      !showRecordFlow && !showVoidFlow && payerOptions.length === 0;

    /** Keep payer → payee aligned with reality when data changes — except void/mark-unpaid state. */
    useEffect(() => {
      if (!group || !groupId) return;

      const canVoidUi =
        directedMinor <= 0 &&
        hasRecordedPaymentsBetweenPair &&
        !!viewerMemberId &&
        (fromMemberId === viewerMemberId || toMemberId === viewerMemberId);

      if (canVoidUi) return;

      if (directedMinor > 0 && fromMemberId !== toMemberId) return;

      const healed = findFirstOutstandingPair(group, expenses, settlements, groupId);
      if (healed) {
        setFromMemberId((prev) => (prev !== healed.fromMemberId ? healed.fromMemberId : prev));
        setToMemberId((prev) => (prev !== healed.toMemberId ? healed.toMemberId : prev));
        return;
      }

      const current = getCurrentUserMember(group.members) ?? group.members[0];
      const other = group.members.find((m) => m.id !== current?.id);
      if (current && other) {
        setFromMemberId((prev) => (prev !== current.id ? current.id : prev));
        setToMemberId((prev) => (prev !== other.id ? other.id : prev));
      }
    }, [
      group,
      groupId,
      expenses,
      settlements,
      directedMinor,
      hasRecordedPaymentsBetweenPair,
      viewerMemberId,
      fromMemberId,
      toMemberId,
    ]);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} pressBehavior="close" />
      ),
      []
    );

    useImperativeHandle(ref, () => ({
      present: (gid, preset) => {
        const store = useGroupExpenseStore.getState();
        const g = store.groups.find((x) => x.id === gid);
        if (!g) return;
        const ex = store.expenses;
        const st = store.settlements;
        const current = getCurrentUserMember(g.members);

        let from =
          preset?.fromMemberId ?? current?.id ?? g.members[0]?.id ?? '';
        let to =
          preset?.toMemberId ?? g.members.find((m) => m.id !== from)?.id ?? '';

        const capInitial = getDirectedOutstandingMinor(ex, st, gid, from, to);
        const canVoidPair =
          capInitial <= 0 &&
          from !== to &&
          settlementsExistBetweenMembers(st, gid, from, to) &&
          !!current &&
          (from === current.id || to === current.id);

        if (!(capInitial > 0) && !canVoidPair) {
          const healed = findFirstOutstandingPair(g, ex, st, gid);
          if (healed) {
            from = healed.fromMemberId;
            to = healed.toMemberId;
          }
        }

        setGroupId(gid);
        setFromMemberId(from);
        setToMemberId(to);
        setNote('');

        if (preset?.amountMinor != null) {
          setAmount(String(minorToMajor(preset.amountMinor)));
        } else if (
          preset?.fromMemberId &&
          preset?.toMemberId &&
          preset.fromMemberId !== preset.toMemberId
        ) {
          const presetCap = getDirectedOutstandingMinor(
            ex,
            st,
            gid,
            preset.fromMemberId,
            preset.toMemberId
          );
          setAmount(presetCap > 0 ? String(minorToMajor(presetCap)) : '');
        } else {
          const c = getDirectedOutstandingMinor(ex, st, gid, from, to);
          setAmount(c > 0 ? String(minorToMajor(c)) : '');
        }

        presentSheet(() => sheetRef.current?.present());
      },
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    const memberLabel = useCallback(
      (id: string) => group?.members.find((m) => m.id === id)?.displayName ?? 'Member',
      [group?.members]
    );

    const selectPayerAndFixRecipient = (id: string) => {
      setFromMemberId(id);
      if (!group) return;
      const nextRecipients = group.members.filter(
        (recipient) =>
          recipient.id !== id &&
          getDirectedOutstandingMinor(
            expenses,
            settlements,
            group.id,
            id,
            recipient.id
          ) > 0
      );
      setToMemberId((prev) => (nextRecipients.some((r) => r.id === prev) ? prev : nextRecipients[0]?.id ?? ''));
    };

    const submitSettlement = async () => {
      if (!groupId || !showRecordFlow || !group) return;
      const parsed = parseFloat(amount.replace(/,/g, ''));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        Alert.alert('Amount required', 'Enter how much was paid.');
        return;
      }
      if (!isMajorWithinInputCap(parsed)) {
        Alert.alert('Amount too large', AMOUNT_EXCEEDS_MAX_MESSAGE);
        return;
      }

      if (isCloudSplitGroup(group)) {
        try {
          await convexRecordSettlement({
            groupId: groupId as Id<'splitGroups'>,
            fromMemberId,
            toMemberId,
            amount: parsed,
            note: note.trim() || undefined,
          });
          notifySuccess(toast, 'Settlement recorded');
          sheetRef.current?.dismiss();
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Could not record settlement.';
          Alert.alert('Could not record', msg);
        }
        return;
      }

      const error = recordSettlement({
        groupId,
        fromMemberId,
        toMemberId,
        amount: parsed,
        note,
      });
      if (error) {
        Alert.alert('Could not record', error);
        return;
      }
      notifySuccess(toast, 'Settlement recorded');
      sheetRef.current?.dismiss();
    };

    const handleSaveSettlement = () => void runGuarded(submitSettlement);

    const handleMarkUnpaid = () => {
      if (!groupId || !viewerMember || !showVoidFlow || !group) return;
      const otherId = fromMemberId === viewerMember.id ? toMemberId : fromMemberId;

      Alert.alert(
        'Mark as unpaid?',
        'This removes the recorded settlements between you and this person.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Mark as unpaid',
            style: 'destructive',
            onPress: () => {
              void (async () => {
                if (isCloudSplitGroup(group)) {
                  try {
                    await convexVoidSettlements({
                      groupId: groupId as Id<'splitGroups'>,
                      viewerMemberId: viewerMember!.id,
                      otherMemberId: otherId,
                    });
                    notifySuccess(
                      toast,
                      'Marked as unpaid',
                      'Recorded payments between you two were undone.'
                    );
                    sheetRef.current?.dismiss();
                  } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : 'Could not update.';
                    Alert.alert('Could not update', msg);
                  }
                  return;
                }
                voidRecordedSettlementsWithMember(groupId, viewerMember!.id, otherId);
                notifySuccess(toast, 'Marked as unpaid', 'Recorded payments between you two were undone.');
                sheetRef.current?.dismiss();
              })();
            },
          },
        ]
      );
    };

    const chipRow = (
      label: string,
      helper: string | undefined,
      candidates: GroupMember[],
      selected: string,
      onSelect: (id: string) => void
    ) => (
      <TextField>
        <Label>{label}</Label>
        {helper ? <Text style={styles.fieldHint}>{helper}</Text> : null}
        <View style={styles.chipRow}>
          {candidates.map((m) => (
            <Pressable
              key={m.id}
              style={[styles.chip, selected === m.id && styles.chipOn]}
              onPress={() => onSelect(m.id)}
            >
              <Text style={[styles.chipText, selected === m.id && styles.chipTextOn]}>
                {m.displayName}
              </Text>
            </Pressable>
          ))}
        </View>
        {candidates.length === 0 ? (
          <Description>No one qualifies for this group state yet.</Description>
        ) : null}
      </TextField>
    );

    if (!group) return null;

    return (
      <BottomSheetModal
        ref={sheetRef}
        enableDynamicSizing
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.sheet}
        containerComponent={containerComponent}
        keyboardBehavior="interactive"
      >
        <HeroUINativeProvider>
          <View style={styles.header}>
            <Text style={styles.title}>Settle up</Text>
            <GlassButton size="sm" variant="ghost" onPress={() => sheetRef.current?.dismiss()}>
              <GlassButton.Label>Cancel</GlassButton.Label>
            </GlassButton>
          </View>
          <BottomSheetScrollView
            contentContainerStyle={[styles.form, { paddingBottom: contentBottomPadding }]}
            keyboardShouldPersistTaps="handled"
          >
            {showRecordFlow ? (
              <>
                {chipRow(
                  'Who paid?',
                  'Only people who still owe someone in this group (direct ledger).',
                  payerOptions,
                  fromMemberId,
                  selectPayerAndFixRecipient
                )}
                {chipRow(
                  'Paid to',
                  `${memberLabel(fromMemberId)} can only settle with members they owe directly.`,
                  recipientOptions,
                  toMemberId,
                  setToMemberId
                )}
                <TextField>
                  <Label>Amount</Label>
                  <BottomSheetTextInput
                    style={styles.input}
                    value={amount}
                    onChangeText={(v) => setAmount(sanitizeExpenseMajorInput(v))}
                    keyboardType="decimal-pad"
                    placeholder={`${symbol}0.00`}
                    placeholderTextColor={palette.labelTertiary}
                    keyboardAppearance={keyboardAppearance}
                  />
                  <Text style={styles.outstandingInline}>
                    Outstanding{' '}
                    <Text style={styles.outstandingAmt}>{fmt(minorToMajor(directedMinor))}</Text>
                    {' — '}partial OK.
                  </Text>
                </TextField>
                <TextField>
                  <Label>Note (optional)</Label>
                  <BottomSheetTextInput
                    style={styles.input}
                    value={note}
                    onChangeText={setNote}
                    placeholder="Cash, bank transfer…"
                    placeholderTextColor={palette.labelTertiary}
                    keyboardAppearance={keyboardAppearance}
                  />
                </TextField>
                <GlassButton
                  variant="primary"
                  onPress={handleSaveSettlement}
                  isDisabled={recordingSettlement}
                >
                  <GlassButton.Label>
                    {recordingSettlement ? 'Recording…' : 'Record settlement'}
                  </GlassButton.Label>
                </GlassButton>
              </>
            ) : null}

            {showVoidFlow ? (
              <>
                <View style={styles.mutedBox}>
                  <Text style={styles.mutedLead}>Balanced • recorded payments on file</Text>
                  <Text style={styles.mutedSub}>
                    Nothing is left owed from {memberLabel(fromMemberId)} to {memberLabel(toMemberId)} for this bill
                    split, but settlements between you two are still in the activity log.
                  </Text>
                  <Text style={styles.memberLine}>{memberLabel(fromMemberId)}</Text>
                  <Text style={[styles.memberLine, { opacity: 0.75 }]}>↓ settled ↓</Text>
                  <Text style={styles.memberLine}>{memberLabel(toMemberId)}</Text>
                </View>
                <GlassButton variant="secondary" onPress={handleMarkUnpaid}>
                  <GlassButton.Label>Mark as unpaid</GlassButton.Label>
                </GlassButton>
              </>
            ) : null}

            {showEmptyExplain ? (
              <TextField>
                <Label>No direct balance to settle</Label>
                <Description>
                  No one currently owes anyone on a straight payer → payee arrow. Add or adjust expenses, or reopen a
                  balance from the balances list — then settling will match that edge.
                </Description>
              </TextField>
            ) : null}
          </BottomSheetScrollView>
        </HeroUINativeProvider>
      </BottomSheetModal>
    );
  }
);
