import { Tabs } from 'expo-router';
import { Split } from 'lucide-react-native';
import { FloatingPillTabBar } from '@/components/ui/FloatingPillTabBar';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingPillTabBar {...props} />}
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
          tabBarIcon: ({ color, size }) => <Split size={size} color={color} />,
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
