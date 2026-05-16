import React, { useEffect, useMemo, useState } from 'react';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { ArrowDown, ArrowUp, Check, ChevronDown, ChevronRight, Plus, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Description, HeroUINativeProvider, Label, TextField, useThemeColor } from 'heroui-native';
import { GlassButton } from '@/components/ui/GlassButton';
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
  InterestType,
  RecurrenceFrequency,
} from '@/features/debts/types';
import { useColors, layout, radius, space, type, type ColorPalette } from '@/lib/platform';
import { useCurrency } from '@/hooks/useCurrency';
import { IosDatePicker } from '@/components/ui/ios-datepicker';

interface AddDebtScreenProps {
  onClose: () => void;
  debtId?: string;
}

const RECURRENCE_OPTIONS: RecurrenceFrequency[] = ['weekly', 'monthly', 'yearly'];
const INTEREST_ACCRUAL_OPTIONS: InterestAccrualFrequency[] = ['monthly', 'yearly'];
const INTEREST_TYPE_OPTIONS: InterestType[] = ['simple', 'compound'];

// ─── Styles ──────────────────────────────────────────────────────────────────

function createStyles(palette: ColorPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space[5],
      paddingBottom: space[3],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.opaqueSeparator,
    },
    title: { flex: 1, ...type.headline, color: palette.label, textAlign: 'center' },
    formContent: { flexGrow: 1, gap: space[4], paddingHorizontal: space[5], paddingTop: space[4] },
    typeRow: { flexDirection: 'row', gap: space[3] },
    amountRow: { width: '100%', flexDirection: 'row', alignItems: 'center' },
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
    amountInput: { flex: 1, paddingLeft: 32 },
    section: { gap: space[2], marginTop: space[2] },
    sectionTitle: { ...type.footnote, color: palette.labelSecondary, paddingLeft: space[1] },
    sectionCard: {
      backgroundColor: palette.fillSecondary,
      borderRadius: radius.lg,
      overflow: 'hidden',
    },
    nestedField: { paddingHorizontal: space[4], paddingBottom: space[4], gap: space[3] },
    nestedLabel: { ...type.footnote, color: palette.labelSecondary },
    rateRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    rateInput: { flex: 1 },
    rateSuffix: { ...type.subheadline, color: palette.labelSecondary },
    // Advanced toggle
    advancedToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      paddingVertical: space[2],
      paddingHorizontal: space[1],
      alignSelf: 'flex-start',
    },
    advancedToggleLabel: { ...type.subheadline, color: palette.tint },
    advancedContent: { gap: space[4], overflow: 'hidden' },
    // Split people
    splitPeopleContainer: { gap: space[3] },
    splitPersonRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    splitPersonInput: { flex: 1 },
    splitRemoveBtn: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}

// ─── SplitPeopleList sub-component ───────────────────────────────────────────

function SplitPeopleList({
  people,
  onChange,
  palette,
  styles,
  keyboardAppearance,
}: {
  people: string[];
  onChange: (people: string[]) => void;
  palette: ColorPalette;
  styles: ReturnType<typeof createStyles>;
  keyboardAppearance: 'light' | 'dark';
}) {
  return (
    <View style={styles.splitPeopleContainer}>
      {people.map((person, i) => (
        <View key={i} style={styles.splitPersonRow}>
          <TextInput
            style={[styles.input, styles.splitPersonInput]}
            placeholder={`Person ${i + 1}`}
            placeholderTextColor={palette.placeholder}
            value={person}
            onChangeText={(val) => {
              const next = [...people];
              next[i] = val;
              onChange(next);
            }}
            autoCapitalize="words"
            returnKeyType="next"
            keyboardAppearance={keyboardAppearance}
          />
          {people.length > 2 ? (
            <Pressable
              onPress={() => onChange(people.filter((_, idx) => idx !== i))}
              style={styles.splitRemoveBtn}
              hitSlop={8}
            >
              <X size={16} color={palette.labelSecondary} />
            </Pressable>
          ) : null}
        </View>
      ))}
      <GlassButton
        variant="ghost"
        size="sm"
        className="self-start"
        onPress={() => onChange([...people, ''])}
      >
        <Plus size={14} color={palette.tint} />
        <GlassButton.Label>Add person</GlassButton.Label>
      </GlassButton>
    </View>
  );
}

// ─── Main form ───────────────────────────────────────────────────────────────

export function AddDebtScreen({ onClose, debtId }: AddDebtScreenProps) {
  const palette = useColors();
  const colorScheme = useAppColorScheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const keyboardAppearance = colorScheme === 'dark' ? 'dark' : 'light';
  const accentForeground = useThemeColor('accent-foreground');

  const { addDebt, updateDebt } = useDebtStore();
  const { symbol } = useCurrency();
  const existingDebt = useDebtStore((s) => (debtId ? s.debts.find((d) => d.id === debtId) : undefined));
  const isEditing = Boolean(debtId);
  const insets = useSafeAreaInsets();

  // ── Primary fields ──────────────────────────────────────────────────────
  const [debtType, setDebtType] = useState<DebtType>(
    () => existingDebt?.type ?? 'owed_to_me'
  );
  const [isSplitWithOthers, setIsSplitWithOthers] = useState(false);
  const [splitPeople, setSplitPeople] = useState(['', '']);
  const [personName, setPersonName] = useState(() => existingDebt?.personName ?? '');
  const [amount, setAmount] = useState(() =>
    existingDebt ? String(getPrincipalAmount(existingDebt)) : ''
  );
  const [note, setNote] = useState(() => existingDebt?.note ?? '');
  const [dueDate, setDueDate] = useState<Date | undefined>(() =>
    existingDebt?.dueDate ? new Date(existingDebt.dueDate) : undefined
  );

  // ── Terms ───────────────────────────────────────────────────────────────
  const [chargeInterest, setChargeInterest] = useState(() => Boolean(existingDebt?.interestRateBps));
  const [interestRate, setInterestRate] = useState(() =>
    existingDebt?.interestRateBps ? String(interestRateFromBps(existingDebt.interestRateBps)) : ''
  );
  const [interestTypeIndex, setInterestTypeIndex] = useState(() =>
    existingDebt?.interestType === 'compound' ? 1 : 0
  );
  const [interestAccrualIndex, setInterestAccrualIndex] = useState(() =>
    existingDebt?.interestAccrualFrequency === 'yearly' ? 1 : 0
  );
  const [isRecurring, setIsRecurring] = useState(() => Boolean(existingDebt?.isRecurring));
  const [recurrenceIndex, setRecurrenceIndex] = useState(() => {
    const idx = RECURRENCE_OPTIONS.indexOf(existingDebt?.recurrenceInterval ?? 'monthly');
    return idx === -1 ? 1 : idx;
  });
  const [carryOverBalance, setCarryOverBalance] = useState(() => existingDebt?.carryOverBalance ?? false);
  const [isInstalmentPlan, setIsInstalmentPlan] = useState(() => existingDebt?.instalmentCount != null);
  const [instalmentCount, setInstalmentCount] = useState(() =>
    existingDebt?.instalmentCount ? String(existingDebt.instalmentCount) : ''
  );

  // ── Advanced fields (hidden by default) ────────────────────────────────
  const hasAdvancedValues = Boolean(existingDebt?.startDate);
  const [showAdvanced, setShowAdvanced] = useState(hasAdvancedValues);
  const [startDate, setStartDate] = useState<Date | undefined>(() =>
    existingDebt?.startDate ? new Date(existingDebt.startDate) : undefined
  );

  // Close when the debt is deleted while editing
  useEffect(() => {
    if (isEditing && !existingDebt) onClose();
  }, [existingDebt, isEditing, onClose]);

  // Derived
  const parsedAmount = parseFloat(amount.replace(/[^0-9.]/g, ''));
  const filledPeople = splitPeople.filter((p) => p.trim());
  const perPersonAmount =
    isSplitWithOthers && filledPeople.length > 0 && parsedAmount > 0
      ? (parsedAmount / Math.max(filledPeople.length, 1)).toFixed(2)
      : null;

  const reset = () => {
    setDebtType('owed_to_me');
    setIsSplitWithOthers(false);
    setSplitPeople(['', '']);
    setPersonName('');
    setAmount('');
    setNote('');
    setDueDate(undefined);
    setChargeInterest(false);
    setInterestRate('');
    setInterestTypeIndex(0);
    setInterestAccrualIndex(0);
    setIsRecurring(false);
    setRecurrenceIndex(1);
    setCarryOverBalance(false);
    setIsInstalmentPlan(false);
    setInstalmentCount('');
    setShowAdvanced(false);
    setStartDate(undefined);
  };

  const close = () => {
    if (!isEditing) reset();
    onClose();
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!isSplitWithOthers && !personName.trim()) {
      Alert.alert('Name required', "Enter the person's name.");
      return;
    }

    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('Invalid amount', 'Enter an amount greater than 0.');
      return;
    }

    let interestRateBps: number | undefined;
    if (chargeInterest) {
      const r = parseFloat(interestRate.replace(/[^0-9.]/g, ''));
      if (!r || r <= 0) {
        Alert.alert('Invalid interest rate', 'Enter an annual rate greater than 0.');
        return;
      }
      if (r > 100) {
        Alert.alert('Invalid interest rate', 'Enter a rate up to 100%.');
        return;
      }
      interestRateBps = interestRateToBps(r);
    }

    if (isRecurring && !dueDate) {
      Alert.alert('Due date required', 'Recurring debts need a due date to anchor each cycle.');
      return;
    }

    let parsedInstalmentCount: number | undefined;
    if (isRecurring && isInstalmentPlan) {
      parsedInstalmentCount = parseInt(instalmentCount, 10);
      if (!parsedInstalmentCount || parsedInstalmentCount < 2) {
        Alert.alert('Invalid instalment count', 'Enter at least 2 payments.');
        return;
      }
    }

    const baseInput = {
      amount: parsedAmount,
      type: debtType,
      note: note.trim() || undefined,
      dueDate: dueDate?.toISOString(),
      startDate: startDate?.toISOString(),
      interestRateBps,
      interestType: chargeInterest ? INTEREST_TYPE_OPTIONS[interestTypeIndex] : undefined,
      interestAccrualFrequency: chargeInterest ? INTEREST_ACCRUAL_OPTIONS[interestAccrualIndex] : undefined,
      isRecurring,
      recurrenceInterval: isRecurring ? RECURRENCE_OPTIONS[recurrenceIndex] : undefined,
      carryOverBalance: isRecurring ? carryOverBalance : undefined,
      instalmentCount: parsedInstalmentCount,
      instalmentTotal: parsedInstalmentCount ? Math.round(parsedAmount * 100) : undefined,
    };

    // ── Edit path ──────────────────────────────────────────────────────
    if (isEditing) {
      if (!existingDebt) return;

      const validationError = validateAddDebtInput({ ...baseInput, personName: personName.trim() });
      if (validationError) {
        Alert.alert('Unable to save changes', validationError);
        return;
      }

      const recurringFields = buildRecurringFields(
        { ...baseInput, personName: personName.trim() },
        existingDebt.recurringGroupId ?? existingDebt.id,
        existingDebt.recurringSourceId ?? existingDebt.id
      );

      // Preserve instalmentIndex when editing an existing plan (don't reset to 1)
      const preservedInstalmentIndex =
        recurringFields.instalmentCount != null && existingDebt.instalmentIndex != null
          ? existingDebt.instalmentIndex
          : recurringFields.instalmentIndex;

      updateDebt(existingDebt.id, {
        personName: personName.trim(),
        principalMinor: majorToMinor(parsedAmount),
        type: debtType,
        note: baseInput.note,
        currency: undefined,
        originalAmountMinor: undefined,
        conversionRate: undefined,
        dueDate: dueDate ? toLocalDateString(dueDate.toISOString()) : undefined,
        startDate: startDate ? toLocalDateString(startDate.toISOString()) : undefined,
        ...(chargeInterest
          ? buildInterestFields({ ...baseInput, personName: personName.trim() }, existingDebt.createdAt)
          : {
              interestRateBps: undefined,
              interestType: undefined,
              interestStartMode: undefined,
              interestAccrualFrequency: undefined,
              interestStartDate: undefined,
              accruedInterestMinor: undefined,
            }),
        ...recurringFields,
        instalmentIndex: preservedInstalmentIndex,
      });
      onClose();
      return;
    }

    // ── Add path ───────────────────────────────────────────────────────
    if (isSplitWithOthers) {
      const people = splitPeople.filter((p) => p.trim());
      if (people.length < 2) {
        Alert.alert('Add people', 'Enter at least 2 names to split across.');
        return;
      }
      const error = addDebt({ ...baseInput, personName: '', splitPeople: people });
      if (error) { Alert.alert('Unable to save', error); return; }
      close();
      return;
    }

    const error = addDebt({ ...baseInput, personName: personName.trim() });
    if (error) { Alert.alert('Unable to save debt', error); return; }
    close();
  };

  if (isEditing && !existingDebt) return null;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      <HeroUINativeProvider>
        <View style={[styles.header, { paddingTop: insets.top + space[2] }]}>
          <HeaderIconButton icon={X} accessibilityLabel="Cancel" onPress={close} />
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
          <Animated.ScrollView
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.formContent,
              { paddingBottom: insets.bottom + layout.screenPaddingBottom },
            ]}
          >
            {/* ── Type selector ── */}
            <View style={styles.typeRow}>
              <GlassButton
                variant={debtType === 'owed_to_me' ? 'primary' : 'secondary'}
                className="flex-1"
                onPress={() => setDebtType('owed_to_me')}
              >
                <ArrowDown size={18} color={debtType === 'owed_to_me' ? accentForeground : palette.positive} />
                <GlassButton.Label>Owes Me</GlassButton.Label>
              </GlassButton>
              <GlassButton
                variant={debtType === 'i_owe' ? 'primary' : 'secondary'}
                className="flex-1"
                onPress={() => setDebtType('i_owe')}
              >
                <ArrowUp size={18} color={debtType === 'i_owe' ? accentForeground : palette.negative} />
                <GlassButton.Label>I Owe</GlassButton.Label>
              </GlassButton>
            </View>

            {/* ── Person / Split ── */}
            {isSplitWithOthers ? (
              <TextField isRequired>
                <Label>People</Label>
                <SplitPeopleList
                  people={splitPeople}
                  onChange={setSplitPeople}
                  palette={palette}
                  styles={styles}
                  keyboardAppearance={keyboardAppearance}
                />
                {perPersonAmount ? (
                  <Description>Split equally: {symbol}{perPersonAmount} each</Description>
                ) : null}
              </TextField>
            ) : (
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
            )}

            {/* ── Amount ── */}
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

            {/* ── Note ── */}
            <TextField>
              <Label>Note</Label>
              <TextInput
                style={styles.input}
                placeholder="What's it for? (optional)"
                placeholderTextColor={palette.placeholder}
                value={note}
                onChangeText={setNote}
                returnKeyType="next"
                keyboardAppearance={keyboardAppearance}
              />
            </TextField>

            {/* ── Due date ── */}
            <TextField>
              <Label>Due date</Label>
              <IosDatePicker value={dueDate} onChange={setDueDate} placeholder="Select due date (optional)" />
              {dueDate ? (
                <GlassButton variant="ghost" size="sm" className="self-start" onPress={() => setDueDate(undefined)}>
                  <GlassButton.Label>Clear</GlassButton.Label>
                </GlassButton>
              ) : null}
            </TextField>

            {/* ── Terms section ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Terms</Text>
              <View style={styles.sectionCard}>

                {/* Interest */}
                <FormSwitchRow
                  label="Charge interest"
                  description="Apply an annual rate on the unpaid balance."
                  value={chargeInterest}
                  onValueChange={setChargeInterest}
                />
                {chargeInterest ? (
                  <View style={styles.nestedField}>
                    <TextField>
                      <Label>Annual rate</Label>
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
                    <Text style={styles.nestedLabel}>Type</Text>
                    <SegmentedControl
                      options={['Simple', 'Compound']}
                      selectedIndex={interestTypeIndex}
                      onChange={setInterestTypeIndex}
                    />
                    <Text style={styles.nestedLabel}>Accrues</Text>
                    <SegmentedControl
                      options={['Monthly', 'Yearly']}
                      selectedIndex={interestAccrualIndex}
                      onChange={setInterestAccrualIndex}
                    />
                  </View>
                ) : null}

                {/* Recurring */}
                <FormSwitchRow
                  label="Recurring"
                  description="Spawn the next cycle after each settlement."
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
                    <FormSwitchRow
                      label="Carry over unpaid balance"
                      description="Remaining amount rolls into the next cycle."
                      value={carryOverBalance}
                      onValueChange={setCarryOverBalance}
                    />
                    <FormSwitchRow
                      label="Instalment plan"
                      description="Auto-stop after a set number of cycles."
                      value={isInstalmentPlan}
                      onValueChange={(v) => { setIsInstalmentPlan(v); if (!v) setInstalmentCount(''); }}
                    />
                    {isInstalmentPlan ? (
                      <TextField>
                        <Label>Number of payments</Label>
                        <TextInput
                          style={styles.input}
                          placeholder="e.g. 10"
                          placeholderTextColor={palette.placeholder}
                          value={instalmentCount}
                          onChangeText={setInstalmentCount}
                          keyboardType="number-pad"
                          keyboardAppearance={keyboardAppearance}
                        />
                        {parsedAmount > 0 && parseInt(instalmentCount, 10) >= 2 ? (
                          <Description>
                            {symbol}{(parsedAmount / parseInt(instalmentCount, 10)).toFixed(2)} per payment · {instalmentCount} total
                          </Description>
                        ) : null}
                      </TextField>
                    ) : null}
                  </View>
                ) : null}

                {/* Split (owed_to_me, add only) */}
                {debtType === 'owed_to_me' && !isEditing ? (
                  <FormSwitchRow
                    label="Split with others"
                    description="Divide equally across multiple people."
                    value={isSplitWithOthers}
                    onValueChange={setIsSplitWithOthers}
                    showSeparator
                  />
                ) : null}
              </View>
            </View>

            {/* ── Advanced options (collapsed by default) ── */}
            <View style={styles.section}>
              <Pressable
                style={styles.advancedToggle}
                onPress={() => setShowAdvanced((v) => !v)}
                hitSlop={8}
              >
                {showAdvanced
                  ? <ChevronDown size={16} color={palette.tint} />
                  : <ChevronRight size={16} color={palette.tint} />}
                <Text style={styles.advancedToggleLabel}>Advanced options</Text>
                {startDate && !showAdvanced ? (
                  <View style={{
                    width: 6, height: 6, borderRadius: 3,
                    backgroundColor: palette.tint,
                    marginLeft: 2,
                  }} />
                ) : null}
              </Pressable>

              {showAdvanced ? (
                <View style={styles.advancedContent}>
                  <TextField>
                    <Label>Active from</Label>
                    <IosDatePicker
                      value={startDate}
                      onChange={setStartDate}
                      placeholder="Set a future activation date…"
                    />
                    {startDate ? (
                      <GlassButton variant="ghost" size="sm" className="self-start" onPress={() => setStartDate(undefined)}>
                        <GlassButton.Label>Clear</GlassButton.Label>
                      </GlassButton>
                    ) : null}
                    <Description>
                      Debt is excluded from totals and shown as Scheduled until this date.
                    </Description>
                  </TextField>
                </View>
              ) : null}
            </View>
          </Animated.ScrollView>
        </KeyboardAvoidingView>
      </HeroUINativeProvider>
    </View>
  );
}
