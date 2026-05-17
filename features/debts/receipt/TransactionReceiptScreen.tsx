import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Download, Grid3x3, ImagePlus, Palette, Ratio, Share2, X } from 'lucide-react-native';
import { pickReceiptPhotoFromLibrary } from '@/features/debts/receipt/pickReceiptPhoto';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { HeroUINativeProvider, useToast } from 'heroui-native';
import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import { captureStoryReceiptImage } from '@/features/debts/receipt/captureReceiptImage';
import {
  ReceiptAspectSheet,
  type ReceiptAspectSheetHandle,
} from '@/features/debts/receipt/ReceiptAspectSheet';
import {
  ReceiptBackgroundSheet,
  type ReceiptBackgroundSheetHandle,
} from '@/features/debts/receipt/ReceiptBackgroundSheet';
import {
  ReceiptBitmapLabSheet,
  type ReceiptBitmapLabSheetHandle,
} from '@/features/debts/receipt/ReceiptBitmapLabSheet';
import { ReceiptCircleButton } from '@/features/debts/receipt/ReceiptCircleButton';
import {
  getReceiptExportSize,
  getReceiptAspectPreset,
  type ReceiptAspectPresetId,
} from '@/features/debts/receipt/receiptAspectPresets';
import {
  getReceiptCanvasBackground,
  type ReceiptCanvasPresetId,
} from '@/features/debts/receipt/receiptCanvasPresets';
import {
  saveReceiptToPhotos,
  shareReceiptImage,
} from '@/features/debts/receipt/shareReceiptImage';
import { TransactionReceiptStoryFrame } from '@/features/debts/receipt/TransactionReceiptStoryFrame';
import {
  DEFAULT_THERMALIZE_OPTIONS,
  processThermalImage,
  type ThermalizeOptions,
} from '@/features/debts/receipt/thermalPortrait';
import type { Debt } from '@/features/debts/types';
import { space, type, useColors, type ColorPalette } from '@/lib/platform';
import { notifySuccess } from '@/lib/appToast';
import { useProfileStore } from '@/stores/profileStore';

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
    actionsScroll: {
      width: '100%',
    },
    actionsScrollContent: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: space[4],
      paddingHorizontal: space[1],
      minWidth: '100%',
      justifyContent: 'center',
    },
  });
}

export function TransactionReceiptScreen({ debt, fmt, onClose }: TransactionReceiptScreenProps) {
  const palette = useColors();
  const insets = useSafeAreaInsets();
  const { toast } = useToast();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const captureRef = useRef<View>(null);
  const backgroundSheetRef = useRef<ReceiptBackgroundSheetHandle>(null);
  const aspectSheetRef = useRef<ReceiptAspectSheetHandle>(null);
  const bitmapLabRef = useRef<ReceiptBitmapLabSheetHandle>(null);
  const receiptThermalLook = useProfileStore((s) => s.receiptThermalLook ?? true);
  const [busy, setBusy] = useState<'save' | 'share' | null>(null);
  const [canvasPreset, setCanvasPreset] = useState<ReceiptCanvasPresetId>('black');
  const [aspectPresetId, setAspectPresetId] = useState<ReceiptAspectPresetId>('story');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [thermalOpts, setThermalOpts] = useState<ThermalizeOptions>(() => ({
    ...DEFAULT_THERMALIZE_OPTIONS,
  }));
  const [thermalOutputUri, setThermalOutputUri] = useState<string | null>(null);
  const canvasBackground = useMemo(() => getReceiptCanvasBackground(canvasPreset), [canvasPreset]);
  const aspectPreset = useMemo(() => getReceiptAspectPreset(aspectPresetId), [aspectPresetId]);
  const exportPixelSize = useMemo(() => getReceiptExportSize(aspectPreset), [aspectPreset]);

  const displayPhotoUri = useMemo(() => {
    if (!photoUri) return null;
    if (!receiptThermalLook) return photoUri;
    return thermalOutputUri ?? photoUri;
  }, [photoUri, receiptThermalLook, thermalOutputUri]);

  useEffect(() => {
    if (!photoUri || !receiptThermalLook) {
      setThermalOutputUri(null);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      void processThermalImage(photoUri, thermalOpts)
        .then((out) => {
          if (!cancelled) setThermalOutputUri(out);
        })
        .catch(() => {
          if (!cancelled) setThermalOutputUri(null);
        });
    }, 320);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [photoUri, receiptThermalLook, thermalOpts]);

  const exportImage = useCallback(
    async () => captureStoryReceiptImage(captureRef, exportPixelSize),
    [exportPixelSize],
  );

  const pickPhoto = useCallback(async () => {
    const uri = await pickReceiptPhotoFromLibrary();
    if (uri) setPhotoUri(uri);
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
          if (index === 2) {
            setPhotoUri(null);
            setThermalOutputUri(null);
          }
        }
      );
      return;
    }

    Alert.alert('Receipt photo', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Change photo', onPress: () => void pickPhoto() },
      {
        text: 'Remove photo',
        style: 'destructive',
        onPress: () => {
          setPhotoUri(null);
          setThermalOutputUri(null);
        },
      },
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
        notifySuccess(toast, 'Saved', 'Receipt image saved to your photo library.');
      }
    } finally {
      setBusy(null);
    }
  }, [busy, exportImage, toast]);

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
                canvasBackground={canvasBackground}
                photoUri={displayPhotoUri}
                frameWidth={aspectPreset.frameWidth}
                frameHeight={aspectPreset.frameHeight}
              />
            </View>
          </ScrollView>

          <View style={styles.captureHost} pointerEvents="none" collapsable={false}>
            <View ref={captureRef} collapsable={false}>
              <TransactionReceiptStoryFrame
                debt={debt}
                fmt={fmt}
                canvasBackground={canvasBackground}
                photoUri={displayPhotoUri}
                frameWidth={aspectPreset.frameWidth}
                frameHeight={aspectPreset.frameHeight}
              />
            </View>
          </View>

          <View style={[styles.footer, { paddingBottom: insets.bottom + space[4] }]}>
            <ScrollView
              horizontal
              style={styles.actionsScroll}
              contentContainerStyle={styles.actionsScrollContent}
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <ReceiptCircleButton
                icon={Palette}
                label="Background"
                onPress={() => backgroundSheetRef.current?.present()}
                disabled={isBusy}
              />
              <ReceiptCircleButton
                icon={Ratio}
                label="Size"
                onPress={() => aspectSheetRef.current?.present()}
                disabled={isBusy}
              />
              <ReceiptCircleButton
                icon={ImagePlus}
                label={photoUri ? 'Photo' : 'Add photo'}
                onPress={handlePhotoPress}
                disabled={isBusy}
              />
              {photoUri ? (
                <ReceiptCircleButton
                  icon={Grid3x3}
                  label="Bitmap lab"
                  onPress={() => bitmapLabRef.current?.present()}
                  disabled={isBusy}
                />
              ) : null}
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
            </ScrollView>
          </View>

          <ReceiptBackgroundSheet
            ref={backgroundSheetRef}
            selectedId={canvasPreset}
            onSelect={setCanvasPreset}
          />
          <ReceiptAspectSheet
            ref={aspectSheetRef}
            selectedId={aspectPresetId}
            onSelect={setAspectPresetId}
          />
          <ReceiptBitmapLabSheet
            ref={bitmapLabRef}
            thermalEnabled={receiptThermalLook}
            options={thermalOpts}
            onOptionsChange={setThermalOpts}
          />
        </View>
      </HeroUINativeProvider>
    </BottomSheetModalProvider>
  );
}
