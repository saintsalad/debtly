import { GlassButton } from '@/components/ui/GlassButton';
import { ListDivider } from '@/components/ui/ListDivider';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import {
  AMOUNT_EXCEEDS_MAX_MESSAGE,
  isMajorWithinInputCap,
  minorToMajor,
  sanitizeExpenseMajorInput,
  sanitizePercentMajorInput,
  sanitizeSignedMajorInput,
} from '@/features/debts/money';
import {
  allocateEqualShares,
  amountToMinor,
  createDefaultShares,
  getCurrentUserMember,
} from '@/features/group-expense/balanceEngine';
import { isCloudSplitGroup } from '@/features/group-expense/mergeConvexSplitSnapshot';
import type { GroupExpense, SplitGroup, SplitMethod } from '@/features/group-expense/types';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useSubmitGuard } from '@/hooks/use-submit-guard';
import { getCurrencyMeta, formatCurrency } from '@/lib/utils';
import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import { layout, radius, space, type, useColors, type ColorPalette } from '@/lib/platform';
import {
  scrollContentLayerStyle,
  screenHeaderLayerStyle,
  StatusBarScrollFadeStrip,
  useStatusBarScrollFade,
} from '@/lib/statusBarScrollFade';
import { useGroupExpenseStore } from '@/stores/groupExpenseStore';
import { useProfileStore } from '@/stores/profileStore';
import { ExpenseReceiptViewer } from '@/features/group-expense/ExpenseReceiptViewer';
import { notifyError, notifySuccess } from '@/lib/appToast';
import { sansForWeight } from '@/lib/appFonts';
import { Description, HeroUINativeProvider, Label, TextField, useToast } from 'heroui-native';
import { pickReceiptBackgroundPhotoFromLibrary } from '@/features/debts/receipt/pickReceiptPhoto';
import { isConvexConfigured } from '@/lib/convex/env';
import { uploadLocalExpenseReceiptToConvex } from '@/lib/convex/uploadExpenseReceiptToConvex';
import { compressImageToJpegForUpload } from '@/lib/profile/compressProfileAvatar';
import { Image } from 'expo-image';
import { Check, ChevronDown, ImagePlus, X } from 'lucide-react-native';
import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export interface AddExpenseScreenProps {
  groupId: string;
  expenseId?: string;
  onClose: () => void;
}

const HEADER_ROW_MIN_HEIGHT = 36;
const SPLIT_OPTIONS = ['Equal', 'Custom', '%', 'Shares', 'Adjust'] as const;

function splitMethodFromIndex(i: number): SplitMethod {
  switch (i) {
    case 1:
      return 'exact';
    case 2:
      return 'percentage';
    case 3:
      return 'shares';
    case 4:
      return 'adjustment';
    default:
      return 'equal';
  }
}

function splitIndexFromMethod(m: SplitMethod): number {
  switch (m) {
    case 'exact':
      return 1;
    case 'percentage':
      return 2;
    case 'shares':
      return 3;
    case 'adjustment':
      return 4;
    default:
      return 0;
  }
}

/** Signed basis-points delta from 100% (positive = remaining to assign). */
function formatPercentDeltaFromBps(bpsSigned: number): string {
  const majors = Math.round(bpsSigned) / 100;
  const rounded = Math.round(majors * 100) / 100;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2);
}

/** One or two short lines under Split method; plain language. */
const SPLIT_METHOD_DESCRIPTIONS: Record<SplitMethod, string> = {
  equal:
    "Splits the bill evenly between everyone who's included. You don't enter amounts for each person.",
  exact:
    'Type exactly how much each included person owes. Those amounts must add up to the bill total.',
  percentage:
    'Each included person owes a percent of the total. Entries must add up to 100%. Below you can see how much is left.',
  shares:
    'Give each person a "share" number (for example 2 and 1 means one person pays twice as much). Only the ratios matter.',
  adjustment:
    'Each row starts from an equal share. Type + / − tweaks; overall they must cancel (net zero).',
};

function createStyles(palette: ColorPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.bg },
    layerStack: {
      flex: 1,
      position: 'relative',
    },
    scroll: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    headerOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      paddingHorizontal: space[5],
      paddingBottom: space[3],
      backgroundColor: 'transparent',
      ...screenHeaderLayerStyle,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: HEADER_ROW_MIN_HEIGHT,
    },
    title: { flex: 1, ...type.headline, color: palette.label, textAlign: 'center' },
    formContent: {
      flexGrow: 1,
      gap: space[4],
      paddingHorizontal: layout.screenPaddingX,
    },
    input: {
      paddingHorizontal: space[4],
      paddingVertical: space[3],
      borderRadius: 14,
      backgroundColor: palette.fill,
      color: palette.label,
      fontSize: 17,
    },
    amountHero: {
      fontSize: 34,
      fontWeight: '700',
      fontFamily: sansForWeight('700'),
      letterSpacing: -0.5,
      textAlign: 'center',
      paddingVertical: space[2],
      color: palette.label,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    chip: {
      paddingHorizontal: space[3],
      paddingVertical: space[2],
      borderRadius: 14,
      backgroundColor: palette.fill,
    },
    chipOn: { backgroundColor: palette.tint },
    chipText: { ...type.subheadline, color: palette.label },
    chipTextOn: { color: '#fff' },
    advancedToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: space[3],
      gap: space[3],
    },
    shareInput: {
      width: 88,
      minWidth: 88,
      textAlign: 'right',
      paddingHorizontal: space[3],
      paddingVertical: space[2],
      borderRadius: 14,
      backgroundColor: palette.fill,
      color: palette.label,
      fontSize: 17,
    },
    adjustIntroTitle: {
      ...type.subheadline,
      fontWeight: '600',
      fontFamily: sansForWeight('600'),
      color: palette.label,
    },
    adjustIntroHint: {
      ...type.footnote,
      color: palette.labelSecondary,
      marginTop: space[1],
      lineHeight: 18,
    },
    adjustIntroColumn: {
      flex: 1,
      paddingRight: space[2],
    },
    adjustPanel: {
      gap: space[5],
      paddingHorizontal: space[4],
      paddingVertical: space[5],
      borderRadius: radius.lg,
      backgroundColor: palette.fillSecondary,
    },
    sectionLabel: {
      ...type.subheadline,
      fontWeight: '600',
      fontFamily: sansForWeight('600'),
      color: palette.label,
    },
    splitMethodDescription: {
      ...type.footnote,
      color: palette.labelSecondary,
      lineHeight: 20,
      marginTop: space[2],
    },
    groupedList: {
      borderRadius: radius.md,
      overflow: 'hidden' as const,
      backgroundColor: palette.fill,
    },
    groupedRowInner: {
      paddingHorizontal: space[4],
      paddingVertical: space[4],
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 48,
    },
    groupedRowLabel: {
      ...type.body,
      color: palette.label,
      flex: 1,
      paddingRight: space[3],
    },
    peopleRowLeft: {
      flex: 1,
      minWidth: 0,
      paddingRight: space[2],
      justifyContent: 'center',
    },
    peopleName: {
      ...type.body,
      color: palette.label,
    },
    peopleIncludeChip: {
      flexShrink: 0,
      paddingVertical: space[2],
      paddingHorizontal: space[2],
      minWidth: 76,
      alignItems: 'center',
      justifyContent: 'center',
    },
    peopleValueSlot: {
      width: 88,
      flexShrink: 0,
      alignItems: 'flex-end',
      justifyContent: 'center',
      minHeight: 36,
    },
    peopleValuePlaceholder: {
      ...type.body,
      color: palette.labelTertiary,
      paddingRight: space[3],
      paddingVertical: space[2],
    },
    groupedMeta: {
      ...type.subheadline,
      fontWeight: '500',
      fontFamily: sansForWeight('500'),
      color: palette.labelSecondary,
    },
    groupedMetaOn: {
      color: palette.tint,
    },
    adjustmentRowInner: {
      alignItems: 'center',
      minHeight: 52,
    },
    adjustmentRowLeft: {
      flex: 1,
      minWidth: 0,
      paddingRight: space[3],
      justifyContent: 'center',
      gap: space[1],
    },
    adjustmentFairShareCaption: {
      ...type.caption2,
      color: palette.labelTertiary,
    },
    adjustmentNetStripe: {
      marginTop: space[2],
      paddingVertical: space[3],
      paddingHorizontal: space[4],
      borderRadius: radius.sm,
      backgroundColor: palette.fill,
    },
    adjustmentNetText: {
      ...type.footnote,
      fontWeight: '500',
      fontFamily: sansForWeight('500'),
      color: palette.labelSecondary,
      textAlign: 'center',
    },
    percentageRemainderHint: {
      ...type.footnote,
      color: palette.labelSecondary,
      lineHeight: 18,
    },
    receiptSection: {
      gap: space[3],
    },
    receiptPreviewShell: {
      position: 'relative',
      borderRadius: radius.md,
      overflow: 'hidden' as const,
      backgroundColor: palette.fill,
      aspectRatio: 4 / 3,
    },
    receiptPreview: {
      width: '100%',
      height: '100%',
    },
    receiptAddBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      paddingHorizontal: space[3],
      paddingVertical: space[2],
      borderRadius: 14,
      backgroundColor: palette.fill,
      alignSelf: 'flex-start',
    },
    receiptAddText: {
      ...type.subheadline,
      color: palette.label,
    },
    receiptImageActions: {
      position: 'absolute',
      right: space[3],
      bottom: space[3],
      flexDirection: 'row',
      gap: space[2],
    },
    receiptImageActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[1],
      paddingHorizontal: space[2],
      paddingVertical: space[1],
      borderRadius: radius.sm,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    receiptImageActionText: {
      ...type.caption2,
      fontWeight: '600',
      color: '#fff',
    },
    receiptPreviewPressable: {
      width: '100%',
      height: '100%',
    },
    receiptPreviewOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      gap: space[2],
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    receiptPreviewOverlayText: {
      ...type.footnote,
      fontWeight: '600',
      color: '#fff',
    },
  });
}

function isLocalReceiptUri(uri: string): boolean {
  return uri.startsWith('file:') || uri.startsWith('content:');
}

export function AddExpenseScreen({ groupId, expenseId, onClose }: AddExpenseScreenProps) {
  const palette = useColors();
  const colorScheme = useAppColorScheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const keyboardAppearance = colorScheme === 'dark' ? 'dark' : 'light';
  const isEditing = Boolean(expenseId);
  const { onScroll: expenseScrollFadeOnScroll } = useStatusBarScrollFade({ overlayHost: 'screen' });
  const scrollTopInset = useMemo(
    () => insets.top + space[3] + HEADER_ROW_MIN_HEIGHT + space[3] + space[2],
    [insets.top]
  );
  const addExpense = useGroupExpenseStore((s) => s.addExpense);
  const updateExpense = useGroupExpenseStore((s) => s.updateExpense);
  const deleteExpense = useGroupExpenseStore((s) => s.deleteExpense);
  const groups = useGroupExpenseStore((s) => s.groups);
  const expenses = useGroupExpenseStore((s) => s.expenses);
  const currencyProfile = useProfileStore((s) => s.currency);

  const convexAddExpense = useMutation(api.splitGroups.addExpense);
  const convexUpdateExpense = useMutation(api.splitGroups.updateExpense);
  const convexDeleteExpense = useMutation(api.splitGroups.deleteExpense);
  const convexGenReceiptUploadUrl = useMutation(api.splitGroups.generateExpenseReceiptUploadUrl);
  const convexFinalizeReceiptUpload = useMutation(api.splitGroups.finalizeExpenseReceiptUpload);

  const { toast } = useToast();
  const { busy: expenseSaving, runGuarded } = useSubmitGuard();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidByMemberId, setPaidByMemberId] = useState('');
  const [includedIds, setIncludedIds] = useState<string[]>([]);
  const [splitIndex, setSplitIndex] = useState(0);
  const [shareInputs, setShareInputs] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [receiptUri, setReceiptUri] = useState<string | undefined>();
  const [receiptPicking, setReceiptPicking] = useState(false);
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [receiptViewerOpen, setReceiptViewerOpen] = useState(false);
  const amountInputRef = useRef<TextInput>(null);

  const group = useMemo(() => groups.find((g) => g.id === groupId), [groups, groupId]);
  const splitMethod = splitMethodFromIndex(splitIndex);

  const existingExpenseOpen = expenseId ? expenses.find((e) => e.id === expenseId) : undefined;

  const sheetCurrency = useMemo(() => {
    const fromExpense = existingExpenseOpen?.currency?.trim();
    if (fromExpense && fromExpense.length >= 3) {
      return fromExpense.toUpperCase().slice(0, 3);
    }
    const c = group?.currency?.trim();
    if (c && c.length >= 3) return c.toUpperCase().slice(0, 3);
    return currencyProfile;
  }, [existingExpenseOpen?.currency, group?.currency, currencyProfile]);

  const symbol = useMemo(() => getCurrencyMeta(sheetCurrency).symbol, [sheetCurrency]);
  const fmt = useMemo(() => (amount: number) => formatCurrency(amount, sheetCurrency), [sheetCurrency]);

  const resetForGroup = useCallback((g: SplitGroup, existing?: GroupExpense) => {
    const current = getCurrentUserMember(g.members);
    const allIds = g.members.map((m) => m.id);
    setTitle(existing?.title ?? '');
    setAmount(existing ? String(minorToMajor(existing.amountMinor)) : '');
    setPaidByMemberId(existing?.paidByMemberId ?? current?.id ?? g.members[0]?.id ?? '');
    setIncludedIds(existing?.includedMemberIds ?? allIds);
    const method = existing?.splitMethod ?? 'equal';
    setSplitIndex(splitIndexFromMethod(method));
    setShowAdvanced(Boolean(existing && existing.splitMethod !== 'equal'));
    setReceiptUri(existing?.receiptUri);
    setReceiptUploading(false);
    setReceiptViewerOpen(false);
    if (existing?.shares && existing.splitMethod !== 'equal') {
      const inputs: Record<string, string> = {};
      const meth = existing.splitMethod;
      for (const s of existing.shares) {
        switch (meth) {
          case 'exact':
            if (s.valueMinor != null) inputs[s.memberId] = String(minorToMajor(s.valueMinor));
            break;
          case 'percentage':
            if (s.percentBps != null) inputs[s.memberId] = String(s.percentBps / 100);
            break;
          case 'shares':
            if (s.shareParts != null) inputs[s.memberId] = String(s.shareParts);
            break;
          case 'adjustment':
            if (s.adjustmentMinor != null) inputs[s.memberId] = String(minorToMajor(s.adjustmentMinor));
            break;
          default:
            break;
        }
      }
      setShareInputs(inputs);
    } else {
      setShareInputs({});
    }
  }, []);

  useEffect(() => {
    const g = groups.find((x) => x.id === groupId);
    if (!g) return;
    const existing = expenseId ? expenses.find((e) => e.id === expenseId) : undefined;
    resetForGroup(g, existing);
    // Init form when route params change; read latest store snapshot once per navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, expenseId]);

  useEffect(() => {
    if (groups.length > 0 && !groups.some((g) => g.id === groupId)) {
      onClose();
    }
  }, [groups, groupId, onClose]);

  const close = useCallback(() => {
    onClose();
  }, [onClose]);

  const toggleMember = useCallback((memberId: string) => {
    setIncludedIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  }, []);

  const uploadReceiptIfNeeded = useCallback(
    async (jpegUri: string, gid: string, cloud: boolean): Promise<string> => {
      if (!cloud || jpegUri.startsWith('https://') || !isLocalReceiptUri(jpegUri)) {
        return jpegUri;
      }
      if (!isConvexConfigured()) {
        throw new Error('Receipt upload requires Convex and an internet connection.');
      }
      return uploadLocalExpenseReceiptToConvex({
        localFileUri: jpegUri,
        groupId: gid as Id<'splitGroups'>,
        generateExpenseReceiptUploadUrl: (a) => convexGenReceiptUploadUrl(a),
        finalizeExpenseReceiptUpload: (a) => convexFinalizeReceiptUpload(a),
      });
    },
    [convexFinalizeReceiptUpload, convexGenReceiptUploadUrl]
  );

  const handlePickReceipt = useCallback(() => {
    void (async () => {
      if (receiptPicking || receiptUploading || !group) return;

      const raw = await pickReceiptBackgroundPhotoFromLibrary();
      if (!raw) return;

      setReceiptPicking(true);
      try {
        const jpegUri = await compressImageToJpegForUpload(raw);
        setReceiptUri(jpegUri);

        const cloud = isCloudSplitGroup(group);
        if (cloud && isLocalReceiptUri(jpegUri)) {
          setReceiptUploading(true);
          try {
            const url = await uploadReceiptIfNeeded(jpegUri, groupId, cloud);
            setReceiptUri(url);
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Could not upload receipt.';
            notifyError(toast, 'Upload failed', msg);
          } finally {
            setReceiptUploading(false);
            amountInputRef.current?.blur();
            Keyboard.dismiss();
          }
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Could not process image.';
        Alert.alert('Photo failed', msg);
      } finally {
        setReceiptPicking(false);
        amountInputRef.current?.blur();
        Keyboard.dismiss();
      }
    })();
  }, [group, groupId, receiptPicking, receiptUploading, toast, uploadReceiptIfNeeded]);

  const openReceiptViewer = useCallback(() => {
    if (receiptUri && !receiptUploading) {
      setReceiptViewerOpen(true);
    }
  }, [receiptUri, receiptUploading]);

  const handleSplitIndexChange = useCallback((ni: number) => {
    setSplitIndex((prev) => {
      if (prev !== ni) {
        setShareInputs({});
      }
      return ni;
    });
  }, []);

  const handleSave = () =>
    void runGuarded(async () => {
    if (!groupId || !group) return;
    if (receiptUploading) {
      Alert.alert('Receipt uploading', 'Wait for the receipt photo to finish uploading, then save.');
      return;
    }
    const parsed = parseFloat(amount.replace(/,/g, ''));
    if (!title.trim() || !Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert('Missing info', 'Add a description and amount.');
      return;
    }
    if (!isMajorWithinInputCap(parsed)) {
      Alert.alert('Amount too large', AMOUNT_EXCEEDS_MAX_MESSAGE);
      return;
    }

    const amountMinor = amountToMinor(parsed);
    let shares = createDefaultShares(splitMethod, includedIds, amountMinor);

    if (splitMethod === 'exact') {
      for (const memberId of includedIds) {
        const v = Number.parseFloat((shareInputs[memberId] ?? '').replace(/,/g, ''));
        if (!Number.isFinite(v) || !isMajorWithinInputCap(v)) {
          Alert.alert('Amount too large', AMOUNT_EXCEEDS_MAX_MESSAGE);
          return;
        }
      }
      shares = includedIds.map((memberId) => ({
        memberId,
        valueMinor: amountToMinor(parseFloat(shareInputs[memberId] || '0')),
      }));
    }
    if (splitMethod === 'percentage') {
      shares = includedIds.map((memberId) => ({
        memberId,
        percentBps: Math.round(parseFloat(shareInputs[memberId] || '0') * 100),
      }));
    }
    if (splitMethod === 'shares') {
      shares = includedIds.map((memberId) => ({
        memberId,
        shareParts: parseFloat(shareInputs[memberId] ?? '1'),
      }));
    }
    if (splitMethod === 'adjustment') {
      for (const memberId of includedIds) {
        const raw = shareInputs[memberId] ?? '0';
        if (raw === '-') {
          Alert.alert('Invalid adjustment', 'Finish the amount or leave the field blank for zero.');
          return;
        }
        const v = Number.parseFloat(raw.replace(/,/g, ''));
        if (!Number.isFinite(v) || !isMajorWithinInputCap(v)) {
          Alert.alert('Amount too large', AMOUNT_EXCEEDS_MAX_MESSAGE);
          return;
        }
      }
      shares = includedIds.map((memberId) => ({
        memberId,
        adjustmentMinor: amountToMinor(parseFloat(shareInputs[memberId] || '0')),
      }));
    }

    let resolvedReceiptUri = receiptUri;
    if (
      receiptUri &&
      isCloudSplitGroup(group) &&
      isLocalReceiptUri(receiptUri)
    ) {
      try {
        resolvedReceiptUri = await uploadReceiptIfNeeded(receiptUri, groupId, true);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Could not upload receipt.';
        Alert.alert('Receipt upload failed', msg);
        return;
      }
    }

    const receiptForSave = expenseId ? (resolvedReceiptUri ?? '') : resolvedReceiptUri;

    const payload = {
      groupId,
      title,
      amount: parsed,
      paidByMemberId,
      splitMethod,
      includedMemberIds: includedIds,
      shares,
      receiptUri: receiptForSave,
    };

    if (isCloudSplitGroup(group)) {
      try {
        if (expenseId) {
          await convexUpdateExpense({
            expenseId: expenseId as Id<'splitGroupExpenses'>,
            title: payload.title,
            amount: payload.amount,
            paidByMemberId: payload.paidByMemberId,
            splitMethod: payload.splitMethod,
            includedMemberIds: payload.includedMemberIds,
            shares: payload.shares,
            receiptUri: payload.receiptUri,
          });
          notifySuccess(toast, 'Expense updated');
        } else {
          await convexAddExpense({
            groupId: groupId as Id<'splitGroups'>,
            title: payload.title,
            amount: payload.amount,
            paidByMemberId: payload.paidByMemberId,
            splitMethod: payload.splitMethod,
            includedMemberIds: payload.includedMemberIds,
            shares: payload.shares,
            currency: sheetCurrency,
            receiptUri: payload.receiptUri,
          });
          notifySuccess(toast, 'Expense added');
        }
        onClose();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Could not save expense.';
        Alert.alert('Could not save', msg);
      }
      return;
    }

    const error = expenseId ? updateExpense(expenseId, payload) : addExpense(payload);
    if (error) {
      Alert.alert('Could not save', error);
      return;
    }
    if (expenseId) {
      notifySuccess(toast, 'Expense updated');
    } else {
      notifySuccess(toast, 'Expense added');
    }
    onClose();
  });

  const splitSummaryLine = useMemo(() => {
    const n = includedIds.length;
    const peoplePhrase = n === 1 ? '1 person' : `${n} people`;
    switch (splitMethod) {
      case 'equal':
        return `Split equally · ${peoplePhrase}`;
      case 'exact':
        return `Custom amounts · ${peoplePhrase}`;
      case 'percentage':
        return `Percent split · ${peoplePhrase}`;
      case 'shares':
        return `Split by shares · ${peoplePhrase}`;
      case 'adjustment':
        return `Split by adjustment · ${peoplePhrase}`;
      default:
        return `Split equally · ${peoplePhrase}`;
    }
  }, [includedIds.length, splitMethod]);

  const perPersonAccessibilitySuffix =
    splitMethod === 'percentage'
      ? 'Percent owed'
      : splitMethod === 'exact'
        ? 'Amount owed'
        : splitMethod === 'shares'
          ? 'Share weight'
          : splitMethod === 'adjustment'
            ? 'Plus or minus vs even share'
            : '';

  const perPersonPlaceholder =
    splitMethod === 'percentage'
      ? '0'
      : splitMethod === 'shares'
        ? '1'
        : splitMethod === 'adjustment'
          ? '0'
          : splitMethod === 'exact'
            ? `${symbol}`
            : '';

  const perPersonKeyboardType =
    splitMethod === 'adjustment'
      ? ('numbers-and-punctuation' as const)
      : ('decimal-pad' as const);

  const adjustmentFairShareByMember = useMemo(() => {
    if (splitMethod !== 'adjustment' || includedIds.length === 0) {
      return {} as Record<string, string>;
    }
    const parsed = parseFloat(amount.replace(/,/g, ''));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return {} as Record<string, string>;
    }
    const amountMinor = amountToMinor(parsed);
    const equalMap = allocateEqualShares(amountMinor, includedIds);
    const out: Record<string, string> = {};
    for (const id of includedIds) {
      out[id] = fmt(minorToMajor(equalMap.get(id) ?? 0));
    }
    return out;
  }, [splitMethod, includedIds, amount, fmt]);

  const adjustmentNetMinor = useMemo(() => {
    if (splitMethod !== 'adjustment' || includedIds.length === 0) return 0;
    let sum = 0;
    for (const id of includedIds) {
      sum += amountToMinor(parseFloat(shareInputs[id] || '0'));
    }
    return sum;
  }, [splitMethod, includedIds, shareInputs]);

  const percentageRemainderBps = useMemo(() => {
    if (splitMethod !== 'percentage' || includedIds.length === 0) return null;
    let sumBps = 0;
    for (const id of includedIds) {
      const raw = shareInputs[id] ?? '';
      const v = Number.parseFloat(raw.replace(/,/g, ''));
      if (Number.isFinite(v)) sumBps += Math.round(v * 100);
    }
    return 10_000 - sumBps;
  }, [splitMethod, includedIds, shareInputs]);

  if (!group) return null;

  return (
    <View style={styles.screen}>
      <HeroUINativeProvider>
        <View style={styles.layerStack} collapsable={false}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={insets.top}
          >
            <Animated.ScrollView
              style={[styles.scroll, scrollContentLayerStyle]}
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={expenseScrollFadeOnScroll}
              contentContainerStyle={[
                styles.formContent,
                {
                  paddingTop: scrollTopInset,
                  paddingBottom: insets.bottom + layout.screenPaddingBottom,
                },
              ]}
            >
          <TextField>
            <Label>What was it for?</Label>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Dinner, groceries, gas…"
              placeholderTextColor={palette.placeholder}
              keyboardAppearance={keyboardAppearance}
            />
          </TextField>

          <TextField>
            <Label>Amount</Label>
            <TextInput
              ref={amountInputRef}
              style={styles.amountHero}
              value={amount}
              onChangeText={(v) => setAmount(sanitizeExpenseMajorInput(v))}
              keyboardType="decimal-pad"
              placeholder={`${symbol}0`}
              placeholderTextColor={palette.placeholder}
              keyboardAppearance={keyboardAppearance}
            />
          </TextField>

          <TextField>
            <Label>Paid by</Label>
            <View style={styles.chipRow}>
              {group.members.map((m) => (
                <Pressable
                  key={m.id}
                  style={[styles.chip, paidByMemberId === m.id && styles.chipOn]}
                  onPress={() => setPaidByMemberId(m.id)}
                >
                  <Text
                    style={[styles.chipText, paidByMemberId === m.id && styles.chipTextOn]}
                  >
                    {m.displayName}
                  </Text>
                </Pressable>
              ))}
            </View>
            {!showAdvanced ? (
              <Description>{splitSummaryLine}</Description>
            ) : null}
          </TextField>

          <View style={styles.receiptSection}>
            <Text style={styles.sectionLabel}>Receipt</Text>
            {receiptUri ? (
              <View style={styles.receiptPreviewShell}>
                <TouchableOpacity
                  activeOpacity={0.92}
                  delayPressIn={150}
                  style={styles.receiptPreviewPressable}
                  accessibilityRole="imagebutton"
                  accessibilityLabel="Receipt photo. Tap to view full screen."
                  onPress={openReceiptViewer}
                  disabled={receiptUploading || receiptPicking}
                >
                  <Image
                    source={{ uri: receiptUri }}
                    style={styles.receiptPreview}
                    contentFit="cover"
                    accessibilityLabel="Receipt photo preview"
                  />
                  {receiptUploading ? (
                    <View style={styles.receiptPreviewOverlay} pointerEvents="none">
                      <ActivityIndicator color="#fff" />
                      <Text style={styles.receiptPreviewOverlayText}>Uploading…</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
                {!receiptUploading ? (
                  <View style={styles.receiptImageActions} pointerEvents="box-none">
                    <Pressable
                      style={styles.receiptImageActionBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Change receipt photo"
                      onPress={handlePickReceipt}
                      disabled={receiptPicking}
                    >
                      <ImagePlus size={14} color="#fff" />
                      <Text style={styles.receiptImageActionText}>Change</Text>
                    </Pressable>
                    <Pressable
                      style={styles.receiptImageActionBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Remove receipt photo"
                      onPress={() => setReceiptUri(undefined)}
                      disabled={receiptPicking}
                    >
                      <X size={14} color="#fff" />
                      <Text style={styles.receiptImageActionText}>Remove</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : (
              <Pressable
                style={styles.receiptAddBtn}
                accessibilityRole="button"
                accessibilityLabel="Add receipt photo"
                onPress={handlePickReceipt}
                disabled={receiptPicking || receiptUploading}
              >
                {receiptPicking ? (
                  <ActivityIndicator size="small" color={palette.tint} />
                ) : (
                  <ImagePlus size={18} color={palette.label} />
                )}
                <Text style={styles.receiptAddText}>
                  {receiptPicking ? 'Opening photos…' : 'Add photo'}
                </Text>
              </Pressable>
            )}
          </View>

          <Pressable
            style={styles.advancedToggle}
            accessibilityRole="button"
            accessibilityState={{ expanded: showAdvanced }}
            onPress={() => setShowAdvanced((v) => !v)}
          >
            <View style={styles.adjustIntroColumn}>
              <Text style={styles.adjustIntroTitle}>Adjust split</Text>
              <Text style={styles.adjustIntroHint}>
                {showAdvanced
                  ? 'Choose how to divide the expense, pick who participates, then enter values.'
                  : 'Equal, fixed amounts, percents, share weights (proportional), or fine-tuning from equal (adjustments).'}
              </Text>
            </View>
            <ChevronDown
              size={20}
              color={palette.labelSecondary}
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={{ transform: [{ rotate: showAdvanced ? '180deg' : '0deg' }] }}
            />
          </Pressable>

          {showAdvanced ? (
            <View style={styles.adjustPanel}>
              <View style={{ gap: space[3] }}>
                <Text style={styles.sectionLabel}>Split method</Text>
                <SegmentedControl
                  variant="inline"
                  options={[...SPLIT_OPTIONS]}
                  selectedIndex={splitIndex}
                  onChange={handleSplitIndexChange}
                />
                <Text
                  style={styles.splitMethodDescription}
                  accessibilityLiveRegion="polite"
                >
                  {SPLIT_METHOD_DESCRIPTIONS[splitMethod]}
                </Text>
              </View>

              <View style={{ gap: space[3] }}>
                {splitMethod === 'percentage' && percentageRemainderBps != null ? (
                  <Text
                    style={[
                      styles.percentageRemainderHint,
                      percentageRemainderBps !== 0 ? { color: palette.warning } : null,
                    ]}
                    accessibilityLiveRegion="polite"
                  >
                    {percentageRemainderBps === 0
                      ? '100% assigned — percentages add up.'
                      : percentageRemainderBps > 0
                        ? `${formatPercentDeltaFromBps(percentageRemainderBps)}% left to reach 100%.`
                        : `${formatPercentDeltaFromBps(-percentageRemainderBps)}% over 100% — reduce some values.`}
                  </Text>
                ) : null}
                <View style={styles.groupedList}>
                  {group.members.map((m, index) => {
                    const on = includedIds.includes(m.id);
                    const evenShareFmt = adjustmentFairShareByMember[m.id];
                    const isAdjustment = splitMethod === 'adjustment';
                    const needsValue = splitMethod !== 'equal';

                    return (
                      <Fragment key={m.id}>
                        {index > 0 ? <ListDivider /> : null}
                        {!needsValue ? (
                          <Pressable
                            onPress={() => toggleMember(m.id)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: on }}
                            accessibilityHint="Toggle whether this person is included in the split."
                          >
                            <View style={styles.groupedRowInner}>
                              <Text style={styles.groupedRowLabel}>{m.displayName}</Text>
                              <Text style={[styles.groupedMeta, on ? styles.groupedMetaOn : null]}>
                                {on ? 'Included' : 'Excluded'}
                              </Text>
                            </View>
                          </Pressable>
                        ) : (
                          <View
                            style={[
                              styles.groupedRowInner,
                              isAdjustment && on ? styles.adjustmentRowInner : null,
                            ]}
                          >
                            <View
                              style={
                                isAdjustment && on ? styles.adjustmentRowLeft : styles.peopleRowLeft
                              }
                            >
                              <Text style={styles.peopleName}>{m.displayName}</Text>
                              {isAdjustment && on ? (
                                <Text style={styles.adjustmentFairShareCaption}>
                                  {evenShareFmt ? `Even · ${evenShareFmt}` : 'Even · —'}
                                </Text>
                              ) : null}
                            </View>
                            <Pressable
                              onPress={() => toggleMember(m.id)}
                              accessibilityRole="button"
                              accessibilityState={{ selected: on }}
                              accessibilityLabel={
                                on
                                  ? `${m.displayName}, included. Double tap to exclude.`
                                  : `${m.displayName}, excluded. Double tap to include.`
                              }
                              style={styles.peopleIncludeChip}
                            >
                              <Text
                                style={[styles.groupedMeta, on ? styles.groupedMetaOn : null]}
                                numberOfLines={1}
                              >
                                {on ? 'Included' : 'Excluded'}
                              </Text>
                            </Pressable>
                            <View style={styles.peopleValueSlot}>
                              {on ? (
                                <TextInput
                                  accessibilityLabel={`${m.displayName}, ${perPersonAccessibilitySuffix}`}
                                  style={styles.shareInput}
                                  value={shareInputs[m.id] ?? ''}
                                  onChangeText={(v) =>
                                    setShareInputs((prev) => ({
                                      ...prev,
                                      [m.id]:
                                        splitMethod === 'adjustment'
                                          ? sanitizeSignedMajorInput(v)
                                          : splitMethod === 'exact'
                                            ? sanitizeExpenseMajorInput(v)
                                            : splitMethod === 'percentage'
                                              ? sanitizePercentMajorInput(v)
                                              : v,
                                    }))
                                  }
                                  keyboardType={perPersonKeyboardType}
                                  placeholder={perPersonPlaceholder}
                                  placeholderTextColor={palette.placeholder}
                                  keyboardAppearance={keyboardAppearance}
                                />
                              ) : (
                                <Text
                                  style={styles.peopleValuePlaceholder}
                                  accessibilityElementsHidden
                                  importantForAccessibility="no"
                                >
                                  —
                                </Text>
                              )}
                            </View>
                          </View>
                        )}
                      </Fragment>
                    );
                  })}
                </View>
                {splitMethod === 'adjustment' && includedIds.length > 0 ? (
                  <View style={styles.adjustmentNetStripe} accessibilityLiveRegion="polite">
                    <Text
                      style={[
                        styles.adjustmentNetText,
                        adjustmentNetMinor !== 0 ? { color: palette.warning } : null,
                      ]}
                    >
                      {adjustmentNetMinor === 0
                        ? 'Balanced'
                        : `${adjustmentNetMinor > 0 ? '+' : ''}${fmt(minorToMajor(adjustmentNetMinor))} net`}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          {expenseId ? (
            <GlassButton
              variant="ghost"
              onPress={() => {
                Alert.alert('Delete expense?', undefined, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                      void (async () => {
                        if (group && isCloudSplitGroup(group)) {
                          try {
                            await convexDeleteExpense({ expenseId: expenseId as Id<'splitGroupExpenses'> });
                            notifySuccess(toast, 'Expense deleted');
                            onClose();
                          } catch (e: unknown) {
                            const msg = e instanceof Error ? e.message : 'Could not delete.';
                            Alert.alert('Delete failed', msg);
                          }
                          return;
                        }
                        deleteExpense(expenseId);
                        notifySuccess(toast, 'Expense deleted');
                        onClose();
                      })();
                    },
                  },
                ]);
              }}
            >
              <GlassButton.Label>Delete</GlassButton.Label>
            </GlassButton>
          ) : null}
            </Animated.ScrollView>
          </KeyboardAvoidingView>

          <StatusBarScrollFadeStrip />

          <View
            style={[styles.headerOverlay, { paddingTop: insets.top + space[3] }]}
            pointerEvents="box-none"
            collapsable={false}
          >
            <View style={styles.headerRow}>
              <HeaderIconButton icon={X} accessibilityLabel="Cancel" onPress={close} />
              <Text style={styles.title}>{isEditing ? 'Edit expense' : 'Add expense'}</Text>
              <HeaderIconButton
                icon={Check}
                accessibilityLabel={isEditing ? 'Save changes' : 'Save expense'}
                onPress={handleSave}
                variant="tint"
                disabled={expenseSaving || receiptUploading}
              />
            </View>
          </View>
        </View>
      </HeroUINativeProvider>
      <ExpenseReceiptViewer
        visible={receiptViewerOpen}
        uri={receiptUri ?? ''}
        onClose={() => setReceiptViewerOpen(false)}
      />
    </View>
  );
}
