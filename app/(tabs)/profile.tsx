import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import * as SystemUI from 'expo-system-ui';
import { useRouter } from 'expo-router';
import {
  Alert,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthActions } from '@convex-dev/auth/react';
import { useConvexAuth, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { AppScreen } from '@/components/ui/AppScreen';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import {
  ChevronRight,
  Grid3x3,
  Info,
  Moon,
  Receipt,
  Trash2,
  User,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { Avatar } from '@/components/ui/Avatar';
import { ListDivider } from '@/components/ui/ListDivider';
import { getDb } from '@/lib/db/client';
import { clearAllData } from '@/lib/db/clearAllData';
import {
  CurrencyPickerSheet,
  type CurrencyPickerSheetHandle,
} from '@/components/profile/CurrencyPickerSheet';
import { useProfileStore } from '@/stores/profileStore';
import { getCurrencyMeta, type SupportedCurrencyCode } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useColors, layout, type, space, radius, type ColorPalette } from '@/lib/platform';
import { useStatusBarScrollFade } from '@/lib/statusBarScrollFade';
import { notifySuccess } from '@/lib/appToast';
import { sansForWeight } from '@/lib/appFonts';
import { useToast } from 'heroui-native';
import { isConvexConfigured } from '@/lib/convex/env';

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

function ToggleRow({
  icon: Icon,
  label,
  value,
  onValueChange,
  last,
  palette,
  styles,
}: ToggleRowProps) {
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
          {onPress ? <ChevronRight size={20} color={palette.labelTertiary} /> : null}
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
    identityHandle: {
      ...type.subheadline,
      color: palette.labelSecondary,
      marginTop: 4,
      fontVariant: ['tabular-nums'],
    },
    identityHint: { ...type.caption1, color: palette.labelTertiary, marginTop: 4 },
    nameInput: {
      ...type.title3,
      color: palette.label,
      borderBottomWidth: 1.5,
      borderBottomColor: palette.tint,
      paddingBottom: 1,
    },
    identityActionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space[2],
      marginTop: space[3],
      alignSelf: 'flex-start',
      maxWidth: '100%',
    },
    convexTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: space[2] + 2,
      paddingVertical: 4,
      borderRadius: radius.pill,
      backgroundColor: palette.fillSecondary,
      marginLeft: space[3],
      flexShrink: 0,
    },
    convexTagLabel: {
      ...type.caption2,
      color: palette.labelSecondary,
      fontWeight: '500',
      fontFamily: sansForWeight('500'),
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
    offlineLabel: {
      ...type.caption2,
      color: palette.positive,
      fontWeight: '500',
      fontFamily: sansForWeight('500'),
    },

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

interface ProfileScreenImplProps {
  convexConfigured: boolean;
  convexAuthenticated: boolean;
  convexAuthLoading: boolean;
  convexSignOut?: () => Promise<void>;
  convexDeleteAccount?: () => Promise<void>;
  showDevDeleteAccount?: boolean;
}

function ProfileScreenImpl({
  convexConfigured,
  convexAuthenticated,
  convexAuthLoading,
  convexSignOut,
  convexDeleteAccount,
  showDevDeleteAccount = false,
}: ProfileScreenImplProps) {
  const colorScheme = useAppColorScheme();
  const palette = useColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const name = useProfileStore((s) => s.name);
  const username = useProfileStore((s) => s.username);
  const setName = useProfileStore((s) => s.setName);
  const setCurrency = useProfileStore((s) => s.setCurrency);
  const setAppearance = useProfileStore((s) => s.setAppearance);
  const receiptThermalLook = useProfileStore((s) => s.receiptThermalLook ?? true);
  const setReceiptThermalLook = useProfileStore((s) => s.setReceiptThermalLook);
  const showSplitBillsInTransactions = useProfileStore((s) => s.showSplitBillsInTransactions);
  const setShowSplitBillsInTransactions = useProfileStore((s) => s.setShowSplitBillsInTransactions);
  const router = useRouter();
  const { currency } = useCurrency();
  const { toast } = useToast();
  const currencyPickerRef = useRef<CurrencyPickerSheetHandle>(null);
  const currencyMeta = useMemo(() => getCurrencyMeta(currency), [currency]);

  const [renamingDisplayName, setRenamingDisplayName] = useState(false);
  const [editName, setEditName] = useState(name);

  const commitName = () => {
    const t = editName.trim();
    if (t) setName(t);
    setRenamingDisplayName(false);
  };

  const pickCurrency = () => {
    currencyPickerRef.current?.present();
  };

  const handleCurrencySelect = (code: SupportedCurrencyCode) => {
    setCurrency(code);
    notifySuccess(toast, 'Currency updated');
  };

  const needsAccountCreation =
    convexConfigured && !convexAuthLoading && !convexAuthenticated;

  const confirmClearAll = () => {
    Alert.alert(
      'Clear all data?',
      'All debts, groups, bill splits, and preferences will be reset on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete all',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await convexSignOut?.();
              } catch (e) {
                console.warn('[profile] Convex sign-out during clear failed', e);
              }
              await clearAllData(getDb());
              notifySuccess(toast, 'All data cleared');
            })();
          },
        },
      ]
    );
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'Permanently removes your Convex login (username + PIN) from the dev deployment. Local debts and groups on this device are cleared too.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              if (!convexDeleteAccount) return;
              try {
                await convexDeleteAccount();
                notifySuccess(toast, 'Account deleted');
              } catch (e) {
                const msg = e instanceof Error ? e.message : 'Could not delete account';
                Alert.alert('Delete failed', msg);
              }
            })();
          },
        },
      ]
    );
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
            {renamingDisplayName ? (
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
              <>
                <Text style={styles.identityName}>{name}</Text>
                {convexConfigured ? (
                  <Text style={styles.identityHandle}>
                    {username ? `@${username}` : convexAuthLoading ? 'Checking account…' : 'No account'}
                  </Text>
                ) : null}
                <Text style={styles.identityHint}>Display name appears in splits and receipts.</Text>
                <View style={styles.identityActionsRow}>
                  <GlassButton
                    variant="secondary"
                    onPress={() => {
                      setEditName(name);
                      setRenamingDisplayName(true);
                    }}>
                    <GlassButton.Label>Rename</GlassButton.Label>
                  </GlassButton>
                  {convexConfigured && needsAccountCreation ? (
                    <GlassButton variant="primary" onPress={() => router.push('/create-account')}>
                      <GlassButton.Label>Create account</GlassButton.Label>
                    </GlassButton>
                  ) : null}
                </View>
              </>
            )}
          </View>

          <View style={{ alignItems: 'flex-end', gap: space[3] }}>
            {convexConfigured ? (
              <View style={[styles.identityActionsRow, { marginLeft: 0 }]}>
                {convexAuthLoading ? (
                  <View style={styles.convexTag}>
                    <Text style={styles.convexTagLabel}>Checking…</Text>
                  </View>
                ) : convexAuthenticated ? (
                  <View style={styles.convexTag}>
                    <User size={12} color={palette.labelSecondary} />
                    <Text style={styles.convexTagLabel}>Signed in</Text>
                  </View>
                ) : (
                  <View style={styles.convexTag}>
                    <User size={12} color={palette.labelSecondary} />
                    <Text style={styles.convexTagLabel}>Not signed in</Text>
                  </View>
                )}
              </View>
            ) : null}
            <View style={styles.offlineTag}>
              <View style={styles.offlineDot} />
              <Text style={styles.offlineLabel}>Offline-first</Text>
            </View>
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
          <ToggleRow
            icon={Grid3x3}
            label="Thermal receipt photos"
            value={receiptThermalLook}
            onValueChange={setReceiptThermalLook}
            palette={palette}
            styles={styles}
          />
          <Row
            icon={Wallet}
            label="Currency"
            value={`${currencyMeta.symbol} ${currencyMeta.label}`}
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
            last={!showDevDeleteAccount}
          />
          {showDevDeleteAccount ? (
            <Row
              icon={Trash2}
              label="Delete account (dev)"
              onPress={confirmDeleteAccount}
              destructive
              palette={palette}
              styles={styles}
              last
            />
          ) : null}
        </Section>
      </Animated.ScrollView>

      <CurrencyPickerSheet
        ref={currencyPickerRef}
        selectedCode={currency}
        onSelect={handleCurrencySelect}
      />
    </AppScreen>
  );
}

export default function ProfileScreen() {
  return isConvexConfigured() ? (
    <ProfileScreenWithConvex />
  ) : (
    <ProfileScreenImpl
      convexConfigured={false}
      convexAuthenticated={false}
      convexAuthLoading={false}
      convexSignOut={undefined}
    />
  );
}

function ProfileScreenWithConvex() {
  const { signOut } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const deleteMyAccount = useMutation(api.account.deleteMyAccount);

  const handleDeleteAccount = useCallback(async () => {
    await deleteMyAccount();
    try {
      await signOut();
    } catch (e) {
      console.warn('[profile] Convex sign-out after account delete failed', e);
    }
    await clearAllData(getDb());
  }, [deleteMyAccount, signOut]);

  const showDevDeleteAccount =
    __DEV__ && isAuthenticated && !isLoading;

  return (
    <ProfileScreenImpl
      convexConfigured
      convexAuthenticated={isAuthenticated}
      convexAuthLoading={isLoading}
      convexSignOut={signOut}
      convexDeleteAccount={handleDeleteAccount}
      showDevDeleteAccount={showDevDeleteAccount}
    />
  );
}
