import React from 'react';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { InsightsScreen } from '@/features/insights/InsightsScreen';

export default function InsightsRoute() {
  const router = useRouter();

  return (
    <Animated.View
      style={{ flex: 1 }}
      entering={FadeInDown.springify(380).dampingRatio(0.85)}
    >
      <InsightsScreen
        onClose={() => {
          if (router.canGoBack()) {
            router.back();
          }
        }}
      />
    </Animated.View>
  );
}
