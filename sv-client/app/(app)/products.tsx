import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../src/constants/theme';
import { useProductStore, Product } from '../../src/store/useProductStore';

import { NetworkConfig } from '../../src/config/network';

function getFullImageUrl(url: string | null) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${NetworkConfig.API_URL}${url}`;
}

// ────────────────────────────────────────────────────────────
// Add Product Form
// ────────────────────────────────────────────────────────────

function AddProductForm({ onDone }: { onDone: () => void }) {
  const addProduct = useProductStore((s) => s.addProduct);
  const isLoading = useProductStore((s) => s.isLoading);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [sku, setSku] = useState('');
  const [stock, setStock] = useState('');
  const [barcode, setBarcode] = useState('');
  const [images, setImages] = useState<{ uri: string, type: string }[]>([]);

  const pickImage = async (type: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setImages((prev) => [...prev, { uri: result.assets[0].uri, type }]);
    }
  };

  const takePhoto = async (type: string) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Camera access is required to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setImages((prev) => [...prev, { uri: result.assets[0].uri, type }]);
    }
  };

  const showImageOptions = (type: string) => {
    Alert.alert(`Add ${type === 'barcode' ? 'Barcode' : 'Product'} Photo`, 'Choose a source', [
      { text: 'Camera', onPress: () => takePhoto(type) },
      { text: 'Gallery', onPress: () => pickImage(type) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Product name is required.');
      return;
    }
    if (!price.trim() || isNaN(Number(price))) {
      Alert.alert('Required', 'Enter a valid price.');
      return;
    }

    const success = await addProduct({
      name: name.trim(),
      price: price.trim(),
      sku: sku.trim() || `SKU-${Date.now().toString(36).toUpperCase()}`,
      stock: stock || '0',
      barcode: barcode.trim() || undefined,
      images,
    });
    if (success) {
      onDone();
    } else {
      Alert.alert('Error', 'Failed to save product');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={s.formContainer}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={s.formTitle}>Add New Product</Text>

        <Text style={s.label}>Product Name *</Text>
        <TextInput
          style={s.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Parle-G Biscuit"
          placeholderTextColor={Colors.textMuted}
        />

        <Text style={s.label}>Price (INR) *</Text>
        <TextInput
          style={s.input}
          value={price}
          onChangeText={setPrice}
          placeholder="e.g. 10"
          placeholderTextColor={Colors.textMuted}
          keyboardType="numeric"
        />

        <Text style={s.label}>SKU</Text>
        <TextInput
          style={s.input}
          value={sku}
          onChangeText={setSku}
          placeholder="Auto-generated if empty"
          placeholderTextColor={Colors.textMuted}
        />

        <Text style={s.label}>Stock Quantity</Text>
        <TextInput
          style={s.input}
          value={stock}
          onChangeText={setStock}
          placeholder="e.g. 50"
          placeholderTextColor={Colors.textMuted}
          keyboardType="numeric"
        />

        <Text style={s.label}>Barcode Number</Text>
        <TextInput
          style={s.input}
          value={barcode}
          onChangeText={setBarcode}
          placeholder="e.g. 890123456789"
          placeholderTextColor={Colors.textMuted}
          keyboardType="numeric"
        />

        <Text style={s.label}>Photos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          {images.map((img, index) => (
            <View key={index} style={{ marginRight: 12, position: 'relative' }}>
              <Image source={{ uri: img.uri }} style={{ width: 80, height: 80, borderRadius: 8 }} />
              <View style={{ position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, borderRadius: 4 }}>
                <Text style={{ color: '#fff', fontSize: 10 }}>{img.type}</Text>
              </View>
              <TouchableOpacity
                style={{ position: 'absolute', top: -6, right: -6, backgroundColor: Colors.error, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => removeImage(index)}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>X</Text>
              </TouchableOpacity>
            </View>
          ))}
          
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[s.imagePicker, { width: 80, height: 80, padding: 4 }]}
              onPress={() => showImageOptions('product')}
            >
              <Text style={[s.imagePickerText, { textAlign: 'center' }]}>+ Product</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[s.imagePicker, { width: 80, height: 80, padding: 4 }]}
              onPress={() => showImageOptions('barcode')}
            >
              <Text style={[s.imagePickerText, { textAlign: 'center' }]}>+ Barcode</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={s.formActions}>
          <TouchableOpacity style={s.cancelBtn} onPress={onDone} disabled={isLoading}>
            <Text style={s.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.saveBtnText}>Save Product</Text>
            )}
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
  const removeProduct = useProductStore((s) => s.removeProduct);

  const handleDelete = () => {
    Alert.alert('Delete', `Remove "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeProduct(item.id) },
    ]);
  };

  const imageUrl = getFullImageUrl(item.image_url);

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
        <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
        <Text style={s.cardPrice}>INR {item.price}</Text>
        <Text style={s.cardMeta}>SKU: {item.sku}  -  Stock: {item.stock}</Text>
      </View>
      <TouchableOpacity onPress={handleDelete} style={s.deleteBtn}>
        <Text style={{ color: Colors.error, fontSize: 16, fontWeight: 'bold' }}>X</Text>
      </TouchableOpacity>
    </View>
  );
}

// ────────────────────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────────────────────

export default function ProductsScreen() {
  const products = useProductStore((s) => s.products);
  const fetchProducts = useProductStore((s) => s.fetchProducts);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  if (showForm) {
    return <AddProductForm onDone={() => setShowForm(false)} />;
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>My Products</Text>
        <Text style={s.headerCount}>{products.length} items</Text>
      </View>

      {products.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>No products yet</Text>
          <Text style={s.emptySubtitle}>Tap the button below to add your first product.</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
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

// ────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  headerCount: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardImage: {
    width: 52,
    height: 52,
    borderRadius: Radius.sm,
  },
  cardImagePlaceholder: {
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  cardName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  cardPrice: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.accent,
    marginTop: 2,
  },
  cardMeta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  deleteBtn: {
    padding: Spacing.sm,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  fabText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  formContainer: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
  },
  formTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
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
    paddingVertical: 12,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  imagePicker: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.sm,
    resizeMode: 'cover',
  },
  formActions: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontWeight: FontWeight.semibold,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: FontWeight.bold,
  },
});
