import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { entriesThisYearWord } from '@/features/insights/copy';
import { radius, space, type, useCardShadow } from '@/lib/platform';

const GRADIENT_COLORS = ['#8F7DFF', '#6B5CE8', '#3D56C4', '#2A408F'] as const;
const GRADIENT_LOCATIONS = [0, 0.35, 0.72, 1] as const;
const CARD_RADIUS = radius.md;
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED = 'rgba(255, 255, 255, 0.62)';

interface InsightsCardProps {
  entriesThisYear: number;
  totalOwedToMe: number;
  totalIOwe: number;
  receivablePending: number;
  payablePending: number;
  fmt: (amount: number) => string;
  onPress?: () => void;
}

function MetricRow({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof ArrowDownLeft;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricValueRow}>
        <Icon size={14} color={TEXT_PRIMARY} strokeWidth={2.25} />
        <Text style={styles.metricValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export function InsightsCard({
  entriesThisYear,
  totalOwedToMe,
  totalIOwe,
  receivablePending,
  payablePending,
  fmt,
  onPress,
}: InsightsCardProps) {
  const shadow = useCardShadow();
  const entriesLabel = entriesThisYearWord(entriesThisYear);

  const content = (
    <>
      <Text style={styles.title}>Insights</Text>

      <View style={styles.body}>
        <View style={styles.entriesColumn}>
          <Text style={styles.heroValue}>{entriesThisYear}</Text>
          <Text style={styles.heroLabel}>
            <Text style={styles.heroLabelStrong}>{entriesLabel} </Text>
            <Text style={styles.heroLabelMuted}>this year</Text>
          </Text>
        </View>

        <View style={styles.metricsColumn}>
          <MetricRow
            icon={ArrowDownLeft}
            value={fmt(totalOwedToMe)}
            label={`Receivable · ${receivablePending} pending`}
          />
          <MetricRow
            icon={ArrowUpRight}
            value={fmt(totalIOwe)}
            label={`Payable · ${payablePending} pending`}
          />
        </View>
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Opens transaction insights"
        onPress={onPress}
        onPressIn={() => void Haptics.selectionAsync()}
      >
        <LinearGradient
          colors={[...GRADIENT_COLORS]}
          locations={[...GRADIENT_LOCATIONS]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.card, shadow]}
        >
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <LinearGradient
      colors={[...GRADIENT_COLORS]}
      locations={[...GRADIENT_LOCATIONS]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.card, shadow]}
    >
      {content}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: CARD_RADIUS,
    paddingHorizontal: space[4],
    paddingTop: space[4],
    paddingBottom: space[3],
    gap: space[8],
    overflow: 'hidden',
  },
  title: {
    ...type.headline,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 0,
  },
  entriesColumn: {
    flex: 2,
    minWidth: 0,
    alignItems: 'flex-start',
    gap: 0,
  },
  metricsColumn: {
    flex: 3,
    minWidth: 0,
    gap: space[3],
    alignItems: 'flex-start',
  },
  metric: {
    gap: 2,
    alignSelf: 'stretch',
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metricValue: {
    ...type.callout,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    flexShrink: 1,
  },
  metricLabel: {
    ...type.caption2,
    color: TEXT_MUTED,
    lineHeight: 14,
  },
  heroValue: {
    fontSize: 72,
    fontWeight: '700',
    letterSpacing: -2.5,
    color: TEXT_PRIMARY,
    lineHeight: 76,
    fontVariant: ['tabular-nums'],
  },
  heroLabel: {
    ...type.caption1,
    lineHeight: 16,
    marginTop: -2,
  },
  heroLabelStrong: {
    color: TEXT_PRIMARY,
    fontWeight: '500',
  },
  heroLabelMuted: {
    color: TEXT_MUTED,
  },
});
