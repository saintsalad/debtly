import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Description, HeroUINativeProvider, Label, TextField, useToast } from 'heroui-native';
import { GlassButton } from '@/components/ui/GlassButton';
import { useAppBottomSheetLayout } from '@/lib/appBottomSheet';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useColors, space, type, type ColorPalette } from '@/lib/platform';
import { useGroupExpenseStore } from '@/stores/groupExpenseStore';
import { notifySuccess } from '@/lib/appToast';
import { useRouter } from 'expo-router';

export interface CreateGroupSheetHandle {
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
    handle: { width: 40, backgroundColor: palette.opaqueSeparator },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space[5],
      paddingBottom: space[3],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.opaqueSeparator,
    },
    title: { ...type.headline, fontWeight: '600', color: palette.label },
    form: {
      gap: space[4],
      paddingHorizontal: space[5],
      paddingTop: space[4],
      paddingBottom: space[8],
    },
    input: {
      paddingHorizontal: space[4],
      paddingVertical: space[3],
      borderRadius: 14,
      backgroundColor: palette.fill,
      color: palette.label,
      fontSize: 17,
    },
  });
}

export const CreateGroupSheet = forwardRef<CreateGroupSheetHandle>(function CreateGroupSheet(_, ref) {
  const palette = useColors();
  const colorScheme = useAppColorScheme();
  const styles = useMemo(() => createSheetStyles(palette), [palette]);
  const keyboardAppearance = colorScheme === 'dark' ? 'dark' : 'light';
  const sheetRef = useRef<BottomSheetModal>(null);
  const { contentBottomPadding, containerComponent, presentSheet } = useAppBottomSheetLayout();
  const createGroup = useGroupExpenseStore((s) => s.createGroup);
  const router = useRouter();
  const [name, setName] = useState('');
  const { toast } = useToast();

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    []
  );

  useImperativeHandle(ref, () => ({
    present: () => {
      setName('');
      presentSheet(() => sheetRef.current?.present());
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleCreate = () => {
    const id = createGroup({ name });
    if (!id) {
      Alert.alert('Name required', 'Give your group a name to continue.');
      return;
    }
    notifySuccess(toast, 'Group created', 'You can add expenses and invite others.');
    sheetRef.current?.dismiss();
    router.push({ pathname: '/group/[id]', params: { id } });
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.sheet}
      containerComponent={containerComponent}
      keyboardBehavior="interactive"
    >
      <HeroUINativeProvider>
        <View style={styles.header}>
          <Text style={styles.title}>New group</Text>
          <GlassButton size="sm" variant="ghost" onPress={() => sheetRef.current?.dismiss()}>
            <GlassButton.Label>Cancel</GlassButton.Label>
          </GlassButton>
        </View>
        <BottomSheetScrollView
          contentContainerStyle={[styles.form, { paddingBottom: contentBottomPadding }]}
          keyboardShouldPersistTaps="handled"
        >
          <TextField>
            <Label>Group name</Label>
            <BottomSheetTextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Trip, Roommates, Office lunch…"
              placeholderTextColor={palette.labelTertiary}
              keyboardAppearance={keyboardAppearance}
              autoFocus
            />
            <Description>You can invite members after creating the group.</Description>
          </TextField>
          <GlassButton variant="primary" onPress={handleCreate}>
            <GlassButton.Label>Create group</GlassButton.Label>
          </GlassButton>
        </BottomSheetScrollView>
      </HeroUINativeProvider>
    </BottomSheetModal>
  );
});
