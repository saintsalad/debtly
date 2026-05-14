import React, { useMemo, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Button } from 'heroui-native';
import { Users } from 'lucide-react-native';
import { AppScreen, useCollapsibleHeader } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { AddBillSplitSheet, type AddBillSplitSheetHandle } from '@/features/bill-split/AddBillSplitSheet';
import { BillSplitCard } from '@/features/bill-split/BillSplitCard';
import { useBillSplitStore } from '@/stores/billSplitStore';
import { useCardShadow, useColors, layout, radius, space, type, type ColorPalette } from '@/lib/platform';

function createStyles(palette: ColorPalette, shadow: ReturnType<typeof useCardShadow>) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: space[3],
      paddingHorizontal: space[4],
      paddingBottom: space[6],
    },
    headerCopy: {
      flex: 1,
      gap: space[1],
    },
    title: {
      ...type.largeTitle,
      fontWeight: '600',
      color: palette.label,
    },
    subtitle: {
      ...type.footnote,
      color: palette.labelSecondary,
    },
    listContent: {
      paddingHorizontal: space[4],
    },
    listGroup: {
      backgroundColor: palette.surface,
      borderRadius: radius.lg,
      overflow: 'hidden',
      ...shadow,
    },
    listEmpty: {
      flexGrow: 1,
    },
  });
}

export default function BillSplitScreen() {
  const palette = useColors();
  const shadow = useCardShadow();
  const styles = useMemo(() => createStyles(palette, shadow), [palette, shadow]);
  const splits = useBillSplitStore((s) => s.splits);
  const sheetRef = useRef<AddBillSplitSheetHandle>(null);
  const { onScroll, headerSpacerHeight } = useCollapsibleHeader();

  return (
    <AppScreen>
      <View style={[styles.header, { paddingTop: headerSpacerHeight }]}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Bill split</Text>
          <Text style={styles.subtitle}>
            {splits.length === 0
              ? 'Split shared expenses evenly'
              : `${splits.length} active ${splits.length === 1 ? 'split' : 'splits'}`}
          </Text>
        </View>
        <Button size="sm" variant="primary" onPress={() => sheetRef.current?.present()}>
          <Button.Label>New split</Button.Label>
        </Button>
      </View>

      <Animated.FlatList
        data={splits}
        keyExtractor={(item) => item.id}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          splits.length === 0 && styles.listEmpty,
          splits.length > 0 && styles.listGroup,
          Platform.OS === 'ios' && { paddingBottom: layout.screenPaddingBottom },
        ]}
        renderItem={({ item, index }) => (
          <BillSplitCard split={item} showSeparator={index < splits.length - 1} />
        )}
        ListEmptyComponent={
          <EmptyState
            title="No splits yet"
            subtitle="Create a split to divide a bill with friends."
            icon={<Users size={40} color={palette.labelTertiary} />}
          />
        }
      />

      <AddBillSplitSheet ref={sheetRef} />
    </AppScreen>
  );
}

