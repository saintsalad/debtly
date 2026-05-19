import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ExpenseReceiptViewerProps {
  visible: boolean;
  uri: string;
  onClose: () => void;
}

export function ExpenseReceiptViewer({ visible, uri, onClose }: ExpenseReceiptViewerProps) {
  const insets = useSafeAreaInsets();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: '#000',
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingBottom: 8,
        },
        title: {
          color: '#fff',
          fontSize: 17,
          fontWeight: '600',
        },
        body: {
          flex: 1,
        },
        image: {
          flex: 1,
          width: '100%',
        },
      }),
    []
  );

  if (!visible || !uri) return null;

  return (
    <Modal
      visible
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            Receipt
          </Text>
          <HeaderIconButton
            icon={X}
            accessibilityLabel="Close receipt"
            onPress={onClose}
            appearance="onDark"
          />
        </View>
        <Pressable style={styles.body} onPress={onClose} accessibilityLabel="Close receipt">
          <Image
            source={{ uri }}
            style={styles.image}
            contentFit="contain"
            accessibilityLabel="Receipt photo"
          />
        </Pressable>
      </View>
    </Modal>
  );
}
