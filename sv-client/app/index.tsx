import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/useAuthStore';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../src/constants/theme';

export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrating = useAuthStore((s) => s.isHydrating);

  if (isHydrating) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? '/(app)/products' : '/(auth)'} />;
}
