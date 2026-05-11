import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { BottomSheet, BottomSheetHandle } from '@/components/ui/BottomSheet';
import { useDebtStore } from '@/stores/debtStore';
import { DebtType } from '@/features/debts/types';

export interface AddDebtSheetHandle {
  present: () => void;
  dismiss: () => void;
}

export const AddDebtSheet = forwardRef<AddDebtSheetHandle>((_, ref) => {
  const sheetRef = useRef<BottomSheetHandle>(null);
  const { addDebt } = useDebtStore();

  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<DebtType>('owed_to_me');
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState('');

  useImperativeHandle(ref, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const reset = () => {
    setPersonName('');
    setAmount('');
    setType('owed_to_me');
    setNote('');
    setDueDate('');
  };

  const handleSubmit = () => {
    if (!personName.trim()) {
      Alert.alert('Missing info', 'Please enter a person name.');
      return;
    }
    const parsed = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (!parsed || parsed <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount greater than 0.');
      return;
    }

    let dueDateISO: string | undefined;
    if (dueDate.trim()) {
      const d = new Date(dueDate);
      if (isNaN(d.getTime())) {
        Alert.alert('Invalid date', 'Use format MM/DD/YYYY.');
        return;
      }
      dueDateISO = d.toISOString();
    }

    addDebt({
      personName: personName.trim(),
      amount: parsed,
      type,
      note: note.trim() || undefined,
      dueDate: dueDateISO,
    });

    reset();
    sheetRef.current?.dismiss();
  };

  const handleClose = () => {
    reset();
    sheetRef.current?.dismiss();
  };

  return (
    <BottomSheet ref={sheetRef}>
      <View style={styles.header}>
        <Text style={styles.title}>Add Debt</Text>
        <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={8}>
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.label}>Who?</Text>
        <TextInput
          style={styles.input}
          placeholder="Person's name"
          placeholderTextColor="#C4C4C4"
          value={personName}
          onChangeText={setPersonName}
          returnKeyType="next"
          autoCapitalize="words"
        />

        <Text style={styles.label}>Amount</Text>
        <View style={styles.amountRow}>
          <Text style={styles.currency}>$</Text>
          <TextInput
            style={[styles.input, styles.amountInput]}
            placeholder="0.00"
            placeholderTextColor="#C4C4C4"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            returnKeyType="next"
          />
        </View>

        <Text style={styles.label}>Type</Text>
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'owed_to_me' && styles.typeBtnGreen]}
            onPress={() => setType('owed_to_me')}
            activeOpacity={0.7}
          >
            <Text style={[styles.typeBtnText, type === 'owed_to_me' && styles.typeBtnTextGreen]}>
              💰 Owes Me
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'i_owe' && styles.typeBtnRed]}
            onPress={() => setType('i_owe')}
            activeOpacity={0.7}
          >
            <Text style={[styles.typeBtnText, type === 'i_owe' && styles.typeBtnTextRed]}>
              💸 I Owe
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Note (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="What's it for?"
          placeholderTextColor="#C4C4C4"
          value={note}
          onChangeText={setNote}
          returnKeyType="next"
        />

        <Text style={styles.label}>Due Date (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="MM/DD/YYYY"
          placeholderTextColor="#C4C4C4"
          value={dueDate}
          onChangeText={setDueDate}
          keyboardType="numbers-and-punctuation"
          returnKeyType="done"
        />

        <Pressable style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitText}>Save Debt</Text>
        </Pressable>
      </ScrollView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: { fontSize: 13, color: '#6B7280' },
  scroll: { flex: 1 },
  form: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40, gap: 6 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    paddingLeft: 16,
  },
  currency: { fontSize: 16, color: '#6B7280', fontWeight: '600' },
  amountInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingLeft: 4,
  },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  typeBtnGreen: { backgroundColor: '#F0FDF4', borderColor: '#16A34A' },
  typeBtnRed: { backgroundColor: '#FEF2F2', borderColor: '#DC2626' },
  typeBtnText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  typeBtnTextGreen: { color: '#16A34A' },
  typeBtnTextRed: { color: '#DC2626' },
  submitBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
