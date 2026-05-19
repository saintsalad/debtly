import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { sansForWeight } from '@/lib/appFonts';
import { useColors } from '@/lib/platform';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const palette = useColors();
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? [styles.link, { color: palette.tint }] : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: sansForWeight('400'),
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    fontFamily: sansForWeight('600'),
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: sansForWeight('700'),
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: sansForWeight('700'),
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    fontFamily: sansForWeight('400'),
  },
});
