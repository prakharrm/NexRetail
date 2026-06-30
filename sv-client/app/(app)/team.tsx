import { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../src/constants/theme';
import { useAuthStore } from '../../src/store/useAuthStore';
import AuthService, { UserInfo } from '../../src/services/AuthService';

function CashierCard({ user }: { user: UserInfo }) {
  return (
    <View style={s.card}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={s.cardInfo}>
        <Text style={s.cardName}>{user.name}</Text>
        <Text style={s.cardEmail}>{user.email}</Text>
        <View style={s.badge}>
          <Text style={s.badgeText}>{user.role}</Text>
        </View>
      </View>
    </View>
  );
}

export default function TeamScreen() {
  const store = useAuthStore((s) => s.store);
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const fetchTeam = async () => {
    try {
      const res = await AuthService.getUsers();
      setUsers(res.users);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleAddCashier = async () => {
    if (!store?.id) return;
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    
    setIsLoading(true);
    try {
      await AuthService.createCashier({
        storeId: store.id,
        name: name.trim(),
        email: email.trim(),
        password: password,
      });
      Alert.alert('Success', 'Cashier added successfully');
      setShowForm(false);
      setName(''); setEmail(''); setPassword('');
      fetchTeam();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error ?? 'Failed to add cashier');
    } finally {
      setIsLoading(false);
    }
  };

  if (currentUser?.role !== 'OWNER') {
    return (
      <View style={s.empty}>
        <Text style={s.emptyText}>Only the store owner can access team management.</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Team Management</Text>
        <Text style={s.subtitle}>Manage your store's cashiers</Text>
      </View>

      {showForm ? (
        <View style={s.formContainer}>
          <Text style={s.formTitle}>Add New Cashier</Text>
          <TextInput
            style={s.input} value={name} onChangeText={setName}
            placeholder="Cashier Name" placeholderTextColor={Colors.textMuted}
          />
          <TextInput
            style={s.input} value={email} onChangeText={setEmail}
            placeholder="Email Address" placeholderTextColor={Colors.textMuted}
            keyboardType="email-address" autoCapitalize="none"
          />
          <TextInput
            style={s.input} value={password} onChangeText={setPassword}
            placeholder="Temporary Password" placeholderTextColor={Colors.textMuted}
            secureTextEntry
          />
          
          <View style={s.formActions}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowForm(false)}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.saveBtn} onPress={handleAddCashier} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <CashierCard user={item} />}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
          />
          <TouchableOpacity style={s.fab} onPress={() => setShowForm(true)}>
            <Text style={s.fabText}>+ Add Cashier</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold as any, color: Colors.textPrimary },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  
  listContent: { padding: Spacing.md, paddingBottom: 100 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    padding: Spacing.md, borderRadius: Radius.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: Colors.primary, fontSize: FontSize.xl, fontWeight: FontWeight.bold as any },
  cardInfo: { marginLeft: Spacing.md, flex: 1 },
  cardName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold as any, color: Colors.textPrimary },
  cardEmail: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  badge: {
    alignSelf: 'flex-start', backgroundColor: Colors.surfaceHigh,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.sm, marginTop: 6,
  },
  badgeText: { fontSize: FontSize.xs, color: Colors.textPrimary, fontWeight: FontWeight.bold as any },
  
  fab: {
    position: 'absolute', bottom: 24, left: Spacing.lg, right: Spacing.lg,
    backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center',
  },
  fabText: { color: '#fff', fontSize: FontSize.md, fontWeight: FontWeight.bold as any },
  
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.md, textAlign: 'center', paddingHorizontal: Spacing.xl },

  formContainer: { padding: Spacing.lg },
  formTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold as any, marginBottom: Spacing.lg, color: Colors.textPrimary },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: 14,
    fontSize: FontSize.md, color: Colors.textPrimary, marginBottom: Spacing.md,
  },
  formActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: FontWeight.semibold as any },
  saveBtn: { flex: 2, paddingVertical: 14, borderRadius: Radius.sm, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontWeight: FontWeight.bold as any },
});
