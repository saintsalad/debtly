import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import * as SystemUI from 'expo-system-ui';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppScreen } from '@/components/ui/AppScreen';
import { GlassCard } from '@/components/ui/GlassCard';
import { ChevronRight, Info, Moon, Receipt, Trash2, Wallet, type LucideIcon } from 'lucide-react-native';
import { Avatar } from '@/components/ui/Avatar';
import { ListDivider } from '@/components/ui/ListDivider';
import { useDebtStore } from '@/stores/debtStore';
import { useProfileStore } from '@/stores/profileStore';
import { CURRENCIES } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useColors, layout, type, space, radius, type ColorPalette } from '@/lib/platform';
import { useStatusBarScrollFade } from '@/lib/statusBarScrollFade';

interface RowProps {
  icon: LucideIcon;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  last?: boolean;
  palette: ColorPalette;
  styles: ReturnType<typeof createStyles>;
}

interface ToggleRowProps {
  icon: LucideIcon;
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  last?: boolean;
  palette: ColorPalette;
  styles: ReturnType<typeof createStyles>;
}

function ToggleRow({ icon: Icon, label, value, onValueChange, last, palette, styles }: ToggleRowProps) {
  return (
    <>
      <View style={styles.row}>
        <Icon size={20} color={palette.labelSecondary} style={styles.rowIcon} />
        <Text style={styles.rowLabel}>{label}</Text>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: palette.fill, true: palette.tintMuted }}
          thumbColor={palette.surface}
          ios_backgroundColor={palette.fill}
        />
      </View>
      {!last ? <ListDivider variant="glass" /> : null}
    </>
  );
}

function Row({ icon: Icon, label, value, onPress, destructive, last, palette, styles }: RowProps) {
  return (
    <>
      <TouchableOpacity
        style={styles.row}
        onPress={onPress}
        activeOpacity={onPress ? 0.5 : 1}
        disabled={!onPress}
      >
        <Icon
          size={20}
          color={destructive ? palette.negative : palette.labelSecondary}
          style={styles.rowIcon}
        />
        <Text style={[styles.rowLabel, destructive && { color: palette.negative }]}>{label}</Text>
        <View style={styles.rowRight}>
          {value ? <Text style={styles.rowValue}>{value}</Text> : null}
          {onPress ? (
            <ChevronRight size={20} color={palette.labelTertiary} />
          ) : null}
        </View>
      </TouchableOpacity>
      {!last ? <ListDivider variant="glass" /> : null}
    </>
  );
}

function Section({
  title,
  children,
  styles,
}: {
  title: string;
  children: React.ReactNode;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <GlassCard style={styles.sectionCard} borderRadius={radius.card}>
        {children}
      </GlassCard>
    </View>
  );
}

function createStyles(palette: ColorPalette) {
  return StyleSheet.create({
    content: {},
    header: {
      paddingHorizontal: space[5],
      paddingTop: space[4],
      paddingBottom: space[5],
    },
    pageTitle: { ...type.title1, color: palette.label },

    identityCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[4],
      marginHorizontal: space[5],
      padding: space[4],
      marginBottom: space[3],
    },
    identityBody: { flex: 1 },
    identityName: { ...type.title3, color: palette.label },
    identityHint: { ...type.caption1, color: palette.labelTertiary, marginTop: 2 },
    nameInput: {
      ...type.title3,
      color: palette.label,
      borderBottomWidth: 1.5,
      borderBottomColor: palette.tint,
      paddingBottom: 1,
    },
    offlineTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: space[2] + 2,
      paddingVertical: 4,
      borderRadius: radius.pill,
      backgroundColor: palette.positiveSoft,
    },
    offlineDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: palette.positive },
    offlineLabel: { ...type.caption2, color: palette.positive, fontWeight: '500' },

    section: { marginBottom: space[4], paddingHorizontal: space[5] },
    sectionTitle: {
      ...type.footnote,
      color: palette.labelSecondary,
      marginBottom: space[2],
      paddingLeft: space[1],
    },
    sectionCard: {},
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: space[4],
      paddingVertical: 14,
      gap: space[3],
    },
    rowIcon: { width: 22, textAlign: 'center' },
    rowLabel: { ...type.subheadline, color: palette.label, flex: 1 },
    rowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    rowValue: { ...type.subheadline, color: palette.labelSecondary },
  });
}

export default function ProfileScreen() {
  const colorScheme = useAppColorScheme();
  const palette = useColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const name = useProfileStore((s) => s.name);
  const setName = useProfileStore((s) => s.setName);
  const setCurrency = useProfileStore((s) => s.setCurrency);
  const setAppearance = useProfileStore((s) => s.setAppearance);
  const showSplitBillsInTransactions = useProfileStore((s) => s.showSplitBillsInTransactions);
  const setShowSplitBillsInTransactions = useProfileStore((s) => s.setShowSplitBillsInTransactions);
  const clearAll = useDebtStore((s) => s.clearAll);
  const { currency } = useCurrency();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);

  const commitName = () => {
    const t = editName.trim();
    if (t) setName(t);
    setEditing(false);
  };

  const pickCurrency = () => {
    Alert.alert('Currency', 'Select your currency', [
      ...Object.entries(CURRENCIES).map(([code, { symbol, label }]) => ({
        text: `${symbol}  ${code}  ·  ${label}`,
        onPress: () => setCurrency(code),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const confirmClearAll = () => {
    Alert.alert('Clear all data?', 'All debts will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete all', style: 'destructive', onPress: clearAll },
    ]);
  };
  const insets = useSafeAreaInsets();
  const { onScroll: statusBarScrollFadeOnScroll } = useStatusBarScrollFade();

  useFocusEffect(
    useCallback(() => {
      void SystemUI.setBackgroundColorAsync('transparent');
    }, [])
  );

  return (
    <AppScreen>
      <Animated.ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top },
          Platform.OS === 'ios' && { paddingBottom: layout.screenPaddingBottom },
        ]}
        scrollEventThrottle={16}
        onScroll={statusBarScrollFadeOnScroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Profile</Text>
        </View>

        <GlassCard style={styles.identityCard} borderRadius={radius.card}>
          <Avatar name={name} size={60} />
          <View style={styles.identityBody}>
            {editing ? (
              <TextInput
                style={styles.nameInput}
                value={editName}
                onChangeText={setEditName}
                onSubmitEditing={commitName}
                onBlur={commitName}
                autoFocus
                returnKeyType="done"
                selectTextOnFocus
                placeholderTextColor={palette.placeholder}
                keyboardAppearance={colorScheme === 'dark' ? 'dark' : 'light'}
              />
            ) : (
              <Pressable onPress={() => { setEditName(name); setEditing(true); }} hitSlop={4}>
                <Text style={styles.identityName}>{name}</Text>
                <Text style={styles.identityHint}>Tap to rename</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.offlineTag}>
            <View style={styles.offlineDot} />
            <Text style={styles.offlineLabel}>Offline</Text>
          </View>
        </GlassCard>

        <Section title="Preferences" styles={styles}>
          <ToggleRow
            icon={Moon}
            label="Dark appearance"
            value={colorScheme === 'dark'}
            onValueChange={(enabled) => setAppearance(enabled ? 'dark' : 'light')}
            palette={palette}
            styles={styles}
          />
          <Row
            icon={Wallet}
            label="Currency"
            value={`${CURRENCIES[currency]?.symbol ?? ''} ${currency}`}
            onPress={pickCurrency}
            palette={palette}
            styles={styles}
            last
          />
        </Section>

        <Section title="Transactions" styles={styles}>
          <ToggleRow
            icon={Receipt}
            label="Show split bills"
            value={showSplitBillsInTransactions}
            onValueChange={setShowSplitBillsInTransactions}
            palette={palette}
            styles={styles}
            last
          />
        </Section>

        <Section title="About" styles={styles}>
          <Row icon={Info} label="Version" value="1.0.0" palette={palette} styles={styles} last />
        </Section>

        <Section title="Data" styles={styles}>
          <Row
            icon={Trash2}
            label="Clear all data"
            onPress={confirmClearAll}
            destructive
            palette={palette}
            styles={styles}
            last
          />
        </Section>
      </Animated.ScrollView>
    </AppScreen>
  );
}
