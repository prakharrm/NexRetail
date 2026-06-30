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
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../src/constants/theme';
import { useCatalogStore } from '../../src/store/useCatalogStore';
import type { Product } from '@sv/shared';
import { useCartStore } from '../../src/store/useCartStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import VisionService from '../../src/services/VisionService';
import TelemetryService from '../../src/services/TelemetryService';
import { NetworkConfig } from '../../src/config/network';

// ─── Capture mode: 'barcode' = scanning, 'photo' = about to capture ───────
type CameraMode = 'barcode' | 'photo';

// ─── How long (ms) after a barcode disappears from frame before we allow rescanning it ───
const RESCAN_COOLDOWN_MS = 2500;

export default function POSScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const cameraRef = useRef<any>(null);

  const [cameraMode, setCameraMode] = useState<CameraMode>('barcode');
  const [isCameraFrozen, setIsCameraFrozen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [visualMatches, setVisualMatches] = useState<any[] | null>(null);
  const user = useAuthStore((s) => s.user);
  const store = useAuthStore((s) => s.store);

  // ─── Per-barcode "last seen" tracking ─────────────────────────────────────
  const lastSeenTimeRef = useRef<Map<string, number>>(new Map());
  const scannedInFrameRef = useRef<Set<string>>(new Set());
  const pruneIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ref so barcode callback always sees latest values without re-creating output
  const isProcessingRef = useRef(false);
  const visualMatchesRef = useRef<any[] | null>(null);

  // ─── Cart Store ───────────────────────────────────────────────────────────
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const checkout = useCartStore((s) => s.checkout);
  const clearCart = useCartStore((s) => s.clearCart);
  const isProcessingCheckout = useCartStore((s) => s.isProcessing);

  const products = useCatalogStore((s) => s.products);
  const fetchProducts = useCatalogStore((s) => s.fetchProducts);

  // ─── Audio player ──────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const beepPlayer = useAudioPlayer(require('../../assets/beep.wav'));

  const playBeep = useCallback(async () => {
    try {
      beepPlayer.seekTo(0);
      beepPlayer.play();
    } catch (e) {
      // Silently ignore audio errors — beep is non-critical
    }
  }, [beepPlayer]);

  useEffect(() => {
    fetchProducts();
    if (!hasPermission) requestPermission();
  }, []);

  // Keep refs in sync
  useEffect(() => { isProcessingRef.current = isProcessing; }, [isProcessing]);
  useEffect(() => { visualMatchesRef.current = visualMatches; }, [visualMatches]);

  // ─── Prune stale "in-frame" barcodes every 300ms ─────────────────────────
  // If a barcode hasn't been reported in RESCAN_COOLDOWN_MS, remove it from
  // scannedInFrameRef so it will be scanned again the next time it appears.
  useEffect(() => {
    pruneIntervalRef.current = setInterval(() => {
      const now = Date.now();
      lastSeenTimeRef.current.forEach((ts, barcode) => {
        if (now - ts > RESCAN_COOLDOWN_MS) {
          lastSeenTimeRef.current.delete(barcode);
          scannedInFrameRef.current.delete(barcode);
        }
      });
    }, 300);
    return () => {
      if (pruneIntervalRef.current) clearInterval(pruneIntervalRef.current);
    };
  }, []);

  // ─── Photo output — stable reference ─────────────────────────────────────
  const photoOutput = usePhotoOutput({ qualityPrioritization: 'balanced' });

  // ─── Barcode output — use refs to avoid recreating on every render ────────
  const productsRef = useRef(products);
  useEffect(() => { productsRef.current = products; }, [products]);

  const addToCartRef = useRef<(product: Product) => void>(() => { });
  const playBeepRef = useRef<() => void>(() => { });
  useEffect(() => { playBeepRef.current = playBeep; }, [playBeep]);

  const barcodeOutput = useBarcodeScannerOutput(
    useMemo(() => ({
      barcodeFormats: ['ean-13', 'upc-a', 'upc-e', 'ean-8', 'qr-code', 'code-128', 'code-39'],
      onBarcodeScanned: (barcodes: any[]) => {
        if (!barcodes.length || isProcessingRef.current || visualMatchesRef.current) return;

        const now = Date.now();

        // Update "last seen" time for every barcode currently in frame
        barcodes.forEach((b) => {
          if (b.rawValue) lastSeenTimeRef.current.set(b.rawValue, now);
        });

        // Only process the first barcode and only if not yet scanned this appearance
        const value = barcodes[0].rawValue;
        if (!value) return;
        if (scannedInFrameRef.current.has(value)) return; // already added this appearance

        // Mark as scanned for this appearance
        scannedInFrameRef.current.add(value);

        const matched = productsRef.current.find((p) => p.barcode === value);
        if (matched) {
          addToCartRef.current(matched);
          playBeepRef.current();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      },
      onError: (error: any) => console.error('Barcode scanner error:', error),
    }), []) // ← empty deps: options object created ONCE, uses refs internally
  );

  // ─── Stable outputs arrays — only recalculate when mode changes ──────────
  const barcodeOutputs = useMemo(() => [barcodeOutput], [barcodeOutput]);
  const photoOutputs = useMemo(() => [photoOutput], [photoOutput]);

  const activeOutputs = cameraMode === 'photo' ? photoOutputs : barcodeOutputs;

  // ─── Cart Handlers ─────────────────────────────────────────────────────────
  const addToCart = useCallback((product: Product) => {
    // Check if we already have it to warn about stock limit
    const existing = items.find((i) => i.productId === product.id);
    if (existing && existing.quantity >= product.totalQuantity) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Stock Limit', `Only ${product.totalQuantity} unit(s) of "${product.name}" in stock.`);
      return;
    }
    
    addItem({
      productId: product.id,
      name: product.variantName && product.variantName !== 'Default' 
        ? `${product.name} - ${product.variantName}` 
        : product.name,
      originalPrice: product.price,
      price: product.price,
      quantity: 1,
    });
  }, [items, addItem]);

  const increaseQty = useCallback((cartKey: string, productId: string) => {
    const product = products.find((p) => p.id === productId);
    const item = items.find((i) => i.cartKey === cartKey);
    if (product && item && item.quantity >= product.totalQuantity) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Stock Limit', `Only ${product.totalQuantity} unit(s) in stock.`);
      return;
    }
    if (item) updateQuantity(cartKey, item.quantity + 1);
  }, [items, products, updateQuantity]);

  const decreaseQty = useCallback((cartKey: string) => {
    const item = items.find((i) => i.cartKey === cartKey);
    if (item) updateQuantity(cartKey, item.quantity - 1);
  }, [items, updateQuantity]);

  // Keep addToCart ref in sync for barcode callback
  useEffect(() => { addToCartRef.current = addToCart; }, [addToCart]);

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
      const matches = await VisionService.searchByImage(photoUri, 3);
      setVisualMatches(matches);

      // Log to telemetry if no matches found
      if (matches.length === 0 && store?.id) {
        TelemetryService.logSearchFailure({
          storeId: store.id,
          query: 'visual_scan',
          searchType: 'IMAGE',
        });
      }

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
    // Product images are served from the vision service's /uploads
    return `${NetworkConfig.VISION_URL}${url}`;
  };

  const cartTotal = getSubtotal();

  const handleCheckout = async () => {
    if (!store?.id || !user?.id) {
      Alert.alert('Error', 'Missing user session details.');
      return;
    }
    const success = await checkout(store.id, user.id);
    if (success) {
      Alert.alert('Success', 'Checkout completed successfully!');
    }
  };

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
          <View style={s.scanFrame}>
            {/* Corner accents */}
            <View style={[s.corner, s.cornerTL]} />
            <View style={[s.corner, s.cornerTR]} />
            <View style={[s.corner, s.cornerBL]} />
            <View style={[s.corner, s.cornerBR]} />
          </View>
          <Text style={s.scanHint}>Position barcode inside frame</Text>
          <TouchableOpacity
            style={[s.visualScanBtn, isProcessing && s.visualScanBtnDisabled]}
            onPress={handleVisualScan}
            disabled={isProcessing || visualMatches !== null}
          >
            {isProcessing
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.visualScanBtnText}>📷 Scan Visually</Text>
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
          <Text style={s.cartCount}>{items.length} item{items.length !== 1 ? 's' : ''}</Text>
        </View>
        {items.length === 0 ? (
          <View style={s.emptyCart}>
            <Text style={s.emptyCartIcon}>🛒</Text>
            <Text style={s.emptyCartText}>Scan an item to start a sale.</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.cartKey}
            renderItem={({ item }) => {
              const productInfo = products.find(p => p.id === item.productId);
              const maxStock = productInfo?.totalQuantity ?? 0;
              
              return (
              <View style={s.cartItem}>
                {/* Product info */}
                <View style={{ flex: 1 }}>
                  <Text style={s.cartItemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={s.cartItemPrice}>
                    ₹{item.price} each
                    {maxStock <= 5
                      ? <Text style={s.stockWarning}>  ⚠ {maxStock} left</Text>
                      : null
                    }
                  </Text>
                </View>

                {/* Quantity controls */}
                <View style={s.qtyRow}>
                  <TouchableOpacity
                    style={s.qtyBtn}
                    onPress={() => decreaseQty(item.cartKey)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.qtyBtnText}>−</Text>
                  </TouchableOpacity>

                  <View style={s.qtyDisplay}>
                    <Text style={s.qtyText}>{item.quantity}</Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      s.qtyBtn,
                      item.quantity >= maxStock && s.qtyBtnDisabled,
                    ]}
                    onPress={() => increaseQty(item.cartKey, item.productId)}
                    activeOpacity={0.7}
                    disabled={item.quantity >= maxStock}
                  >
                    <Text style={[
                      s.qtyBtnText,
                      item.quantity >= maxStock && s.qtyBtnTextDisabled,
                    ]}>+</Text>
                  </TouchableOpacity>
                </View>

                {/* Line total */}
                <Text style={s.cartItemTotal}>
                  ₹{(Number(item.price) * item.quantity).toFixed(2)}
                </Text>

                {/* Remove */}
                <TouchableOpacity style={s.removeBtn} onPress={() => removeItem(item.cartKey)}>
                  <Text style={s.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}}
          />
        )}
        <View style={s.checkoutFooter}>
          <View>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalAmount}>₹{cartTotal.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={[s.checkoutBtn, (items.length === 0 || isProcessingCheckout) && s.checkoutBtnDisabled]}
            disabled={items.length === 0 || isProcessingCheckout}
            onPress={() =>
              Alert.alert('Checkout', `Total: ₹${cartTotal.toFixed(2)}`, [
                { text: 'Complete Sale', onPress: handleCheckout },
                { text: 'Cancel', style: 'cancel' },
              ])
            }
          >
            {isProcessingCheckout 
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.checkoutBtnText}>Checkout</Text>}
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

  // ─── Camera ───────────────────────────────────────────────────────────────
  cameraContainer: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
  cameraOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center' as const, justifyContent: 'center' as const },

  scanFrame: {
    width: 260, height: 180,
    borderRadius: Radius.md,
    position: 'relative' as const,
  },
  scanHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FontSize.xs,
    marginTop: Spacing.sm,
    letterSpacing: 0.5,
  },

  // Corner accent lines
  corner: { position: 'absolute' as const, width: 24, height: 24, borderColor: Colors.primary, borderRadius: 3 },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },

  visualScanBtn: {
    position: 'absolute' as const, bottom: 20,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl, paddingVertical: 14,
    borderRadius: Radius.full, minWidth: 160, alignItems: 'center' as const,
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  visualScanBtnDisabled: { backgroundColor: Colors.surfaceHigh },
  visualScanBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: FontWeight.bold as any },

  matchesOverlay: {
    position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.88)', paddingTop: 50, paddingHorizontal: Spacing.md,
  },
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

  // ─── Cart ─────────────────────────────────────────────────────────────────
  cartContainer: {
    flex: 1, backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    marginTop: -20, paddingTop: Spacing.lg, paddingHorizontal: Spacing.md,
    elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: -4 },
  },
  cartHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: Spacing.sm },
  cartTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold as any, color: Colors.textPrimary },
  cartCount: { fontSize: FontSize.sm, color: Colors.textMuted },
  emptyCart: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, gap: Spacing.sm },
  emptyCartIcon: { fontSize: 36 },
  emptyCartText: { color: Colors.textMuted, fontSize: FontSize.sm },

  // Cart item row
  cartItem: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  cartItemName: { fontSize: FontSize.md, fontWeight: FontWeight.medium as any, color: Colors.textPrimary },
  cartItemPrice: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 3 },
  stockWarning: { color: Colors.warning, fontSize: FontSize.xs },

  // Quantity controls
  qtyRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.sm,
    overflow: 'hidden' as const,
  },
  qtyBtn: {
    width: 32, height: 32,
    alignItems: 'center' as const, justifyContent: 'center' as const,
    backgroundColor: Colors.borderLight,
  },
  qtyBtnDisabled: { backgroundColor: Colors.surfaceHigh },
  qtyBtnText: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold as any, lineHeight: 22 },
  qtyBtnTextDisabled: { color: Colors.textDisabled },
  qtyDisplay: {
    width: 36, height: 32,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  qtyText: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold as any },

  cartItemTotal: { fontSize: FontSize.sm, fontWeight: FontWeight.bold as any, color: Colors.textPrimary },
  removeBtn: { padding: 7, backgroundColor: 'rgba(255,59,48,0.12)', borderRadius: Radius.sm },
  removeBtnText: { color: '#FF3B30', fontWeight: FontWeight.bold as any, fontSize: FontSize.xs },

  // ─── Checkout ─────────────────────────────────────────────────────────────
  checkoutFooter: {
    flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const,
    paddingVertical: Spacing.md, paddingBottom: Spacing.xl,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  totalLabel: { fontSize: FontSize.sm, color: Colors.textMuted },
  totalAmount: { fontSize: FontSize.xl, fontWeight: FontWeight.bold as any, color: Colors.primary },
  checkoutBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: 14, borderRadius: Radius.md },
  checkoutBtnDisabled: { backgroundColor: Colors.surfaceHigh },
  checkoutBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: FontWeight.bold as any },
});