import { ShieldCheck } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GlassButton } from '@/components/ui/GlassButton';
import { sansForWeight } from '@/lib/appFonts';
import { radius, space, type, useColors, type ColorPalette } from '@/lib/platform';

export type ConvexAccountPromptVariant =
  /** Group host: sharing links / QR */
  | 'invite-host'
  /** Member viewing invite actions */
  | 'invite-member'
  /** Join synced group flow */
  | 'join';

interface ConvexAccountPromptCardProps {
  variant: ConvexAccountPromptVariant;
  onContinueToSignIn: () => void;
  /** Rare extra hint (single short line max) */
  footerNote?: string;
}

function copyForVariant(variant: ConvexAccountPromptVariant): string {
  switch (variant) {
    case 'invite-host':
      return 'Sign in to share links & QR.';
    case 'invite-member':
      return 'Sign in to copy or share invites.';
    case 'join':
      return 'Sign in to join synced groups.';
  }
}

function createPromptStyles(palette: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      alignItems: 'center',
      gap: space[3],
      paddingVertical: space[2],
      paddingHorizontal: space[1],
    },
    iconRing: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.fill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.opaqueSeparator,
    },
    title: {
      ...type.headline,
      fontWeight: '600',
      fontFamily: sansForWeight('600'),
      color: palette.label,
      textAlign: 'center',
      marginTop: space[1],
    },
    footerNote: {
      ...type.footnote,
      color: palette.labelTertiary,
      textAlign: 'center',
      maxWidth: 300,
    },
    actions: {
      alignSelf: 'stretch',
      marginTop: space[3],
      maxWidth: 360,
    },
  });
}

/** Compact Convex-auth reminder: one headline + Continue (dismiss via sheet/header). */
export function ConvexAccountPromptCard({
  variant,
  onContinueToSignIn,
  footerNote,
}: ConvexAccountPromptCardProps) {
  const palette = useColors();
  const styles = useMemo(() => createPromptStyles(palette), [palette]);

  return (
    <View style={styles.wrap}>
      <View style={styles.iconRing}>
        <ShieldCheck size={26} strokeWidth={2} color={palette.tint} />
      </View>
      <Text style={styles.title}>{copyForVariant(variant)}</Text>
      {footerNote ? <Text style={styles.footerNote}>{footerNote}</Text> : null}
      <View style={styles.actions}>
        <GlassButton
          variant="primary"
          onPress={onContinueToSignIn}
          style={{
            alignSelf: 'stretch',
            borderRadius: radius.md,
          }}
        >
          <GlassButton.Label>Continue</GlassButton.Label>
        </GlassButton>
      </View>
    </View>
  );
}
