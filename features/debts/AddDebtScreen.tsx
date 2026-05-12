import React, { useMemo, useState } from 'react';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ArrowDown, ArrowUp, Check, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Description, HeroUINativeProvider, Label, TextField, useThemeColor } from 'heroui-native';
import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import { useDebtStore } from '@/stores/debtStore';
import { DebtType } from '@/features/debts/types';
import { useColors, type ColorPalette } from '@/lib/platform';
import { useCurrency } from '@/hooks/useCurrency';
import { IosDatePicker } from '@/components/ui/ios-datepicker';

interface AddDebtScreenProps {
  onClose: () => void;
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
  dueDate?: Date;
  setDueDate: (value?: Date) => void;
  palette: ColorPalette;
  styles: ReturnType<typeof createStyles>;
  keyboardAppearance: 'light' | 'dark';
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
  palette,
  styles,
  keyboardAppearance,
}: AddDebtFormProps) {
  const { symbol } = useCurrency();
  const accentForeground = useThemeColor('accent-foreground');

  return (
    <ScrollView
      keyboardShouldPersistTaps="always"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.formContent}
    >
      <View style={styles.typeRow}>
        <Button
          variant={debtType === 'owed_to_me' ? 'primary' : 'secondary'}
          className="flex-1"
          onPress={() => setDebtType('owed_to_me')}
        >
          <ArrowDown
            size={18}
            color={debtType === 'owed_to_me' ? accentForeground : palette.positive}
          />
          <Button.Label>Owes Me</Button.Label>
        </Button>
        <Button
          variant={debtType === 'i_owe' ? 'primary' : 'secondary'}
          className="flex-1"
          onPress={() => setDebtType('i_owe')}
        >
          <ArrowUp
            size={18}
            color={debtType === 'i_owe' ? accentForeground : palette.negative}
          />
          <Button.Label>I Owe</Button.Label>
        </Button>
      </View>

      <TextField isRequired>
        <Label>Person</Label>
        <TextInput
          style={styles.input}
          placeholder="Full name"
          placeholderTextColor={palette.placeholder}
          value={personName}
          onChangeText={setPersonName}
          returnKeyType="next"
          autoCapitalize="words"
          keyboardAppearance={keyboardAppearance}
        />
      </TextField>

      <TextField isRequired>
        <Label>Amount</Label>
        <View style={styles.amountRow}>
          <Text style={styles.currencySymbol}>{symbol}</Text>
          <TextInput
            style={[styles.input, styles.amountInput]}
            placeholder="0.00"
            placeholderTextColor={palette.placeholder}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            returnKeyType="next"
            keyboardAppearance={keyboardAppearance}
          />
        </View>
      </TextField>

      <TextField>
        <Label>Note</Label>
        <TextInput
          style={styles.input}
          placeholder="What's it for?"
          placeholderTextColor={palette.placeholder}
          value={note}
          onChangeText={setNote}
          returnKeyType="next"
          keyboardAppearance={keyboardAppearance}
        />
        <Description>Optional</Description>
      </TextField>

      <TextField>
        <Label>Due date</Label>
        <IosDatePicker
          value={dueDate}
          onChange={setDueDate}
          placeholder="Select due date"
        />
        {dueDate ? (
          <Button variant="ghost" size="sm" className="self-start" onPress={() => setDueDate(undefined)}>
            <Button.Label>Clear due date</Button.Label>
          </Button>
        ) : null}
        <Description>Optional</Description>
      </TextField>
    </ScrollView>
  );
}

function createStyles(palette: ColorPalette) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: palette.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.opaqueSeparator,
    },
    title: {
      flex: 1,
      fontSize: 17,
      fontWeight: '600',
      color: palette.label,
      textAlign: 'center',
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
      color: palette.labelSecondary,
      zIndex: 1,
    },
    input: {
      alignSelf: 'stretch',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: palette.fill,
      color: palette.label,
      fontSize: 17,
    },
    amountInput: {
      flex: 1,
      paddingLeft: 32,
    },
  });
}

export function AddDebtScreen({ onClose }: AddDebtScreenProps) {
  const palette = useColors();
  const colorScheme = useAppColorScheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const keyboardAppearance = colorScheme === 'dark' ? 'dark' : 'light';
  const { addDebt } = useDebtStore();
  const insets = useSafeAreaInsets();

  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [debtType, setDebtType] = useState<DebtType>('owed_to_me');
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();

  const reset = () => {
    setPersonName('');
    setAmount('');
    setDebtType('owed_to_me');
    setNote('');
    setDueDate(undefined);
  };

  const close = () => {
    reset();
    onClose();
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

    addDebt({
      personName: personName.trim(),
      amount: parsed,
      type: debtType,
      note: note.trim() || undefined,
      dueDate: dueDate?.toISOString(),
    });
    close();
  };

  return (
    <View style={styles.screen}>
      <HeroUINativeProvider>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <HeaderIconButton
            icon={X}
            accessibilityLabel="Cancel"
            onPress={close}
          />
          <Text style={styles.title}>New Debt</Text>
          <HeaderIconButton
            icon={Check}
            accessibilityLabel="Save"
            onPress={handleSubmit}
            variant="tint"
          />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={insets.top}
        >
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
            palette={palette}
            styles={styles}
            keyboardAppearance={keyboardAppearance}
          />
        </KeyboardAvoidingView>
      </HeroUINativeProvider>
    </View>
  );
}
