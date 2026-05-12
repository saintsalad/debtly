import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Check, X } from 'lucide-react-native';
import { Description, HeroUINativeProvider, Label, TextField } from 'heroui-native';
import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useCurrency } from '@/hooks/useCurrency';
import { useAppBottomSheetLayout } from '@/lib/appBottomSheet';
import { radius, space, type, useColors, type ColorPalette } from '@/lib/platform';

export interface PartialPaymentSheetHandle {
  present: (remainingBalance: number) => void;
  dismiss: () => void;
}

interface PartialPaymentSheetProps {
  onSubmit: (amount: number) => boolean;
}

function createStyles(palette: ColorPalette) {
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
      flex: 1,
      paddingHorizontal: space[5],
      paddingBottom: space[4],
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
    body: {
      gap: space[4],
      paddingTop: space[4],
    },
    summary: {
      ...type.subheadline,
      color: palette.labelSecondary,
      textAlign: 'center',
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
  });
}

export const PartialPaymentSheet = forwardRef<PartialPaymentSheetHandle, PartialPaymentSheetProps>(
  function PartialPaymentSheet({ onSubmit }, ref) {
    const palette = useColors();
    const colorScheme = useAppColorScheme();
    const styles = useMemo(() => createStyles(palette), [palette]);
    const keyboardAppearance = colorScheme === 'dark' ? 'dark' : 'light';
    const { fmt, symbol } = useCurrency();
    const {
      topInset,
      bottomInset,
      contentBottomPadding,
      containerComponent,
      presentSheet,
    } = useAppBottomSheetLayout();
    const sheetRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['42%'], []);

    const [amount, setAmount] = useState('');
    const [remainingBalance, setRemainingBalance] = useState(0);

    const reset = useCallback(() => {
      setAmount('');
      setRemainingBalance(0);
    }, []);

    const dismiss = useCallback(() => {
      sheetRef.current?.dismiss();
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        present: (nextRemainingBalance: number) => {
          setRemainingBalance(nextRemainingBalance);
          setAmount('');
          presentSheet(() => {
            sheetRef.current?.present();
          });
        },
        dismiss,
      }),
      [dismiss, presentSheet]
    );

    const handleDismiss = useCallback(() => {
      reset();
    }, [reset]);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
      ),
      []
    );

    const handleSubmit = () => {
      const parsed = parseFloat(amount.replace(/[^0-9.]/g, ''));
      if (!parsed || parsed <= 0) {
        Alert.alert('Invalid amount', 'Enter a payment greater than 0.');
        return;
      }
      if (parsed > remainingBalance + 0.009) {
        Alert.alert('Amount too high', `Enter up to ${fmt(remainingBalance)}.`);
        return;
      }

      if (!onSubmit(parsed)) {
        return;
      }

      dismiss();
    };

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backdropComponent={renderBackdrop}
        onDismiss={handleDismiss}
        topInset={topInset}
        bottomInset={bottomInset}
        containerComponent={containerComponent}
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.sheet}
      >
        <HeroUINativeProvider>
          <BottomSheetView style={[styles.content, { paddingBottom: contentBottomPadding }]}>
            <View style={styles.header}>
              <HeaderIconButton icon={X} accessibilityLabel="Cancel" onPress={dismiss} />
              <Text style={styles.title}>Partial payment</Text>
              <HeaderIconButton
                icon={Check}
                accessibilityLabel="Record payment"
                onPress={handleSubmit}
                variant="tint"
              />
            </View>

            <View style={styles.body}>
              <Text style={styles.summary}>{fmt(remainingBalance)} remaining</Text>
              <TextField isRequired>
                <Label>Amount</Label>
                <View style={styles.amountRow}>
                  <Text style={styles.currencySymbol}>{symbol}</Text>
                  <BottomSheetTextInput
                    style={[styles.input, styles.amountInput]}
                    placeholder="0.00"
                    placeholderTextColor={palette.placeholder}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                    keyboardAppearance={keyboardAppearance}
                  />
                </View>
                <Description>Enter up to the remaining balance.</Description>
              </TextField>
            </View>
          </BottomSheetView>
        </HeroUINativeProvider>
      </BottomSheetModal>
    );
  }
);

PartialPaymentSheet.displayName = 'PartialPaymentSheet';
