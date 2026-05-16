import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { HeroUINativeProvider } from 'heroui-native';
import { GlassButton } from '@/components/ui/GlassButton';
import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import { captureStoryReceiptImage } from '@/features/debts/receipt/captureReceiptImage';
import { RECEIPT_SCRIM } from '@/features/debts/receipt/receiptTheme';
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
      backgroundColor: RECEIPT_SCRIM,
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
      color: '#1A1A1A',
      textAlign: 'center',
    },
    subtitle: {
      ...type.caption1,
      color: 'rgba(26,26,26,0.65)',
      textAlign: 'center',
      marginTop: 2,
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
      paddingTop: space[3],
      gap: space[3],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: 'rgba(0,0,0,0.12)',
      backgroundColor: RECEIPT_SCRIM,
    },
    shareRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space[2],
    },
  });
}

export function TransactionReceiptScreen({ debt, fmt, onClose }: TransactionReceiptScreenProps) {
  const palette = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const captureRef = useRef<View>(null);
  const [busy, setBusy] = useState<'save' | 'share' | null>(null);

  const exportImage = useCallback(async () => captureStoryReceiptImage(captureRef), []);

  const handleSave = useCallback(async () => {
    if (busy) return;
    setBusy('save');
    try {
      const uri = await exportImage();
      if (!uri) return;
      const saved = await saveReceiptToPhotos(uri);
      if (saved) {
        Alert.alert('Saved', 'Receipt image saved to your photo library (9:16 story).');
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
    <HeroUINativeProvider>
      <View style={styles.root} collapsable={false}>
        <View style={[styles.header, { paddingTop: insets.top + space[2] }]}>
          <HeaderIconButton icon={X} accessibilityLabel="Close" onPress={onClose} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Receipt</Text>
            <Text style={styles.subtitle}>9:16 story · 1080×1920</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.previewScale}>
            <TransactionReceiptStoryFrame debt={debt} fmt={fmt} />
          </View>
        </ScrollView>

        <View style={styles.captureHost} pointerEvents="none" collapsable={false}>
          <View ref={captureRef} collapsable={false}>
            <TransactionReceiptStoryFrame debt={debt} fmt={fmt} />
          </View>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + space[4] }]}>
          <GlassButton
            variant="primary"
            size="lg"
            className="w-full"
            onPress={handleSave}
            isDisabled={isBusy}
          >
            {busy === 'save' ? (
              <View style={styles.shareRow}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <GlassButton.Label>Saving…</GlassButton.Label>
              </View>
            ) : (
              <GlassButton.Label>Save to Photos</GlassButton.Label>
            )}
          </GlassButton>
          <GlassButton
            variant="secondary"
            size="lg"
            className="w-full"
            onPress={handleShare}
            isDisabled={isBusy}
          >
            {busy === 'share' ? (
              <View style={styles.shareRow}>
                <ActivityIndicator color={palette.tint} size="small" />
                <GlassButton.Label>Preparing…</GlassButton.Label>
              </View>
            ) : (
              <GlassButton.Label>Share image</GlassButton.Label>
            )}
          </GlassButton>
        </View>
      </View>
    </HeroUINativeProvider>
  );
}
