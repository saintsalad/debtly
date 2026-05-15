import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { LiquidTabBar } from '@/components/ui/LiquidTabBar';
import { AndroidTabBar } from '@/components/ui/AndroidTabBar';
import { IconSymbol } from '@/components/ui/icon-symbol';
const TabBar = Platform.OS === 'android' ? AndroidTabBar : LiquidTabBar;

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name="house.fill" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name="doc.text.fill" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bill-split"
        options={{
          title: 'Bill split',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name="person.2.fill" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name="person.fill" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
