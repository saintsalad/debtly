import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { HeroUINativeProvider } from 'heroui-native';
import { Banknote, CircleDollarSign, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import { ListDivider } from '@/components/ui/ListDivider';
import { useAppBottomSheetLayout } from '@/lib/appBottomSheet';
import { radius, space, type, useColors, type ColorPalette } from '@/lib/platform';

export interface RecordPaymentSheetHandle {
  present: () => void;
  dismiss: () => void;
}

interface RecordPaymentSheetProps {
  onSelectFull: () => void;
  onSelectPartial: () => void;
}

type PendingSelection = 'full' | 'partial';

const ANDROID_RECORD_PAYMENT_SHEET_HEIGHT = 292;

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
    headerSpacer: {
      width: 36,
      height: 36,
    },
    body: {
      paddingTop: space[4],
    },
    optionGroup: {
      backgroundColor: palette.fillSecondary,
      borderRadius: radius.lg,
      overflow: 'hidden',
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      paddingHorizontal: space[4],
      paddingVertical: space[5],
    },
    optionRowPressed: {
      opacity: 0.82,
    },
    optionCopy: {
      flex: 1,
      gap: space[1],
    },
    optionLabel: {
      ...type.body,
      color: palette.label,
    },
    optionDescription: {
      ...type.footnote,
      color: palette.labelSecondary,
    },
  });
}

interface PaymentOptionRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onPress: () => void;
  showSeparator?: boolean;
}

function PaymentOptionRow({
  icon,
  label,
  description,
  onPress,
  showSeparator = false,
}: PaymentOptionRowProps) {
  const palette = useColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <>
      {showSeparator ? <ListDivider /> : null}
      <Pressable
        accessibilityRole="button"
        onPress={handlePress}
        style={({ pressed }) => [styles.optionRow, pressed && styles.optionRowPressed]}
        android_ripple={{ color: palette.fill, borderless: false }}
      >
        {icon}
        <View style={styles.optionCopy}>
          <Text style={styles.optionLabel}>{label}</Text>
          <Text style={styles.optionDescription}>{description}</Text>
        </View>
      </Pressable>
    </>
  );
}

export const RecordPaymentSheet = forwardRef<RecordPaymentSheetHandle, RecordPaymentSheetProps>(
  function RecordPaymentSheet({ onSelectFull, onSelectPartial }, ref) {
    const palette = useColors();
    const styles = useMemo(() => createStyles(palette), [palette]);
    const {
      topInset,
      bottomInset,
      contentBottomPadding,
      containerComponent,
      presentSheet,
    } = useAppBottomSheetLayout();
    const insets = useSafeAreaInsets();
    const sheetRef = useRef<BottomSheetModal>(null);
    const pendingSelectionRef = useRef<PendingSelection | null>(null);
    const isAndroid = Platform.OS === 'android';
    const snapPoints = useMemo(
      () =>
        isAndroid
          ? [ANDROID_RECORD_PAYMENT_SHEET_HEIGHT + insets.bottom]
          : ['34%'],
      [insets.bottom, isAndroid]
    );
    const sheetContentBottomPadding = isAndroid
      ? insets.bottom + space[4]
      : contentBottomPadding;

    const reset = useCallback(() => {
      pendingSelectionRef.current = null;
    }, []);

    const dismiss = useCallback(() => {
      sheetRef.current?.dismiss();
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        present: () => {
          pendingSelectionRef.current = null;
          presentSheet(() => {
            sheetRef.current?.present();
          });
        },
        dismiss,
      }),
      [dismiss, presentSheet]
    );

    const handleDismiss = useCallback(() => {
      const pendingSelection = pendingSelectionRef.current;
      reset();

      if (pendingSelection === 'full') {
        onSelectFull();
        return;
      }

      if (pendingSelection === 'partial') {
        onSelectPartial();
      }
    }, [onSelectFull, onSelectPartial, reset]);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
      ),
      []
    );

    const selectFull = () => {
      pendingSelectionRef.current = 'full';
      dismiss();
    };

    const selectPartial = () => {
      pendingSelectionRef.current = 'partial';
      dismiss();
    };

    const optionGroup = (
      <View style={styles.optionGroup}>
        <PaymentOptionRow
          icon={<CircleDollarSign size={18} color={palette.tint} />}
          label="Full payment"
          description="Settles the remaining balance"
          onPress={selectFull}
        />
        <PaymentOptionRow
          icon={<Banknote size={18} color={palette.tint} />}
          label="Partial payment"
          description="Record a smaller amount"
          onPress={selectPartial}
          showSeparator
        />
      </View>
    );

    return (
      <BottomSheetModal
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        onDismiss={handleDismiss}
        topInset={topInset}
        bottomInset={bottomInset}
        containerComponent={containerComponent}
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.sheet}
      >
        <HeroUINativeProvider>
          <BottomSheetView style={[styles.content, { paddingBottom: sheetContentBottomPadding }]}>
            <View style={styles.header}>
              <HeaderIconButton icon={X} accessibilityLabel="Cancel" onPress={dismiss} />
              <Text style={styles.title}>Record payment</Text>
              <View style={styles.headerSpacer} />
            </View>

            <View style={styles.body}>{optionGroup}</View>
          </BottomSheetView>
        </HeroUINativeProvider>
      </BottomSheetModal>
    );
  }
);

RecordPaymentSheet.displayName = 'RecordPaymentSheet';
