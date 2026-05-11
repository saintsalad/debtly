import React, { useState } from 'react';
import {
  Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Avatar } from '@/components/ui/Avatar';
import { useDebtStore, useDebtSummary } from '@/stores/debtStore';
import { useProfileStore } from '@/stores/profileStore';
import { CURRENCIES } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { colors, type, space, radius, cardShadow } from '@/lib/platform';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface RowProps {
  icon: MaterialIconName;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  last?: boolean;
}

function Row({ icon, label, value, onPress, destructive, last }: RowProps) {
  return (
    <>
      <TouchableOpacity
        style={styles.row}
        onPress={onPress}
        activeOpacity={onPress ? 0.5 : 1}
        disabled={!onPress}
      >
        <MaterialIcons
          name={icon}
          size={20}
          color={destructive ? colors.negative : colors.labelSecondary}
          style={styles.rowIcon}
        />
        <Text style={[styles.rowLabel, destructive && { color: colors.negative }]}>{label}</Text>
        <View style={styles.rowRight}>
          {value ? <Text style={styles.rowValue}>{value}</Text> : null}
          {onPress ? (
            <MaterialIcons name="chevron-right" size={20} color={colors.labelTertiary} />
          ) : null}
        </View>
      </TouchableOpacity>
      {!last && <View style={styles.rowSeparator} />}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

export default function ProfileScreen() {
  const { totalOwedToMe, totalIOwe, settledCount } = useDebtSummary();
  const name = useProfileStore((s) => s.name);
  const setName = useProfileStore((s) => s.setName);
  const setCurrency = useProfileStore((s) => s.setCurrency);
  const clearAll = useDebtStore((s) => s.clearAll);
  const { currency, fmt } = useCurrency();

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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Profile</Text>
        </View>

        {/* Identity card */}
        <View style={styles.identityCard}>
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
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: colors.positive }]}>{fmt(totalOwedToMe)}</Text>
            <Text style={styles.statLabel}>Receivable</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: colors.negative }]}>{fmt(totalIOwe)}</Text>
            <Text style={styles.statLabel}>Payable</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: colors.tint }]}>{settledCount}</Text>
            <Text style={styles.statLabel}>Settled</Text>
          </View>
        </View>

        {/* Settings */}
        <Section title="Preferences">
          <Row
            icon="account-balance-wallet"
            label="Currency"
            value={`${CURRENCIES[currency]?.symbol ?? ''} ${currency}`}
            onPress={pickCurrency}
            last
          />
        </Section>

        <Section title="About">
          <Row icon="info-outline" label="Version" value="1.0.0" last />
        </Section>

        <Section title="Data">
          <Row
            icon="delete-forever"
            label="Clear all data"
            onPress={confirmClearAll}
            destructive
            last
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 120 },
  header: {
    paddingHorizontal: space[5],
    paddingTop: space[4],
    paddingBottom: space[5],
  },
  pageTitle: { ...type.title1, color: colors.label },

  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
    backgroundColor: colors.surface,
    marginHorizontal: space[5],
    borderRadius: radius.card,
    padding: space[4],
    marginBottom: space[3],
    ...cardShadow,
  },
  identityBody: { flex: 1 },
  identityName: { ...type.title3, color: colors.label },
  identityHint: { ...type.caption1, color: colors.labelTertiary, marginTop: 2 },
  nameInput: {
    ...type.title3,
    color: colors.label,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.tint,
    paddingBottom: 1,
  },
  offlineTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space[2] + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.positiveSoft,
  },
  offlineDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.positive },
  offlineLabel: { ...type.caption2, color: colors.positive, fontWeight: '500' },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: space[5],
    borderRadius: radius.card,
    paddingVertical: space[4],
    marginBottom: space[5],
    ...cardShadow,
  },
  statCell: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontSize: 18, fontWeight: '600', letterSpacing: -0.4 },
  statLabel: { ...type.caption2, color: colors.labelSecondary, fontWeight: '500' },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.opaqueSeparator,
    marginVertical: space[1],
  },

  section: { marginBottom: space[4], paddingHorizontal: space[5] },
  sectionTitle: {
    ...type.footnote,
    color: colors.labelSecondary,
    marginBottom: space[2],
    paddingLeft: space[1],
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: 'hidden',
    ...cardShadow,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingVertical: 14,
    gap: space[3],
  },
  rowIcon: { width: 22, textAlign: 'center' },
  rowLabel: { ...type.subheadline, color: colors.label, flex: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowValue: { ...type.subheadline, color: colors.labelSecondary },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.opaqueSeparator,
    marginLeft: space[4] + 22 + space[3],
  },
});
