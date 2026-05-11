import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import { useDebtStore, useDebtSummary } from '@/stores/debtStore';
import { useProfileStore } from '@/stores/profileStore';
import { CURRENCIES } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';

interface SettingRowProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  last?: boolean;
}

function SettingRow({ icon, label, value, onPress, destructive, last }: SettingRowProps) {
  return (
    <>
      <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.6}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <Text style={[styles.settingLabel, destructive && styles.destructiveLabel]}>{label}</Text>
        <View style={styles.settingRight}>
          {value ? <Text style={styles.settingValue}>{value}</Text> : null}
          {onPress ? <Text style={styles.chevron}>›</Text> : null}
        </View>
      </TouchableOpacity>
      {!last && <View style={styles.divider} />}
    </>
  );
}

export default function ProfileScreen() {
  const { totalOwedToMe, totalIOwe, settledCount } = useDebtSummary();
  const name = useProfileStore((s) => s.name);
  const setName = useProfileStore((s) => s.setName);
  const clearAll = useDebtStore((s) => s.clearAll);

  const { currency, fmt } = useCurrency();
  const setCurrency = useProfileStore((s) => s.setCurrency);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);

  const handleSaveName = () => {
    const trimmed = editName.trim();
    if (trimmed) setName(trimmed);
    setEditing(false);
  };

  const handleCurrencyPick = () => {
    const options = Object.entries(CURRENCIES).map(([code, { symbol, label }]) => ({
      text: `${symbol}  ${code} — ${label}`,
      onPress: () => setCurrency(code),
      style: code === currency ? ('default' as const) : ('default' as const),
    }));
    Alert.alert('Select Currency', '', [
      ...options,
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleClearAll = () => {
    Alert.alert('Clear all data?', 'This will delete all debts. Cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearAll },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Avatar name={name} size={72} />
          <View style={styles.profileInfo}>
            {editing ? (
              <TextInput
                style={styles.nameInput}
                value={editName}
                onChangeText={setEditName}
                onSubmitEditing={handleSaveName}
                onBlur={handleSaveName}
                autoFocus
                returnKeyType="done"
                selectTextOnFocus
              />
            ) : (
              <TouchableOpacity onPress={() => { setEditName(name); setEditing(true); }}>
                <Text style={styles.profileName}>{name}</Text>
                <Text style={styles.editHint}>Tap to edit name</Text>
              </TouchableOpacity>
            )}
            <View style={styles.offlinePill}>
              <View style={styles.offlineDot} />
              <Text style={styles.offlineText}>Offline-first</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
            <Text style={[styles.statValue, { color: '#16A34A' }]}>{fmt(totalOwedToMe)}</Text>
            <Text style={styles.statLabel}>Receivable</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEF2F2' }]}>
            <Text style={[styles.statValue, { color: '#DC2626' }]}>{fmt(totalIOwe)}</Text>
            <Text style={styles.statLabel}>Payable</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F0F9FF' }]}>
            <Text style={[styles.statValue, { color: '#0284C7' }]}>{settledCount}</Text>
            <Text style={styles.statLabel}>Settled</Text>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          <View style={styles.settingsCard}>
            <SettingRow icon="📱" label="Version" value="1.0.0" />
            <SettingRow
              icon="💱"
              label="Currency"
              value={`${CURRENCIES[currency]?.symbol ?? ''} ${currency}`}
              onPress={handleCurrencyPick}
              last
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sync</Text>
          <View style={styles.settingsCard}>
            <SettingRow icon="☁️" label="Cloud Sync" value="Coming soon" last />
          </View>
        </View>

        <View style={[styles.section, { marginBottom: 40 }]}>
          <Text style={styles.sectionTitle}>Data</Text>
          <View style={styles.settingsCard}>
            <SettingRow
              icon="🗑"
              label="Clear All Data"
              onPress={handleClearAll}
              destructive
              last
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { paddingBottom: 120 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  profileInfo: { flex: 1, gap: 8 },
  profileName: { fontSize: 20, fontWeight: '700', color: '#111827' },
  editHint: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  nameInput: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    borderBottomWidth: 1.5,
    borderBottomColor: '#007AFF',
    paddingBottom: 2,
  },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  offlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A' },
  offlineText: { fontSize: 11, color: '#16A34A', fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 18, padding: 14, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 17, fontWeight: '800', letterSpacing: -0.4 },
  statLabel: { fontSize: 10, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  section: { paddingHorizontal: 20, marginBottom: 16 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 12,
  },
  settingIcon: { fontSize: 18 },
  settingLabel: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '500' },
  destructiveLabel: { color: '#DC2626' },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  settingValue: { fontSize: 13, color: '#9CA3AF' },
  chevron: { fontSize: 20, color: '#D1D5DB' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#F3F4F6', marginLeft: 50 },
});
