import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { useColors, type, type ColorPalette } from '@/lib/platform';

const RING_WIDTH = 2;

export interface AvatarStackMember {
  id: string;
  name: string;
}

export function sortMembersForStack(
  members: { id: string; displayName: string; isCurrentUser: boolean }[]
): AvatarStackMember[] {
  return [...members]
    .sort((a, b) => {
      if (a.isCurrentUser) return -1;
      if (b.isCurrentUser) return 1;
      return a.displayName.localeCompare(b.displayName);
    })
    .map((m) => ({ id: m.id, name: m.displayName }));
}

interface AvatarStackProps {
  members: AvatarStackMember[];
  size?: number;
  maxVisible?: number;
  /** Styling for rings / +N chip on dark hero backgrounds */
  overlay?: boolean;
}

function createStyles(palette: ColorPalette, size: number, overlay: boolean) {
  const outer = size + RING_WIDTH * 2;
  return StyleSheet.create({
    root: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    slot: {
      width: outer,
      height: outer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clip: {
      width: size,
      height: size,
      borderRadius: size / 2,
      overflow: 'hidden',
    },
    ring: {
      position: 'absolute',
      width: outer,
      height: outer,
      borderRadius: outer / 2,
      borderWidth: RING_WIDTH,
      borderColor: overlay ? 'rgba(255,255,255,0.5)' : palette.surface,
    },
    overflow: {
      width: size,
      height: size,
      borderRadius: size / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: overlay ? 'rgba(255,255,255,0.22)' : palette.fill,
    },
    overflowText: {
      ...type.caption2,
      fontWeight: '600',
      color: overlay ? 'rgba(255,255,255,0.95)' : palette.labelSecondary,
    },
  });
}

interface StackSlotProps {
  index: number;
  overlap: number;
  ringStyle: object;
  slotStyle: object;
  clipStyle: object;
  children: React.ReactNode;
}

function StackSlot({
  index,
  overlap,
  ringStyle,
  slotStyle,
  clipStyle,
  children,
}: StackSlotProps) {
  return (
    <View
      style={[
        slotStyle,
        {
          marginLeft: index === 0 ? 0 : -overlap,
          zIndex: index,
        },
      ]}
    >
      <View style={clipStyle}>{children}</View>
      <View pointerEvents="none" style={ringStyle} />
    </View>
  );
}

export function AvatarStack({ members, size = 36, maxVisible = 4, overlay }: AvatarStackProps) {
  const palette = useColors();
  const styles = useMemo(() => createStyles(palette, size, Boolean(overlay)), [palette, size, overlay]);

  if (members.length === 0) return null;

  const outer = size + RING_WIDTH * 2;
  const overlap = Math.round(outer * 0.28);
  const visible = members.slice(0, maxVisible);
  const overflow = members.length - visible.length;

  return (
    <View
      style={styles.root}
      accessibilityLabel={`${members.length} members`}
    >
      {visible.map((member, index) => (
        <StackSlot
          key={member.id}
          index={index}
          overlap={overlap}
          ringStyle={styles.ring}
          slotStyle={styles.slot}
          clipStyle={styles.clip}
        >
          <Avatar name={member.name} size={size} />
        </StackSlot>
      ))}
      {overflow > 0 ? (
        <StackSlot
          index={visible.length}
          overlap={overlap}
          ringStyle={styles.ring}
          slotStyle={styles.slot}
          clipStyle={styles.clip}
        >
          <View style={styles.overflow}>
            <Text style={[styles.overflowText, { fontSize: Math.max(11, size * 0.3) }]}>
              +{overflow}
            </Text>
          </View>
        </StackSlot>
      ) : null}
    </View>
  );
}
