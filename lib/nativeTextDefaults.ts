import { Platform, Text, TextInput } from 'react-native';

type WithFontPaddingDefault = {
  defaultProps?: { includeFontPadding?: boolean };
};

/**
 * Android adds extra vertical padding around text (font padding). The same Inter glyphs
 * then look misaligned vs iOS. Turn it off so typography matches iOS and web more closely.
 */
if (Platform.OS === 'android') {
  const T = Text as typeof Text & WithFontPaddingDefault;
  T.defaultProps = { ...T.defaultProps, includeFontPadding: false };

  const TI = TextInput as typeof TextInput & WithFontPaddingDefault;
  TI.defaultProps = { ...TI.defaultProps, includeFontPadding: false };
}
