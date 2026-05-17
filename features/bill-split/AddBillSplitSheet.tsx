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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Description, HeroUINativeProvider, Label, TextField, useToast } from 'heroui-native';
import { GlassButton } from '@/components/ui/GlassButton';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useBillSplitStore } from '@/stores/billSplitStore';
import { useColors, space, type ColorPalette } from '@/lib/platform';
import { notifySuccess } from '@/lib/appToast';
import { useCurrency } from '@/hooks/useCurrency';

export interface AddBillSplitSheetHandle {
  present: () => void;
  dismiss: () => void;
}

function createSheetStyles(palette: ColorPalette) {
  return StyleSheet.create({
    sheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      backgroundColor: palette.surface,
    },
    handle: {
      width: 40,
      backgroundColor: palette.opaqueSeparator,
    },
    contentContainer: {
      flex: 1,
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
      fontSize: 17,
      fontWeight: '600',
      color: palette.label,
    },
    formContent: {
      flexGrow: 1,
      gap: space[4],
      paddingHorizontal: space[5],
      paddingTop: space[4],
      paddingBottom: space[8],
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
      paddingVertical: space[3],
      borderRadius: 12,
      backgroundColor: palette.fill,
      color: palette.label,
      fontSize: 17,
    },
    amountInput: {
      flex: 1,
      paddingLeft: 32,
    },
    participantsInput: {
      minHeight: 96,
      textAlignVertical: 'top',
    },
  });
}

export const AddBillSplitSheet = forwardRef<AddBillSplitSheetHandle>(function AddBillSplitSheet(_, ref) {
  const palette = useColors();
  const colorScheme = useAppColorScheme();
  const styles = useMemo(() => createSheetStyles(palette), [palette]);
  const keyboardAppearance = colorScheme === 'dark' ? 'dark' : 'light';
  const sheetRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const addSplit = useBillSplitStore((s) => s.addSplit);
  const { symbol } = useCurrency();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [total, setTotal] = useState('');
  const [participants, setParticipants] = useState('');

  const snapPoints = useMemo(() => ['72%'], []);

  const reset = useCallback(() => {
    setTitle('');
    setTotal('');
    setParticipants('');
  }, []);

  const close = useCallback(() => {
    sheetRef.current?.dismiss();
  }, []);

  useImperativeHandle(ref, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: close,
  }));

  const handleSubmit = () => {
    const amount = Number.parseFloat(total);
    const participantNames = participants
      .split(/[\n,]+/)
      .map((name) => name.trim())
      .filter(Boolean);

    if (!title.trim()) {
      Alert.alert('Missing title', 'Add a name for this bill.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Invalid total', 'Enter a total greater than zero.');
      return;
    }
    if (participantNames.length === 0) {
      Alert.alert('Missing people', 'Add at least one person to split with.');
      return;
    }

    addSplit({ title: title.trim(), total: amount, participantNames });
    notifySuccess(toast, 'Split added');
    close();
    reset();
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
            <GlassButton variant="ghost" size="sm" onPress={close}>
              <GlassButton.Label>Cancel</GlassButton.Label>
            </GlassButton>
            <Text style={styles.title}>New split</Text>
            <GlassButton variant="primary" size="sm" onPress={handleSubmit}>
              <GlassButton.Label>Save</GlassButton.Label>
            </GlassButton>
          </View>

          <BottomSheetScrollView
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.formContent}
          >
            <TextField isRequired>
              <Label>Title</Label>
              <BottomSheetTextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Dinner, groceries, trip"
                placeholderTextColor={palette.placeholder}
                style={styles.input}
                autoCapitalize="sentences"
                keyboardAppearance={keyboardAppearance}
              />
            </TextField>

            <TextField isRequired>
              <Label>Total</Label>
              <View style={styles.amountRow}>
                <Text style={styles.currencySymbol}>{symbol}</Text>
                <BottomSheetTextInput
                  value={total}
                  onChangeText={setTotal}
                  placeholder="0.00"
                  placeholderTextColor={palette.placeholder}
                  keyboardType="decimal-pad"
                  style={[styles.input, styles.amountInput]}
                  keyboardAppearance={keyboardAppearance}
                />
              </View>
            </TextField>

            <TextField isRequired>
              <Label>People</Label>
              <BottomSheetTextInput
                value={participants}
                onChangeText={setParticipants}
                placeholder="Alex, Jordan, Sam"
                placeholderTextColor={palette.placeholder}
                multiline
                style={[styles.input, styles.participantsInput]}
                keyboardAppearance={keyboardAppearance}
              />
              <Description>Separate names with commas or new lines.</Description>
            </TextField>
          </BottomSheetScrollView>
        </BottomSheetView>
      </HeroUINativeProvider>
    </BottomSheetModal>
  );
});

AddBillSplitSheet.displayName = 'AddBillSplitSheet';
