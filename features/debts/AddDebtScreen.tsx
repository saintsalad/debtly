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
import { FormSwitchRow } from '@/components/ui/FormSwitchRow';
import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useDebtStore } from '@/stores/debtStore';
import { DebtType, InterestAccrualFrequency, RecurrenceFrequency } from '@/features/debts/types';
import { interestRateToBps } from '@/features/debts/interestEngine';
import { useColors, layout, radius, space, type, type ColorPalette } from '@/lib/platform';
import { useCurrency } from '@/hooks/useCurrency';
import { IosDatePicker } from '@/components/ui/ios-datepicker';

interface AddDebtScreenProps {
  onClose: () => void;
}

const RECURRENCE_OPTIONS: RecurrenceFrequency[] = ['weekly', 'monthly', 'yearly'];
const INTEREST_ACCRUAL_OPTIONS: InterestAccrualFrequency[] = ['monthly', 'yearly'];

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
  chargeInterest: boolean;
  setChargeInterest: (value: boolean) => void;
  interestRate: string;
  setInterestRate: (value: string) => void;
  interestAccrualIndex: number;
  setInterestAccrualIndex: (value: number) => void;
  isRecurring: boolean;
  setIsRecurring: (value: boolean) => void;
  recurrenceIndex: number;
  setRecurrenceIndex: (value: number) => void;
  palette: ColorPalette;
  styles: ReturnType<typeof createStyles>;
  keyboardAppearance: 'light' | 'dark';
  contentBottomPadding: number;
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
  chargeInterest,
  setChargeInterest,
  interestRate,
  setInterestRate,
  interestAccrualIndex,
  setInterestAccrualIndex,
  isRecurring,
  setIsRecurring,
  recurrenceIndex,
  setRecurrenceIndex,
  palette,
  styles,
  keyboardAppearance,
  contentBottomPadding,
}: AddDebtFormProps) {
  const { symbol } = useCurrency();
  const accentForeground = useThemeColor('accent-foreground');

  return (
    <ScrollView
      keyboardShouldPersistTaps="always"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.formContent, { paddingBottom: contentBottomPadding }]}
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
        <Label>Principal amount</Label>
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
        <Description>Original amount before interest or payments.</Description>
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Terms</Text>
        <View style={styles.sectionCard}>
          <FormSwitchRow
            label="Charge interest"
            description="Simple interest on the unpaid balance."
            value={chargeInterest}
            onValueChange={setChargeInterest}
          />
          {chargeInterest ? (
            <View style={styles.nestedField}>
              <TextField>
                <Label>Annual interest rate</Label>
                <View style={styles.rateRow}>
                  <TextInput
                    style={[styles.input, styles.rateInput]}
                    placeholder="0.0"
                    placeholderTextColor={palette.placeholder}
                    value={interestRate}
                    onChangeText={setInterestRate}
                    keyboardType="decimal-pad"
                    keyboardAppearance={keyboardAppearance}
                  />
                  <Text style={styles.rateSuffix}>% APR</Text>
                </View>
              </TextField>
              <Text style={styles.nestedLabel}>Accrues</Text>
              <SegmentedControl
                options={['Monthly', 'Yearly']}
                selectedIndex={interestAccrualIndex}
                onChange={setInterestAccrualIndex}
              />
              <Description>
                {interestAccrualIndex === 0
                  ? 'Interest is added each month on the remaining balance.'
                  : 'Interest is added each year on the remaining balance.'}
              </Description>
            </View>
          ) : null}
          <FormSwitchRow
            label="Recurring debt"
            description="Create the next cycle after this one is settled."
            value={isRecurring}
            onValueChange={setIsRecurring}
            showSeparator
          />
          {isRecurring ? (
            <View style={styles.nestedField}>
              <Text style={styles.nestedLabel}>Repeats</Text>
              <SegmentedControl
                options={['Weekly', 'Monthly', 'Yearly']}
                selectedIndex={recurrenceIndex}
                onChange={setRecurrenceIndex}
              />
            </View>
          ) : null}
        </View>
      </View>
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
      paddingHorizontal: space[5],
      paddingBottom: space[3],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.opaqueSeparator,
    },
    title: {
      flex: 1,
      ...type.headline,
      color: palette.label,
      textAlign: 'center',
    },
    formContent: {
      flexGrow: 1,
      gap: space[4],
      paddingHorizontal: space[5],
      paddingTop: space[4],
    },
    typeRow: {
      flexDirection: 'row',
      gap: space[3],
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
      paddingHorizontal: space[4],
      paddingVertical: 12,
      borderRadius: radius.sm,
      backgroundColor: palette.fill,
      color: palette.label,
      fontSize: 17,
    },
    amountInput: {
      flex: 1,
      paddingLeft: 32,
    },
    section: {
      gap: space[2],
      marginTop: space[2],
    },
    sectionTitle: {
      ...type.footnote,
      color: palette.labelSecondary,
      paddingLeft: space[1],
    },
    sectionCard: {
      backgroundColor: palette.fillSecondary,
      borderRadius: radius.lg,
      overflow: 'hidden',
    },
    nestedField: {
      paddingHorizontal: space[4],
      paddingBottom: space[4],
      gap: space[3],
    },
    nestedLabel: {
      ...type.footnote,
      color: palette.labelSecondary,
    },
    rateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
    },
    rateInput: {
      flex: 1,
    },
    rateSuffix: {
      ...type.subheadline,
      color: palette.labelSecondary,
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
  const [chargeInterest, setChargeInterest] = useState(false);
  const [interestRate, setInterestRate] = useState('');
  const [interestAccrualIndex, setInterestAccrualIndex] = useState(0);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceIndex, setRecurrenceIndex] = useState(1);

  const reset = () => {
    setPersonName('');
    setAmount('');
    setDebtType('owed_to_me');
    setNote('');
    setDueDate(undefined);
    setChargeInterest(false);
    setInterestRate('');
    setInterestAccrualIndex(0);
    setIsRecurring(false);
    setRecurrenceIndex(1);
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

    let interestRateBps: number | undefined;
    if (chargeInterest) {
      const parsedInterest = parseFloat(interestRate.replace(/[^0-9.]/g, ''));
      if (!parsedInterest || parsedInterest <= 0) {
        Alert.alert('Invalid interest rate', 'Enter an annual rate greater than 0.');
        return;
      }
      if (parsedInterest > 100) {
        Alert.alert('Invalid interest rate', 'Enter a rate up to 100%.');
        return;
      }
      interestRateBps = interestRateToBps(parsedInterest);
    }

    if (isRecurring && !dueDate) {
      Alert.alert('Due date required', 'Recurring debts need a due date to anchor each cycle.');
      return;
    }

    const error = addDebt({
      personName: personName.trim(),
      amount: parsed,
      type: debtType,
      note: note.trim() || undefined,
      dueDate: dueDate?.toISOString(),
      interestRateBps,
      interestAccrualFrequency: chargeInterest
        ? INTEREST_ACCRUAL_OPTIONS[interestAccrualIndex]
        : undefined,
      isRecurring,
      recurrenceInterval: isRecurring ? RECURRENCE_OPTIONS[recurrenceIndex] : undefined,
    });

    if (error) {
      Alert.alert('Unable to save debt', error);
      return;
    }

    close();
  };

  return (
    <View style={styles.screen}>
      <HeroUINativeProvider>
        <View style={[styles.header, { paddingTop: insets.top + space[2] }]}>
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
            chargeInterest={chargeInterest}
            setChargeInterest={setChargeInterest}
            interestRate={interestRate}
            setInterestRate={setInterestRate}
            interestAccrualIndex={interestAccrualIndex}
            setInterestAccrualIndex={setInterestAccrualIndex}
            isRecurring={isRecurring}
            setIsRecurring={setIsRecurring}
            recurrenceIndex={recurrenceIndex}
            setRecurrenceIndex={setRecurrenceIndex}
            palette={palette}
            styles={styles}
            keyboardAppearance={keyboardAppearance}
            contentBottomPadding={insets.bottom + layout.screenPaddingBottom}
          />
        </KeyboardAvoidingView>
      </HeroUINativeProvider>
    </View>
  );
}
