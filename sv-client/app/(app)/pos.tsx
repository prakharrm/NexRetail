import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Alert, ActivityIndicator, Image,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
} from 'react-native-vision-camera';
import {
  useBarcodeScannerOutput,
} from 'react-native-vision-camera-barcode-scanner';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../src/constants/theme';
import { useProductStore, Product } from '../../src/store/useProductStore';
import ProductService from '../../src/services/ProductService';
import { NetworkConfig } from '../../src/config/network';

interface CartItem {
  product: Product;
  quantity: number;
}

// ─── Capture mode: 'barcode' = scanning, 'photo' = about to capture ───────
type CameraMode = 'barcode' | 'photo';

export default function POSScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const cameraRef = useRef<InstanceType<typeof Camera>>(null);

  const [cameraMode, setCameraMode] = useState<CameraMode>('barcode');
  const [isCameraFrozen, setIsCameraFrozen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [visualMatches, setVisualMatches] = useState<any[] | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  const lastScannedRef = useRef<string | null>(null);
  const lastScannedTimeRef = useRef<number>(0);
  // Ref so barcode callback always sees latest values without re-creating output
  const isProcessingRef = useRef(false);
  const visualMatchesRef = useRef<any[] | null>(null);

  const products = useProductStore((s) => s.products);
  const fetchProducts = useProductStore((s) => s.fetchProducts);

  useEffect(() => {
    fetchProducts();
    if (!hasPermission) requestPermission();
  }, []);

  // Keep refs in sync
  useEffect(() => { isProcessingRef.current = isProcessing; }, [isProcessing]);
  useEffect(() => { visualMatchesRef.current = visualMatches; }, [visualMatches]);

  // ─── Photo output — stable reference ─────────────────────────────────────
  const photoOutput = usePhotoOutput({ qualityPrioritization: 'balanced' });

  // ─── Barcode output — use refs to avoid recreating on every render ────────
  const productsRef = useRef(products);
  useEffect(() => { productsRef.current = products; }, [products]);

  const addToCartRef = useRef<(product: Product) => void>(() => { });

  const barcodeOutput = useBarcodeScannerOutput(
    useMemo(() => ({
      barcodeFormats: ['ean-13', 'upc-a', 'upc-e', 'ean-8', 'qr-code', 'code-128', 'code-39'],
      onBarcodeScanned: (barcodes: any[]) => {
        if (!barcodes.length || isProcessingRef.current || visualMatchesRef.current) return;
        const value = barcodes[0].rawValue;
        if (!value) return;
        const now = Date.now();
        if (value === lastScannedRef.current && now - lastScannedTimeRef.current < 2000) return;
        lastScannedRef.current = value;
        lastScannedTimeRef.current = now;
        const matched = productsRef.current.find((p) => p.barcode === value || p.sku === value);
        if (matched) addToCartRef.current(matched);
      },
      onError: (error: any) => console.error('Barcode scanner error:', error),
    }), []) // ← empty deps: options object created ONCE, uses refs internally
  );

  // ─── Stable outputs arrays — only recalculate when mode changes ──────────
  const barcodeOutputs = useMemo(() => [barcodeOutput], [barcodeOutput]);
  const photoOutputs = useMemo(() => [photoOutput], [photoOutput]);

  const activeOutputs = cameraMode === 'photo' ? photoOutputs : barcodeOutputs;

  // ─── Cart ─────────────────────────────────────────────────────────────────
  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [{ product, quantity: 1 }, ...prev];
    });
  }, []);

  // Keep addToCart ref in sync for barcode callback
  useEffect(() => { addToCartRef.current = addToCart; }, [addToCart]);

  const removeFromCart = (productId: string) =>
    setCart((prev) => prev.filter((i) => i.product.id !== productId));

  const resetCamera = useCallback(() => {
    setVisualMatches(null);
    setIsCameraFrozen(false);
    setCameraMode('barcode');
  }, []);

  // ─── Visual scan ──────────────────────────────────────────────────────────
  const handleVisualScan = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // Step 1: Switch to photo-only mode so barcodeOutput is unbound first
      setCameraMode('photo');

      // Step 2: Wait for CameraX to rebind with only photoOutput (~600ms)
      await new Promise(resolve => setTimeout(resolve, 700));

      // Step 3: Capture — session is now stable with only photoOutput
      const { filePath } = await photoOutput.capturePhotoToFile(
        { flashMode: 'off', enableShutterSound: false },
        {},
      );

      console.log('[VisualScan] Captured:', filePath);
      setIsCameraFrozen(true);

      const photoUri = filePath.startsWith('file://') ? filePath : `file://${filePath}`;
      const matches = await ProductService.searchProductByImage(photoUri, 3);
      setVisualMatches(matches);

    } catch (err: any) {
      console.error('[VisualScan] Error full:', err);
      Alert.alert('Scan Failed', err?.message || 'Could not process the image.');
      // Restore barcode mode on failure
      setCameraMode('barcode');
    } finally {
      setIsProcessing(false);
    }
  };

  const getFullImageUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${NetworkConfig.API_URL}${url}`;
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity, 0
  );

  if (!hasPermission) {
    return (
      <View style={s.center}>
        <Text style={s.textPrimary}>Camera permission required.</Text>
        <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
          <Text style={s.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={s.center}>
        <Text style={s.textPrimary}>No camera device found.</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.cameraContainer}>
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={!isCameraFrozen}
          outputs={activeOutputs}   // ← switches between [barcodeOutput] and [photoOutput]
        />

        <View style={s.cameraOverlay} pointerEvents="box-none">
          <View style={s.scanFrame} />
          <TouchableOpacity
            style={[s.visualScanBtn, isProcessing && s.visualScanBtnDisabled]}
            onPress={handleVisualScan}
            disabled={isProcessing || visualMatches !== null}
          >
            {isProcessing
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.visualScanBtnText}>Scan Visually</Text>
            }
          </TouchableOpacity>
        </View>

        {visualMatches && (
          <View style={s.matchesOverlay}>
            <Text style={s.matchesTitle}>Select Product</Text>
            {visualMatches.length === 0
              ? <Text style={s.matchesSubtitle}>No similar products found.</Text>
              : (
                <FlatList
                  data={visualMatches}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={s.matchItem}
                      onPress={() => { addToCart(item); resetCamera(); }}
                    >
                      {item.image_url
                        ? <Image source={{ uri: getFullImageUrl(item.image_url)! }} style={s.matchImage} />
                        : <View style={[s.matchImage, { backgroundColor: Colors.surfaceHigh }]} />
                      }
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={s.matchName}>{item.name}</Text>
                        <Text style={s.matchPrice}>₹{item.price}</Text>
                      </View>
                      <View style={s.matchScoreBadge}>
                        <Text style={s.matchScore}>{(item.similarity * 100).toFixed(1)}%</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              )
            }
            <TouchableOpacity style={s.cancelMatchBtn} onPress={resetCamera}>
              <Text style={s.cancelMatchBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* CART */}
      <View style={s.cartContainer}>
        <View style={s.cartHeader}>
          <Text style={s.cartTitle}>Current Sale</Text>
          <Text style={s.cartCount}>{cart.length} item{cart.length !== 1 ? 's' : ''}</Text>
        </View>
        {cart.length === 0 ? (
          <View style={s.emptyCart}>
            <Text style={s.emptyCartText}>Scan an item to start a sale.</Text>
          </View>
        ) : (
          <FlatList
            data={cart}
            keyExtractor={(item) => item.product.id.toString()}
            renderItem={({ item }) => (
              <View style={s.cartItem}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cartItemName} numberOfLines={1}>{item.product.name}</Text>
                  <Text style={s.cartItemPrice}>₹{item.product.price} × {item.quantity}</Text>
                </View>
                <Text style={s.cartItemTotal}>
                  ₹{(Number(item.product.price) * item.quantity).toFixed(2)}
                </Text>
                <TouchableOpacity style={s.removeBtn} onPress={() => removeFromCart(item.product.id)}>
                  <Text style={s.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
        <View style={s.checkoutFooter}>
          <View>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalAmount}>₹{cartTotal.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={[s.checkoutBtn, cart.length === 0 && s.checkoutBtnDisabled]}
            disabled={cart.length === 0}
            onPress={() =>
              Alert.alert('Checkout', `Total: ₹${cartTotal.toFixed(2)}`, [
                { text: 'Complete Sale', onPress: () => setCart([]) },
                { text: 'Cancel', style: 'cancel' },
              ])
            }
          >
            <Text style={s.checkoutBtnText}>Checkout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg, gap: Spacing.md },
  textPrimary: { color: Colors.textPrimary, fontSize: FontSize.md },
  permBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: 12, borderRadius: Radius.md },
  permBtnText: { color: '#fff', fontWeight: FontWeight.bold as any },
  cameraContainer: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
  cameraOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center' as const, justifyContent: 'center' as const },
  scanFrame: { width: 250, height: 200, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)', borderRadius: Radius.lg },
  visualScanBtn: { position: 'absolute' as const, bottom: 20, backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: 14, borderRadius: Radius.full, minWidth: 160, alignItems: 'center' as const, elevation: 4, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  visualScanBtnDisabled: { backgroundColor: Colors.surfaceHigh },
  visualScanBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: FontWeight.bold as any },
  matchesOverlay: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.88)', paddingTop: 50, paddingHorizontal: Spacing.md },
  matchesTitle: { color: '#fff', fontSize: FontSize.xl, fontWeight: FontWeight.bold as any, marginBottom: Spacing.md, textAlign: 'center' as const },
  matchesSubtitle: { color: Colors.textMuted, textAlign: 'center' as const },
  matchItem: { flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: Colors.surface, padding: Spacing.sm, borderRadius: Radius.md, marginBottom: Spacing.sm },
  matchImage: { width: 50, height: 50, borderRadius: Radius.sm },
  matchName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold as any, color: Colors.textPrimary },
  matchPrice: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  matchScoreBadge: { backgroundColor: 'rgba(52,199,89,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  matchScore: { color: '#34C759', fontSize: FontSize.xs, fontWeight: FontWeight.bold as any },
  cancelMatchBtn: { marginVertical: Spacing.lg, alignItems: 'center' as const, padding: Spacing.md },
  cancelMatchBtnText: { color: Colors.textSecondary, fontSize: FontSize.md },
  cartContainer: { flex: 1, backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, marginTop: -20, paddingTop: Spacing.lg, paddingHorizontal: Spacing.md, elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: -4 } },
  cartHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: Spacing.sm },
  cartTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold as any, color: Colors.textPrimary },
  cartCount: { fontSize: FontSize.sm, color: Colors.textMuted },
  emptyCart: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
  emptyCartText: { color: Colors.textMuted, fontSize: FontSize.sm },
  cartItem: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  cartItemName: { fontSize: FontSize.md, fontWeight: FontWeight.medium as any, color: Colors.textPrimary },
  cartItemPrice: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },
  cartItemTotal: { fontSize: FontSize.sm, fontWeight: FontWeight.bold as any, color: Colors.textPrimary, marginRight: Spacing.sm },
  removeBtn: { padding: 8, backgroundColor: 'rgba(255,59,48,0.1)', borderRadius: Radius.sm },
  removeBtnText: { color: '#FF3B30', fontWeight: FontWeight.bold as any, fontSize: FontSize.xs },
  checkoutFooter: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, paddingVertical: Spacing.md, paddingBottom: Spacing.xl, borderTopWidth: 1, borderTopColor: Colors.border },
  totalLabel: { fontSize: FontSize.sm, color: Colors.textMuted },
  totalAmount: { fontSize: FontSize.xl, fontWeight: FontWeight.bold as any, color: Colors.primary },
  checkoutBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: 14, borderRadius: Radius.md },
  checkoutBtnDisabled: { backgroundColor: Colors.surfaceHigh },
  checkoutBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: FontWeight.bold as any },
});