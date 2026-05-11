import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable, ScrollView, Alert,
} from 'react-native';
import { BottomSheet, BottomSheetHandle } from '@/components/ui/BottomSheet';
import { useDebtStore } from '@/stores/debtStore';
import { DebtType } from '@/features/debts/types';
import { colors, type, space, radius } from '@/lib/platform';
import { useCurrency } from '@/hooks/useCurrency';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export interface AddDebtSheetHandle {
  present: () => void;
  dismiss: () => void;
}

export const AddDebtSheet = forwardRef<AddDebtSheetHandle>((_, ref) => {
  const sheetRef = useRef<BottomSheetHandle>(null);
  const { addDebt } = useDebtStore();
  const { symbol } = useCurrency();

  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [debtType, setDebtType] = useState<DebtType>('owed_to_me');
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState('');

  useImperativeHandle(ref, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const reset = () => {
    setPersonName(''); setAmount(''); setDebtType('owed_to_me'); setNote(''); setDueDate('');
  };

  const handleSubmit = () => {
    if (!personName.trim()) { Alert.alert('Name required', 'Enter the person\'s name.'); return; }
    const parsed = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (!parsed || parsed <= 0) { Alert.alert('Invalid amount', 'Enter an amount greater than 0.'); return; }

    let dueDateISO: string | undefined;
    if (dueDate.trim()) {
      const d = new Date(dueDate);
      if (isNaN(d.getTime())) { Alert.alert('Invalid date', 'Use MM/DD/YYYY format.'); return; }
      dueDateISO = d.toISOString();
    }

    addDebt({ personName: personName.trim(), amount: parsed, type: debtType, note: note.trim() || undefined, dueDate: dueDateISO });
    reset();
    sheetRef.current?.dismiss();
  };

  const handleClose = () => { reset(); sheetRef.current?.dismiss(); };

  return (
    <BottomSheet ref={sheetRef}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleClose} style={styles.cancelBtn} hitSlop={10}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.title}>New Debt</Text>
        <Pressable onPress={handleSubmit} style={styles.doneBtn} hitSlop={10}>
          <Text style={styles.doneText}>Save</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Type Picker — shown first so context is clear */}
        <View style={styles.typeRow}>
          <Pressable
            style={[styles.typeBtn, debtType === 'owed_to_me' && styles.typeBtnActive]}
            onPress={() => setDebtType('owed_to_me')}
          >
            <MaterialIcons
              name="arrow-downward"
              size={18}
              color={debtType === 'owed_to_me' ? colors.positive : colors.labelSecondary}
            />
            <Text style={[styles.typeBtnLabel, debtType === 'owed_to_me' && { color: colors.positive }]}>
              Owes Me
            </Text>
          </Pressable>
          <Pressable
            style={[styles.typeBtn, debtType === 'i_owe' && styles.typeBtnActive]}
            onPress={() => setDebtType('i_owe')}
          >
            <MaterialIcons
              name="arrow-upward"
              size={18}
              color={debtType === 'i_owe' ? colors.negative : colors.labelSecondary}
            />
            <Text style={[styles.typeBtnLabel, debtType === 'i_owe' && { color: colors.negative }]}>
              I Owe
            </Text>
          </Pressable>
        </View>

        {/* Person */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Person</Text>
          <TextInput
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor={colors.placeholder}
            value={personName}
            onChangeText={setPersonName}
            returnKeyType="next"
            autoCapitalize="words"
          />
        </View>

        {/* Amount */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Amount</Text>
          <View style={styles.amountWrap}>
            <Text style={styles.currencySymbol}>{symbol}</Text>
            <TextInput
              style={[styles.input, styles.amountInput]}
              placeholder="0.00"
              placeholderTextColor={colors.placeholder}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Note */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Note  <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="What's it for?"
            placeholderTextColor={colors.placeholder}
            value={note}
            onChangeText={setNote}
            returnKeyType="next"
          />
        </View>

        {/* Due Date */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Due date  <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="MM/DD/YYYY"
            placeholderTextColor={colors.placeholder}
            value={dueDate}
            onChangeText={setDueDate}
            keyboardType="numbers-and-punctuation"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
        </View>
      </ScrollView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[5],
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.opaqueSeparator,
  },
  title: { ...type.headline, color: colors.label },
  cancelBtn: { minWidth: 52 },
  cancelText: { ...type.callout, color: colors.labelSecondary },
  doneBtn: { minWidth: 52, alignItems: 'flex-end' },
  doneText: { ...type.callout, color: colors.tint, fontWeight: '600' },
  form: {
    paddingHorizontal: space[5],
    paddingTop: space[4],
    paddingBottom: space[12],
    gap: 0,
  },
  typeRow: {
    flexDirection: 'row',
    gap: space[3],
    marginBottom: space[5],
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    paddingVertical: 13,
    borderRadius: radius.card,
    backgroundColor: colors.fill,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  typeBtnActive: {
    backgroundColor: colors.surface,
    borderColor: colors.opaqueSeparator,
  },
  typeBtnLabel: {
    ...type.subheadline,
    fontWeight: '500',
    color: colors.labelSecondary,
  },
  fieldGroup: { marginBottom: space[4] },
  fieldLabel: {
    ...type.footnote,
    color: colors.labelSecondary,
    marginBottom: space[1] + 2,
  },
  optional: { color: colors.labelTertiary },
  input: {
    ...type.body,
    color: colors.label,
    backgroundColor: colors.fill,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    paddingVertical: 13,
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.fill,
    borderRadius: radius.md,
    paddingLeft: space[4],
  },
  currencySymbol: {
    ...type.body,
    color: colors.labelSecondary,
    fontWeight: '500',
  },
  amountInput: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingLeft: space[1],
    paddingRight: space[4],
  },
});
