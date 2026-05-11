import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Code,
  FileText,
  HelpCircle,
  Home,
  Pencil,
  Plus,
  Send,
  Trash2,
  User,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { OpaqueColorValue, type StyleProp, type ViewStyle } from 'react-native';

const MAPPING = {
  'house.fill': Home,
  'bell.fill': Bell,
  'person.fill': User,
  'doc.text.fill': FileText,
  plus: Plus,
  xmark: X,
  trash: Trash2,
  checkmark: Check,
  'checkmark.circle.fill': CircleCheck,
  pencil: Pencil,
  'arrow.right': ArrowRight,
  'arrow.left': ArrowLeft,
  'chevron.right': ChevronRight,
  'chevron.left': ChevronLeft,
  'paperplane.fill': Send,
  'chevron.left.forwardslash.chevron.right': Code,
} satisfies Record<string, LucideIcon>;

export type IconSymbolName = keyof typeof MAPPING;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
}) {
  const Icon = MAPPING[name] ?? HelpCircle;

  return <Icon size={size} color={color as string} style={style} />;
}
