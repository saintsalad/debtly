import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { X } from 'lucide-react-native';
import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import {
  DEFAULT_TRANSACTION_FILTERS,
  type DueDateFilter,
  type TransactionFilters,
} from '@/features/debts/transactionFilters';
import { DebtStatus } from '@/features/debts/types';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useAppBottomSheetLayout } from '@/lib/appBottomSheet';
import { glassBorderStyle } from '@/lib/glassBorder';
import { radius, space, type, useColors, type ColorPalette } from '@/lib/platform';

export interface TransactionFilterSheetHandle {
  present: () => void;
  dismiss: () => void;
}

interface TransactionFilterSheetProps {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
}

const STATUS_OPTIONS: { value: DebtStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'partial', label: 'Partially paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
];

const DUE_DATE_OPTIONS: { value: DueDateFilter; label: string }[] = [
  { value: 'all', label: 'Any due date' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'due_this_week', label: 'Due this week' },
  { value: 'due_this_month', label: 'Due this month' },
  { value: 'no_due_date', label: 'No due date' },
];

function createStyles(palette: ColorPalette, scheme: 'light' | 'dark') {
  return StyleSheet.create({
    sheet: {
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      backgroundColor: palette.surface,
    },
    handle: {
      width: 40,
      backgroundColor: palette.opaqueSeparator,
    },
    content: {
      paddingHorizontal: space[5],
      backgroundColor: palette.surface,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
    headerSpacer: {
      width: 36,
    },
    body: {
      gap: space[5],
      paddingTop: space[4],
    },
    section: {
      gap: space[2],
    },
    sectionLabel: {
      ...type.subheadline,
      fontWeight: '600',
      color: palette.label,
    },
    sectionHint: {
      ...type.footnote,
      color: palette.labelSecondary,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space[2],
    },
    chip: {
      borderRadius: radius.pill,
      paddingHorizontal: space[3],
      paddingVertical: space[2],
      backgroundColor: palette.fill,
      ...glassBorderStyle(scheme, 'secondary'),
    },
    chipActive: {
      backgroundColor: palette.tintMuted,
      ...glassBorderStyle(scheme, 'tint'),
    },
    chipLabel: {
      ...type.footnote,
      fontWeight: '500',
      color: palette.labelSecondary,
    },
    chipLabelActive: {
      color: palette.tint,
      fontWeight: '600',
    },
    resetButton: {
      alignSelf: 'flex-start',
      paddingVertical: space[1],
    },
    resetLabel: {
      ...type.footnote,
      fontWeight: '600',
      color: palette.tint,
    },
    resetLabelDisabled: {
      color: palette.labelTertiary,
    },
  });
}

export const TransactionFilterSheet = forwardRef<
  TransactionFilterSheetHandle,
  TransactionFilterSheetProps
>(function TransactionFilterSheet({ filters, onChange }, ref) {
  const palette = useColors();
  const colorScheme = useAppColorScheme();
  const styles = useMemo(() => createStyles(palette, colorScheme), [palette, colorScheme]);
  const {
    topInset,
    bottomInset,
    contentBottomPadding,
    containerComponent,
    presentSheet,
  } = useAppBottomSheetLayout();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['72%'], []);
  const selectedStatuses = useMemo(() => new Set(filters.statuses), [filters.statuses]);
  const hasActiveFilters =
    filters.statuses.length > 0 ||
    filters.dueDate !== 'all';

  const dismiss = useCallback(() => {
    sheetRef.current?.dismiss();
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      present: () => {
        presentSheet(() => {
          sheetRef.current?.present();
        });
      },
      dismiss,
    }),
    [dismiss, presentSheet]
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
    ),
    []
  );

  const toggleStatus = useCallback(
    (status: DebtStatus) => {
      onChange({
        ...filters,
        statuses: selectedStatuses.has(status)
          ? filters.statuses.filter((value) => value !== status)
          : [...filters.statuses, status],
      });
    },
    [filters, onChange, selectedStatuses]
  );

  const setDueDate = useCallback(
    (dueDate: DueDateFilter) => {
      onChange({ ...filters, dueDate });
    },
    [filters, onChange]
  );

  const handleReset = useCallback(() => {
    onChange(DEFAULT_TRANSACTION_FILTERS);
  }, [onChange]);

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      topInset={topInset}
      bottomInset={bottomInset}
      containerComponent={containerComponent}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.sheet}
    >
      <BottomSheetScrollView
        contentContainerStyle={[styles.content, { paddingBottom: contentBottomPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <HeaderIconButton icon={X} accessibilityLabel="Close filters" onPress={dismiss} />
          <Text style={styles.title}>Filter</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.body}>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Status</Text>
            <Text style={styles.sectionHint}>Choose one or more statuses.</Text>
            <View style={styles.chipRow}>
              {STATUS_OPTIONS.map((option) => {
                const active = selectedStatuses.has(option.value);

                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => toggleStatus(option.value)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Due date</Text>
            <Text style={styles.sectionHint}>Narrow results by due date timing.</Text>
            <View style={styles.chipRow}>
              {DUE_DATE_OPTIONS.map((option) => {
                const active = filters.dueDate === option.value;

                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setDueDate(option.value)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !hasActiveFilters }}
            disabled={!hasActiveFilters}
            onPress={handleReset}
            style={styles.resetButton}
          >
            <Text style={[styles.resetLabel, !hasActiveFilters && styles.resetLabelDisabled]}>
              Reset filters
            </Text>
          </Pressable>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

TransactionFilterSheet.displayName = 'TransactionFilterSheet';
