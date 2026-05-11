import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Plus } from 'lucide-react-native';
import { Button, useThemeColor } from 'heroui-native';
import { colors } from '@/lib/platform';
import { useAddDebt } from '@/lib/addDebtContext';

function TabItem({
  isFocused,
  options,
  onPress,
}: {
  isFocused: boolean;
  options: any;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View className="min-w-0 flex-1" style={animStyle}>
      <Pressable
        className="w-full items-center justify-center gap-[3px] py-1"
        onPressIn={() => { scale.value = withSpring(0.84, { damping: 12, stiffness: 400 }); }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 12, stiffness: 400 });
          onPress();
        }}
        android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: true, radius: 36 }}
      >
        {options.tabBarIcon?.({
          focused: isFocused,
          color: isFocused ? colors.tabActive : colors.tabInactive,
          size: 23,
        })}
        <Text
          className={`text-[11px] font-medium tracking-[0.07px] ${
            isFocused ? 'text-[#1B72E8]' : 'text-[#9E9E9E]'
          }`}
        >
          {options.title}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function CreateButton() {
  const { present } = useAddDebt();
  const accentForeground = useThemeColor('accent-foreground');

  return (
    <View className="w-full min-w-0 flex-1 items-center pb-1">
      <Button
        isIconOnly
        size="lg"
        variant="primary"
        feedbackVariant="scale-ripple"
        animation={{ scale: { value: 0.97 } }}
        className="-mt-5 mb-1 self-center shadow-lg"
        onPress={present}
      >
        <Plus size={26} color={accentForeground} />
      </Button>
      <Text
        className="text-[11px] font-semibold tracking-[0.07px]"
        style={{ color: colors.tint }}
      >
        Create
      </Text>
    </View>
  );
}

export function AndroidTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const routes = state.routes;
  const mid = Math.floor(routes.length / 2);

  const renderTab = (route: typeof routes[0]) => {
    const index = routes.indexOf(route);
    const { options } = descriptors[route.key];
    const isFocused = state.index === index;
    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
    };
    return <TabItem key={route.key} isFocused={isFocused} options={options} onPress={onPress} />;
  };

  return (
    <View
      className="absolute bottom-0 left-0 w-full self-stretch overflow-visible border-t border-black/10 bg-white shadow-lg"
      style={{ paddingBottom: insets.bottom }}
    >
      <View className="w-full flex-row items-end self-stretch pt-1.5 pb-2">
        {routes.slice(0, mid).map(renderTab)}
        <CreateButton />
        {routes.slice(mid).map(renderTab)}
      </View>
    </View>
  );
}
