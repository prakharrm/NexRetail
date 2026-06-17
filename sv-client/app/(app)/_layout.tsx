import { Tabs } from 'expo-router';
import { Colors } from '../../src/constants/theme';

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.bg,
          borderTopColor: Colors.border,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          title: 'POS (Cart)',
        }}
      />
    </Tabs>
  );
}
