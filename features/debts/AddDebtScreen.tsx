import React, { useEffect, useMemo, useState } from 'react';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { ArrowDown, ArrowUp, Check, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Description, HeroUINativeProvider, Label, TextField, useThemeColor } from 'heroui-native';
import { FormSwitchRow } from '@/components/ui/FormSwitchRow';
import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useDebtStore } from '@/stores/debtStore';
import { getPrincipalAmount } from '@/features/debts/debtCalculations';
import { toLocalDateString } from '@/features/debts/dates';
import {
  buildInterestFields,
  buildRecurringFields,
  interestRateFromBps,
  interestRateToBps,
  validateAddDebtInput,
} from '@/features/debts/interestEngine';
import { majorToMinor } from '@/features/debts/money';
import {
  Debt,
  DebtType,
  InterestAccrualFrequency,
  RecurrenceFrequency,
} from '@/features/debts/types';
import { useColors, layout, radius, space, type, type ColorPalette } from '@/lib/platform';
import { useStatusBarScrollFade } from '@/lib/statusBarScrollFade';
import { useCurrency } from '@/hooks/useCurrency';
import { IosDatePicker } from '@/components/ui/ios-datepicker';

interface AddDebtScreenProps {
  onClose: () => void;
  debtId?: string;
}

interface DebtFormValues {
  personName: string;
  amount: string;
  debtType: DebtType;
  note: string;
  dueDate?: Date;
  chargeInterest: boolean;
  interestRate: string;
  interestAccrualIndex: number;
  isRecurring: boolean;
  recurrenceIndex: number;
}

const EMPTY_FORM_VALUES: DebtFormValues = {
  personName: '',
  amount: '',
  debtType: 'owed_to_me',
  note: '',
  dueDate: undefined,
  chargeInterest: false,
  interestRate: '',
  interestAccrualIndex: 0,
  isRecurring: false,
  recurrenceIndex: 1,
};

const RECURRENCE_OPTIONS: RecurrenceFrequency[] = ['weekly', 'monthly', 'yearly'];
const INTEREST_ACCRUAL_OPTIONS: InterestAccrualFrequency[] = ['monthly', 'yearly'];

function readDebtFormValues(debt: Debt): DebtFormValues {
  const recurrenceInterval = debt.recurrenceInterval ?? 'monthly';
  const recurrenceIndex = Math.max(0, RECURRENCE_OPTIONS.indexOf(recurrenceInterval));

  return {
    personName: debt.personName,
    amount: String(getPrincipalAmount(debt)),
    debtType: debt.type,
    note: debt.note ?? '',
    dueDate: debt.dueDate ? new Date(debt.dueDate) : undefined,
    chargeInterest: Boolean(debt.interestRateBps),
    interestRate: debt.interestRateBps ? String(interestRateFromBps(debt.interestRateBps)) : '',
    interestAccrualIndex: debt.interestAccrualFrequency === 'yearly' ? 1 : 0,
    isRecurring: Boolean(debt.isRecurring),
    recurrenceIndex: recurrenceIndex === -1 ? 1 : recurrenceIndex,
  };
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
  scrollFadeOnScroll?: React.ComponentProps<typeof Animated.ScrollView>['onScroll'];
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
  scrollFadeOnScroll,
}: AddDebtFormProps) {
  const { symbol } = useCurrency();
  const accentForeground = useThemeColor('accent-foreground');

  return (
    <Animated.ScrollView
      keyboardShouldPersistTaps="always"
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={scrollFadeOnScroll}
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
    </Animated.ScrollView>
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

export function AddDebtScreen({ onClose, debtId }: AddDebtScreenProps) {
  const palette = useColors();
  const colorScheme = useAppColorScheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const keyboardAppearance = colorScheme === 'dark' ? 'dark' : 'light';
  const { addDebt, updateDebt } = useDebtStore();
  const existingDebt = useDebtStore((state) =>
    debtId ? state.debts.find((debt) => debt.id === debtId) : undefined
  );
  const isEditing = Boolean(debtId);
  const insets = useSafeAreaInsets();
  const initialValues = useMemo(
    () => (existingDebt ? readDebtFormValues(existingDebt) : EMPTY_FORM_VALUES),
    [existingDebt]
  );
  const { onScroll: statusBarScrollFadeOnScroll } = useStatusBarScrollFade();

  const [personName, setPersonName] = useState(initialValues.personName);
  const [amount, setAmount] = useState(initialValues.amount);
  const [debtType, setDebtType] = useState<DebtType>(initialValues.debtType);
  const [note, setNote] = useState(initialValues.note);
  const [dueDate, setDueDate] = useState<Date | undefined>(initialValues.dueDate);
  const [chargeInterest, setChargeInterest] = useState(initialValues.chargeInterest);
  const [interestRate, setInterestRate] = useState(initialValues.interestRate);
  const [interestAccrualIndex, setInterestAccrualIndex] = useState(
    initialValues.interestAccrualIndex
  );
  const [isRecurring, setIsRecurring] = useState(initialValues.isRecurring);
  const [recurrenceIndex, setRecurrenceIndex] = useState(initialValues.recurrenceIndex);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    if (!existingDebt) {
      onClose();
    }
  }, [existingDebt, isEditing, onClose]);

  const reset = () => {
    setPersonName(EMPTY_FORM_VALUES.personName);
    setAmount(EMPTY_FORM_VALUES.amount);
    setDebtType(EMPTY_FORM_VALUES.debtType);
    setNote(EMPTY_FORM_VALUES.note);
    setDueDate(EMPTY_FORM_VALUES.dueDate);
    setChargeInterest(EMPTY_FORM_VALUES.chargeInterest);
    setInterestRate(EMPTY_FORM_VALUES.interestRate);
    setInterestAccrualIndex(EMPTY_FORM_VALUES.interestAccrualIndex);
    setIsRecurring(EMPTY_FORM_VALUES.isRecurring);
    setRecurrenceIndex(EMPTY_FORM_VALUES.recurrenceIndex);
  };

  const close = () => {
    if (!isEditing) {
      reset();
    }
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

    const input = {
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
    };

    if (isEditing) {
      if (!existingDebt) {
        return;
      }

      const validationError = validateAddDebtInput(input);
      if (validationError) {
        Alert.alert('Unable to save changes', validationError);
        return;
      }

      const updates = {
        personName: input.personName,
        principalMinor: majorToMinor(input.amount),
        type: input.type,
        note: input.note,
        dueDate: input.dueDate ? toLocalDateString(input.dueDate) : undefined,
        ...(chargeInterest
          ? buildInterestFields(input, existingDebt.createdAt)
          : {
              interestRateBps: undefined,
              interestStartMode: undefined,
              interestAccrualFrequency: undefined,
              interestStartDate: undefined,
              accruedInterestMinor: undefined,
            }),
        ...buildRecurringFields(
          input,
          existingDebt.recurringGroupId ?? existingDebt.id,
          existingDebt.recurringSourceId ?? existingDebt.id
        ),
      };

      updateDebt(existingDebt.id, updates);
      onClose();
      return;
    }

    const error = addDebt(input);

    if (error) {
      Alert.alert('Unable to save debt', error);
      return;
    }

    close();
  };

  if (isEditing && !existingDebt) {
    return null;
  }

  return (
    <View style={styles.screen}>
      <HeroUINativeProvider>
        <View style={[styles.header, { paddingTop: insets.top + space[2] }]}>
          <HeaderIconButton
            icon={X}
            accessibilityLabel="Cancel"
            onPress={close}
          />
          <Text style={styles.title}>{isEditing ? 'Edit Transaction' : 'New Debt'}</Text>
          <HeaderIconButton
            icon={Check}
            accessibilityLabel={isEditing ? 'Save changes' : 'Save'}
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
            scrollFadeOnScroll={statusBarScrollFadeOnScroll}
          />
        </KeyboardAvoidingView>
      </HeroUINativeProvider>
    </View>
  );
}
