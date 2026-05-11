import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Description, HeroUINativeProvider, Label, TextField, useThemeColor } from 'heroui-native';
import { useDebtStore } from '@/stores/debtStore';
import { DebtType } from '@/features/debts/types';
import { colors } from '@/lib/platform';
import { useCurrency } from '@/hooks/useCurrency';

export interface AddDebtSheetHandle {
  present: () => void;
  dismiss: () => void;
}

interface AddDebtFormProps {
  debtType: DebtType;
  setDebtType: (type: DebtType) => void;
  personName: string;
  setPersonName: (value: string) => void;
  amount: string;
  setAmount: (value: string) => void;
  note: string;
  setNote: (value: string) => void;
  dueDate: string;
  setDueDate: (value: string) => void;
  onSubmit: () => void;
}

function AddDebtForm({
  debtType,
  setDebtType,
  personName,
  setPersonName,
  amount,
  setAmount,
  note,
  setNote,
  dueDate,
  setDueDate,
  onSubmit,
}: AddDebtFormProps) {
  const { symbol } = useCurrency();
  const accentForeground = useThemeColor('accent-foreground');

  return (
    <BottomSheetScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.formContent}
    >
      <View style={styles.typeRow}>
        <Button
          variant={debtType === 'owed_to_me' ? 'primary' : 'secondary'}
          className="flex-1"
          onPress={() => setDebtType('owed_to_me')}
        >
          <MaterialIcons
            name="arrow-downward"
            size={18}
            color={debtType === 'owed_to_me' ? accentForeground : colors.positive}
          />
          <Button.Label>Owes Me</Button.Label>
        </Button>
        <Button
          variant={debtType === 'i_owe' ? 'primary' : 'secondary'}
          className="flex-1"
          onPress={() => setDebtType('i_owe')}
        >
          <MaterialIcons
            name="arrow-upward"
            size={18}
            color={debtType === 'i_owe' ? accentForeground : colors.negative}
          />
          <Button.Label>I Owe</Button.Label>
        </Button>
      </View>

      <TextField isRequired>
        <Label>Person</Label>
        <BottomSheetTextInput
          style={styles.input}
          placeholder="Full name"
          placeholderTextColor={colors.placeholder}
          value={personName}
          onChangeText={setPersonName}
          returnKeyType="next"
          autoCapitalize="words"
        />
      </TextField>

      <TextField isRequired>
        <Label>Amount</Label>
        <View style={styles.amountRow}>
          <Text style={styles.currencySymbol}>{symbol}</Text>
          <BottomSheetTextInput
            style={[styles.input, styles.amountInput]}
            placeholder="0.00"
            placeholderTextColor={colors.placeholder}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            returnKeyType="next"
          />
        </View>
      </TextField>

      <TextField>
        <Label>Note</Label>
        <BottomSheetTextInput
          style={styles.input}
          placeholder="What's it for?"
          placeholderTextColor={colors.placeholder}
          value={note}
          onChangeText={setNote}
          returnKeyType="next"
        />
        <Description>Optional</Description>
      </TextField>

      <TextField>
        <Label>Due date</Label>
        <BottomSheetTextInput
          style={styles.input}
          placeholder="MM/DD/YYYY"
          placeholderTextColor={colors.placeholder}
          value={dueDate}
          onChangeText={setDueDate}
          keyboardType="numbers-and-punctuation"
          returnKeyType="done"
          onSubmitEditing={onSubmit}
        />
        <Description>Optional</Description>
      </TextField>
    </BottomSheetScrollView>
  );
}

export const AddDebtSheet = forwardRef<AddDebtSheetHandle>((_, ref) => {
  const { addDebt } = useDebtStore();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['55%', '92%'], []);

  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [debtType, setDebtType] = useState<DebtType>('owed_to_me');
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState('');

  const reset = () => {
    setPersonName('');
    setAmount('');
    setDebtType('owed_to_me');
    setNote('');
    setDueDate('');
  };

  useImperativeHandle(ref, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const close = () => {
    sheetRef.current?.dismiss();
    reset();
  };

  const handleSubmit = () => {
    if (!personName.trim()) {
      Alert.alert('Name required', "Enter the person's name.");
      return;
    }

    const parsed = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (!parsed || parsed <= 0) {
      Alert.alert('Invalid amount', 'Enter an amount greater than 0.');
      return;
    }

    let dueDateISO: string | undefined;
    if (dueDate.trim()) {
      const d = new Date(dueDate);
      if (isNaN(d.getTime())) {
        Alert.alert('Invalid date', 'Use MM/DD/YYYY format.');
        return;
      }
      dueDateISO = d.toISOString();
    }

    addDebt({
      personName: personName.trim(),
      amount: parsed,
      type: debtType,
      note: note.trim() || undefined,
      dueDate: dueDateISO,
    });
    close();
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      enableBlurKeyboardOnGesture
      android_keyboardInputMode="adjustResize"
      backdropComponent={renderBackdrop}
      onDismiss={reset}
      topInset={insets.top}
      bottomInset={insets.bottom}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.sheet}
    >
      <HeroUINativeProvider>
        <BottomSheetView style={styles.contentContainer}>
          <View style={styles.header}>
            <Button variant="ghost" size="sm" onPress={close}>
              <Button.Label>Cancel</Button.Label>
            </Button>
            <Text style={styles.title}>New Debt</Text>
            <Button variant="primary" size="sm" onPress={handleSubmit}>
              <Button.Label>Save</Button.Label>
            </Button>
          </View>

          <AddDebtForm
            debtType={debtType}
            setDebtType={setDebtType}
            personName={personName}
            setPersonName={setPersonName}
            amount={amount}
            setAmount={setAmount}
            note={note}
            setNote={setNote}
            dueDate={dueDate}
            setDueDate={setDueDate}
            onSubmit={handleSubmit}
          />
        </BottomSheetView>
      </HeroUINativeProvider>
    </BottomSheetModal>
  );
});

AddDebtSheet.displayName = 'AddDebtSheet';

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.surface,
  },
  handle: {
    width: 40,
    backgroundColor: colors.opaqueSeparator,
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.opaqueSeparator,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.label,
  },
  formContent: {
    flexGrow: 1,
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  amountRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    position: 'absolute',
    left: 14,
    fontSize: 15,
    color: colors.labelSecondary,
    zIndex: 1,
  },
  input: {
    alignSelf: 'stretch',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.fill,
    color: colors.label,
    fontSize: 17,
  },
  amountInput: {
    flex: 1,
    paddingLeft: 32,
  },
});
