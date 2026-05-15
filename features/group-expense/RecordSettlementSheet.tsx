import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Description, HeroUINativeProvider, Label, TextField } from 'heroui-native';
import { GlassButton } from '@/components/ui/GlassButton';
import { getCurrentUserMember } from '@/features/group-expense/balanceEngine';
import { minorToMajor } from '@/features/debts/money';
import type { SplitGroup } from '@/features/group-expense/types';
import { useAppBottomSheetLayout } from '@/lib/appBottomSheet';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useCurrency } from '@/hooks/useCurrency';
import { useColors, space, type, type ColorPalette } from '@/lib/platform';
import { useGroupExpenseStore } from '@/stores/groupExpenseStore';

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
  });
}

export const RecordSettlementSheet = forwardRef<RecordSettlementSheetHandle>(
  function RecordSettlementSheet(_, ref) {
    const palette = useColors();
    const colorScheme = useAppColorScheme();
    const styles = useMemo(() => createSheetStyles(palette), [palette]);
    const keyboardAppearance = colorScheme === 'dark' ? 'dark' : 'light';
    const sheetRef = useRef<BottomSheetModal>(null);
    const { symbol } = useCurrency();
    const { contentBottomPadding, containerComponent, presentSheet } = useAppBottomSheetLayout();
    const recordSettlement = useGroupExpenseStore((s) => s.recordSettlement);
    const groups = useGroupExpenseStore((s) => s.groups);

    const [groupId, setGroupId] = useState<string | null>(null);
    const [fromMemberId, setFromMemberId] = useState('');
    const [toMemberId, setToMemberId] = useState('');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');

    const group = useMemo(
      () => groups.find((g) => g.id === groupId),
      [groups, groupId]
    );

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} pressBehavior="close" />
      ),
      []
    );

    useImperativeHandle(ref, () => ({
      present: (gid, preset) => {
        const g = groups.find((x) => x.id === gid);
        if (!g) return;
        const current = getCurrentUserMember(g.members);
        setGroupId(gid);
        setFromMemberId(
          preset?.fromMemberId ?? current?.id ?? g.members[0]?.id ?? ''
        );
        setToMemberId(
          preset?.toMemberId ?? g.members.find((m) => !m.isCurrentUser)?.id ?? ''
        );
        setAmount(
          preset?.amountMinor != null ? String(minorToMajor(preset.amountMinor)) : ''
        );
        setNote('');
        presentSheet(() => sheetRef.current?.present());
      },
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    const handleSave = () => {
      if (!groupId) return;
      const parsed = parseFloat(amount.replace(/,/g, ''));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        Alert.alert('Amount required', 'Enter how much was paid.');
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
      sheetRef.current?.dismiss();
    };

    const chips = (selected: string, onSelect: (id: string) => void, g: SplitGroup) => (
      <View style={styles.chipRow}>
        {g.members.map((m) => (
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
            <TextField>
              <Label>Who paid?</Label>
              {chips(fromMemberId, setFromMemberId, group)}
            </TextField>
            <TextField>
              <Label>Paid to</Label>
              {chips(toMemberId, setToMemberId, group)}
            </TextField>
            <TextField>
              <Label>Amount</Label>
              <BottomSheetTextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder={`${symbol}0.00`}
                placeholderTextColor={palette.labelTertiary}
                keyboardAppearance={keyboardAppearance}
              />
              <Description>Partial payments are supported.</Description>
            </TextField>
            <GlassButton variant="primary" onPress={handleSave}>
              <GlassButton.Label>Record settlement</GlassButton.Label>
            </GlassButton>
          </BottomSheetScrollView>
        </HeroUINativeProvider>
      </BottomSheetModal>
    );
  }
);
