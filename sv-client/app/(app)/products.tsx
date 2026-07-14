import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  Image, Alert, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../src/constants/theme';
import { useCatalogStore } from '../../src/store/useCatalogStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import type { Product } from '@sv/shared';
import { NetworkConfig } from '../../src/config/network';

function getFullImageUrl(url: string | null) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  // Use VISION_URL if images are served by the vision service /uploads endpoint
  return `${NetworkConfig.VISION_URL}${url}`;
}

// ────────────────────────────────────────────────────────────
// Add Product & Variants Form
// ────────────────────────────────────────────────────────────
interface VariantInput {
  id: string;
  variantName: string;
  price: string;
  stock: string;
  barcode: string;
  imageUris: string[];
}

function AddProductForm({ onDone }: { onDone: () => void }) {
  const bulkOnboard = useCatalogStore((s) => s.bulkOnboard);
  const isLoading = useCatalogStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);
  const store = useAuthStore((s) => s.store);

  const [parentName, setParentName] = useState('');
  const [category, setCategory] = useState('');
  const [variants, setVariants] = useState<VariantInput[]>([
    { id: '1', variantName: 'Default', price: '', stock: '', barcode: '', imageUris: [] }
  ]);

  const addVariant = () => {
    setVariants(prev => [
      ...prev,
      { id: Date.now().toString(), variantName: '', price: '', stock: '', barcode: '', imageUris: [] }
    ]);
  };

  const removeVariant = (id: string) => {
    if (variants.length <= 1) {
      Alert.alert('Required', 'You must have at least one variant.');
      return;
    }
    setVariants(prev => prev.filter(v => v.id !== id));
  };

  const updateVariant = (id: string, field: keyof VariantInput, value: string) => {
    setVariants(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const handleAddPhoto = (id: string) => {
    Alert.alert('Add Photo', 'Choose photo source', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take Photo', onPress: () => takePhoto(id) },
      { text: 'Choose from Gallery', onPress: () => pickImage(id) }
    ]);
  };

  const takePhoto = async (id: string) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Camera permission is required.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setVariants(prev => prev.map(v => v.id === id ? { ...v, imageUris: [...v.imageUris, result.assets[0].uri] } : v));
    }
  };

  const pickImage = async (id: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setVariants(prev => prev.map(v => v.id === id ? { ...v, imageUris: [...v.imageUris, result.assets[0].uri] } : v));
    }
  };

  const handleSave = async () => {
    if (!store?.id) {
      Alert.alert('Error', 'No active store found.');
      return;
    }
    if (!parentName.trim()) {
      Alert.alert('Required', 'Product Name (Parent) is required.');
      return;
    }

    // Validate variants
    for (const v of variants) {
      if (!v.price.trim() || isNaN(Number(v.price))) {
        Alert.alert('Required', `Enter a valid price for variant "${v.variantName || 'Default'}"`);
        return;
      }
    }

    const payload = {
      storeId: store.id,
      parentName: parentName.trim(),
      category: category.trim() || undefined,
      variants: variants.map(v => ({
        variantName: v.variantName.trim() || 'Default',
        price: parseFloat(v.price),
        totalQuantity: parseInt(v.stock, 10) || 0,
        barcode: v.barcode.trim() || undefined,
        imageUrl: v.imageUris.length > 0 ? v.imageUris[0] : undefined,
      }))
    };

    const success = await bulkOnboard(payload);
    if (success) {
      onDone();
    } else {
      Alert.alert('Error', 'Failed to save product and variants');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.formContainer}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={s.formTitle}>Add New Product</Text>

        <View style={s.formCard}>
          <Text style={s.label}>Product Name (Parent) *</Text>
          <TextInput
            style={s.input} value={parentName} onChangeText={setParentName}
            placeholder="e.g. Parle-G Biscuit" placeholderTextColor={Colors.textMuted}
          />
          <Text style={s.label}>Category</Text>
          <TextInput
            style={s.input} value={category} onChangeText={setCategory}
            placeholder="e.g. Snacks" placeholderTextColor={Colors.textMuted}
          />
        </View>

        <View style={s.variantsHeader}>
          <Text style={s.formTitle}>Variants</Text>
          <TouchableOpacity onPress={addVariant}>
            <Text style={s.addVariantText}>+ Add Variant</Text>
          </TouchableOpacity>
        </View>

        {variants.map((variant, index) => (
          <View key={variant.id} style={s.variantCard}>
            <View style={s.variantCardHeader}>
              <Text style={s.variantCardTitle}>Variant {index + 1}</Text>
              {variants.length > 1 && (
                <TouchableOpacity onPress={() => removeVariant(variant.id)}>
                  <Text style={s.removeText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ width: 80 }} contentContainerStyle={{ gap: Spacing.sm }}>
                {variant.imageUris.map((uri, idx) => (
                  <View key={idx} style={s.variantImageBtn}>
                    <Image source={{ uri }} style={s.variantImage} />
                  </View>
                ))}
                <TouchableOpacity onPress={() => handleAddPhoto(variant.id)} style={s.variantImageBtn}>
                  <View style={s.variantImagePlaceholder}>
                    <Text style={{ fontSize: 24, color: Colors.textMuted }}>📷</Text>
                  </View>
                </TouchableOpacity>
              </ScrollView>
              
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Size/Flavor *</Text>
                <TextInput
                  style={s.input} value={variant.variantName}
                  onChangeText={(val) => updateVariant(variant.id, 'variantName', val)}
                  placeholder="e.g. 50g or Family Pack" placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Price (INR) *</Text>
                <TextInput
                  style={s.input} value={variant.price} keyboardType="numeric"
                  onChangeText={(val) => updateVariant(variant.id, 'price', val)}
                  placeholder="e.g. 10" placeholderTextColor={Colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Initial Stock</Text>
                <TextInput
                  style={s.input} value={variant.stock} keyboardType="numeric"
                  onChangeText={(val) => updateVariant(variant.id, 'stock', val)}
                  placeholder="e.g. 50" placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>

            <Text style={s.label}>Barcode Number</Text>
            <TextInput
              style={s.input} value={variant.barcode} keyboardType="numeric"
              onChangeText={(val) => updateVariant(variant.id, 'barcode', val)}
              placeholder="Scan or enter barcode" placeholderTextColor={Colors.textMuted}
            />
          </View>
        ))}

        <View style={s.formActions}>
          <TouchableOpacity style={s.cancelBtn} onPress={onDone} disabled={isLoading}>
            <Text style={s.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Product</Text>}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ────────────────────────────────────────────────────────────
// Product Card
// ────────────────────────────────────────────────────────────

function ProductCard({ item }: { item: Product }) {
  const removeProduct = useCatalogStore((s) => s.removeProduct);

  const handleDelete = () => {
    Alert.alert('Delete', `Remove "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeProduct(item.id) },
    ]);
  };

  const imageUrl = getFullImageUrl(item.imageUrl);
  const displayName = item.variantName && item.variantName !== 'Default' 
    ? `${item.name} - ${item.variantName}` 
    : item.name;

  return (
    <View style={s.card}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={s.cardImage} />
      ) : (
        <View style={[s.cardImage, s.cardImagePlaceholder]}>
          <Text style={{ color: Colors.textMuted, fontSize: 10 }}>No Image</Text>
        </View>
      )}
      <View style={s.cardInfo}>
        <Text style={s.cardName} numberOfLines={1}>{displayName}</Text>
        <Text style={s.cardPrice}>₹{item.price}</Text>
        <Text style={s.cardMeta}>Stock: {item.totalQuantity} {item.category ? ` • ${item.category}` : ''}</Text>
      </View>
      <TouchableOpacity onPress={handleDelete} style={s.deleteBtn}>
        <Text style={{ color: Colors.error, fontSize: 16, fontWeight: 'bold' }}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

// ────────────────────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────────────────────

export default function ProductsScreen() {
  const products = useCatalogStore((s) => s.products);
  const fetchProducts = useCatalogStore((s) => s.fetchProducts);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  if (showForm) {
    return <AddProductForm onDone={() => setShowForm(false)} />;
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Catalog</Text>
        <Text style={s.headerCount}>{products.length} variant(s)</Text>
      </View>

      {products.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>No products yet</Text>
          <Text style={s.emptySubtitle}>Tap the button below to add your first product.</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ProductCard item={item} />}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity style={s.fab} onPress={() => setShowForm(true)}>
        <Text style={s.fabText}>+ Add Product</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold as any, color: Colors.textPrimary },
  headerCount: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold as any, color: Colors.textSecondary },
  emptySubtitle: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', marginTop: 4 },
  
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  formCard: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  cardImage: { width: 52, height: 52, borderRadius: Radius.sm },
  cardImagePlaceholder: { backgroundColor: Colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, marginLeft: Spacing.sm },
  cardName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold as any, color: Colors.textPrimary },
  cardPrice: { fontSize: FontSize.sm, fontWeight: FontWeight.bold as any, color: Colors.accent, marginTop: 2 },
  cardMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  deleteBtn: { padding: Spacing.sm },
  
  fab: { position: 'absolute', bottom: 24, left: Spacing.lg, right: Spacing.lg, backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center' },
  fabText: { color: '#fff', fontSize: FontSize.md, fontWeight: FontWeight.bold as any },
  
  formContainer: { flex: 1, backgroundColor: Colors.bg, paddingHorizontal: Spacing.lg, paddingTop: 60 },
  formTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold as any, color: Colors.textPrimary, marginBottom: Spacing.sm },
  variantsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.xl, marginBottom: Spacing.sm },
  addVariantText: { color: Colors.primary, fontWeight: FontWeight.bold as any },
  
  variantCard: { backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md },
  variantCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  variantCardTitle: { fontWeight: FontWeight.bold as any, color: Colors.textSecondary },
  removeText: { color: Colors.error, fontSize: FontSize.sm },
  
  variantImageBtn: { width: 80, height: 80, borderRadius: Radius.sm, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed' },
  variantImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  variantImagePlaceholder: { flex: 1, backgroundColor: Colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.medium as any, color: Colors.textSecondary, marginTop: Spacing.xs, marginBottom: 4 },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: 10, fontSize: FontSize.md, color: Colors.textPrimary },
  
  formActions: { flexDirection: 'row', marginTop: Spacing.lg, gap: Spacing.sm },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: FontWeight.semibold as any },
  saveBtn: { flex: 2, paddingVertical: 14, borderRadius: Radius.sm, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontWeight: FontWeight.bold as any },
});
