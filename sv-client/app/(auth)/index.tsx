import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../src/constants/theme';
import { useAuthStore } from '../../src/store/useAuthStore';

type AuthMode = 'login' | 'register';

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('login');
  const login = useAuthStore((s) => s.login);
  const registerStore = useAuthStore((s) => s.registerStore);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [ownerName, setOwnerName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required', 'Email and password are required.');
      return;
    }
    const success = await login({ email: email.trim(), password });
    if (success) router.replace('/(app)/products');
  };

  const handleRegister = async () => {
    if (!ownerName.trim() || !email.trim() || !password.trim() || !storeName.trim()) {
      Alert.alert('Required', 'Owner name, email, password, and store name are required.');
      return;
    }
    const success = await registerStore({
      ownerName: ownerName.trim(),
      email: email.trim(),
      password,
      storeName: storeName.trim(),
      storeAddress: storeAddress.trim() || undefined,
      storePhone: storePhone.trim() || undefined,
    });
    if (success) router.replace('/(app)/products');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={s.container}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.logo}>NexRetail</Text>
          <Text style={s.subtitle}>
            {mode === 'login' ? 'Sign in to your store' : 'Create your store'}
          </Text>
        </View>

        {/* Error banner */}
        {error && (
          <View style={s.errorBanner}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {/* Register-only fields */}
        {mode === 'register' && (
          <>
            <Text style={s.label}>Owner Name *</Text>
            <TextInput
              style={s.input}
              value={ownerName}
              onChangeText={setOwnerName}
              placeholder="Your full name"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
            />

            <Text style={s.label}>Store Name *</Text>
            <TextInput
              style={s.input}
              value={storeName}
              onChangeText={setStoreName}
              placeholder="e.g. Sharma General Store"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={s.label}>Store Address</Text>
            <TextInput
              style={s.input}
              value={storeAddress}
              onChangeText={setStoreAddress}
              placeholder="Optional"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={s.label}>Store Phone</Text>
            <TextInput
              style={s.input}
              value={storePhone}
              onChangeText={setStorePhone}
              placeholder="Optional"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
            />
          </>
        )}

        {/* Common fields */}
        <Text style={s.label}>Email *</Text>
        <TextInput
          style={s.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={Colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={s.label}>Password *</Text>
        <TextInput
          style={s.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={Colors.textMuted}
          secureTextEntry
        />

        {/* Primary action */}
        <TouchableOpacity
          style={[s.primaryBtn, isLoading && s.primaryBtnDisabled]}
          onPress={mode === 'login' ? handleLogin : handleRegister}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.primaryBtnText}>
              {mode === 'login' ? 'Sign In' : 'Create Store'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Toggle mode */}
        <TouchableOpacity
          style={s.toggleBtn}
          onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          <Text style={s.toggleText}>
            {mode === 'login'
              ? "Don't have an account? Register"
              : 'Already have an account? Sign In'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 100,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  logo: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.extrabold,
    color: Colors.primary,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  errorBanner: {
    backgroundColor: Colors.errorGlow,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.sm,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  toggleBtn: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  toggleText: {
    color: Colors.primaryLight,
    fontSize: FontSize.sm,
  },
});
