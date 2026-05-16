import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Download, ImagePlus, Palette, Share2, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { HeroUINativeProvider } from 'heroui-native';
import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import { captureStoryReceiptImage } from '@/features/debts/receipt/captureReceiptImage';
import {
  ReceiptBackgroundSheet,
  type ReceiptBackgroundSheetHandle,
} from '@/features/debts/receipt/ReceiptBackgroundSheet';
import { ReceiptCircleButton } from '@/features/debts/receipt/ReceiptCircleButton';
import {
  getReceiptCanvasColor,
  type ReceiptCanvasPresetId,
} from '@/features/debts/receipt/receiptCanvasPresets';
import {
  saveReceiptToPhotos,
  shareReceiptImage,
} from '@/features/debts/receipt/shareReceiptImage';
import { TransactionReceiptStoryFrame } from '@/features/debts/receipt/TransactionReceiptStoryFrame';
import type { Debt } from '@/features/debts/types';
import { space, type, useColors, type ColorPalette } from '@/lib/platform';

interface TransactionReceiptScreenProps {
  debt: Debt;
  fmt: (amount: number) => string;
  onClose: () => void;
}

const CAPTURE_OFFSCREEN_X = 4000;

function createStyles(palette: ColorPalette) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: '#000000',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space[5],
      paddingBottom: space[3],
    },
    title: {
      flex: 1,
      ...type.headline,
      color: '#FFFFFF',
      textAlign: 'center',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: space[4],
      paddingBottom: space[4],
      alignItems: 'center',
    },
    previewScale: {
      transform: [{ scale: 0.88 }],
      marginVertical: -space[4],
    },
    captureHost: {
      position: 'absolute',
      left: -CAPTURE_OFFSCREEN_X,
      top: 0,
    },
    footer: {
      paddingHorizontal: space[5],
      paddingTop: space[4],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: 'rgba(255,255,255,0.2)',
      backgroundColor: '#000000',
    },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'flex-start',
      gap: space[4],
    },
  });
}

export function TransactionReceiptScreen({ debt, fmt, onClose }: TransactionReceiptScreenProps) {
  const palette = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const captureRef = useRef<View>(null);
  const backgroundSheetRef = useRef<ReceiptBackgroundSheetHandle>(null);
  const [busy, setBusy] = useState<'save' | 'share' | null>(null);
  const [canvasPreset, setCanvasPreset] = useState<ReceiptCanvasPresetId>('black');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const canvasColor = getReceiptCanvasColor(canvasPreset);

  const exportImage = useCallback(async () => captureStoryReceiptImage(captureRef), []);

  const pickPhoto = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photos access', 'Allow photo library access to insert a photo in your print.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.9,
    });

    if (result.canceled || !result.assets[0]?.uri) return;
    setPhotoUri(result.assets[0].uri);
  }, []);

  const handlePhotoPress = useCallback(() => {
    if (!photoUri) {
      void pickPhoto();
      return;
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Change photo', 'Remove photo'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 2,
        },
        (index) => {
          if (index === 1) void pickPhoto();
          if (index === 2) setPhotoUri(null);
        }
      );
      return;
    }

    Alert.alert('Receipt photo', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Change photo', onPress: () => void pickPhoto() },
      { text: 'Remove photo', style: 'destructive', onPress: () => setPhotoUri(null) },
    ]);
  }, [photoUri, pickPhoto]);

  const handleSave = useCallback(async () => {
    if (busy) return;
    setBusy('save');
    try {
      const uri = await exportImage();
      if (!uri) return;
      const saved = await saveReceiptToPhotos(uri);
      if (saved) {
        Alert.alert('Saved', 'Receipt image saved to your photo library.');
      }
    } finally {
      setBusy(null);
    }
  }, [busy, exportImage]);

  const handleShare = useCallback(async () => {
    if (busy) return;
    setBusy('share');
    try {
      const uri = await exportImage();
      if (!uri) return;
      await shareReceiptImage(uri);
    } finally {
      setBusy(null);
    }
  }, [busy, exportImage]);

  const isBusy = busy !== null;

  return (
    <BottomSheetModalProvider>
      <HeroUINativeProvider>
        <View style={styles.root} collapsable={false}>
          <View style={[styles.header, { paddingTop: insets.top + space[2] }]}>
            <HeaderIconButton
              icon={X}
              accessibilityLabel="Close"
              onPress={onClose}
              appearance="onDark"
            />
            <Text style={styles.title}>Receipt</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.previewScale}>
              <TransactionReceiptStoryFrame
                debt={debt}
                fmt={fmt}
                backgroundColor={canvasColor}
                photoUri={photoUri}
              />
            </View>
          </ScrollView>

          <View style={styles.captureHost} pointerEvents="none" collapsable={false}>
            <View ref={captureRef} collapsable={false}>
              <TransactionReceiptStoryFrame
                debt={debt}
                fmt={fmt}
                backgroundColor={canvasColor}
                photoUri={photoUri}
              />
            </View>
          </View>

          <View style={[styles.footer, { paddingBottom: insets.bottom + space[4] }]}>
            <View style={styles.actionsRow}>
              <ReceiptCircleButton
                icon={Palette}
                label="Background"
                onPress={() => backgroundSheetRef.current?.present()}
                disabled={isBusy}
              />
              <ReceiptCircleButton
                icon={ImagePlus}
                label={photoUri ? 'Photo' : 'Add photo'}
                onPress={handlePhotoPress}
                disabled={isBusy}
              />
              <ReceiptCircleButton
                icon={Download}
                label="Save"
                onPress={handleSave}
                disabled={isBusy}
                loading={busy === 'save'}
                variant="primary"
              />
              <ReceiptCircleButton
                icon={Share2}
                label="Share"
                onPress={handleShare}
                disabled={isBusy}
                loading={busy === 'share'}
                variant="primary"
              />
            </View>
          </View>

          <ReceiptBackgroundSheet
            ref={backgroundSheetRef}
            selectedId={canvasPreset}
            onSelect={setCanvasPreset}
          />
        </View>
      </HeroUINativeProvider>
    </BottomSheetModalProvider>
  );
}
