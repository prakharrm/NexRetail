import { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../src/constants/theme';
import { useCartStore } from '../../src/store/useCartStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import type { Order } from '../../src/services/TransactionService';

function OrderCard({ order }: { order: Order }) {
  const date = new Date(order.createdAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <Text style={s.orderId}>Order #{order.id.split('-')[0].toUpperCase()}</Text>
        <Text style={s.orderDate}>{date}</Text>
      </View>

      <View style={s.cardBody}>
        <View style={s.stat}>
          <Text style={s.statLabel}>Items</Text>
          <Text style={s.statValue}>{order.itemCount} ({order.totalUnits} units)</Text>
        </View>
        <View style={s.stat}>
          <Text style={s.statLabel}>Payment</Text>
          <Text style={s.statValue}>{order.paymentMethod}</Text>
        </View>
        <View style={s.statRight}>
          <Text style={s.statLabel}>Total</Text>
          <Text style={s.totalAmount}>₹{Number(order.grandTotal).toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const store = useAuthStore((s) => s.store);
  const { orderHistory, fetchHistory } = useCartStore();
  const isLoading = orderHistory.length === 0;

  useEffect(() => {
    if (store?.id) {
      fetchHistory({ storeId: store.id });
    }
  }, [store?.id, fetchHistory]);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Order History</Text>
        <Text style={s.subtitle}>Recent transactions</Text>
      </View>

      {orderHistory.length === 0 && !isLoading ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>No orders found.</Text>
        </View>
      ) : (
        <FlatList
          data={orderHistory}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <OrderCard order={item} />}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold as any, color: Colors.textPrimary },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.md },
  listContent: { padding: Spacing.md, paddingBottom: 100 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  orderId: { fontWeight: FontWeight.bold as any, color: Colors.textPrimary },
  orderDate: { fontSize: FontSize.xs, color: Colors.textMuted },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  stat: { flex: 1 },
  statRight: { alignItems: 'flex-end' },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 2 },
  statValue: { fontSize: FontSize.sm, fontWeight: FontWeight.medium as any, color: Colors.textPrimary },
  totalAmount: { fontSize: FontSize.lg, fontWeight: FontWeight.bold as any, color: Colors.primary },
});
