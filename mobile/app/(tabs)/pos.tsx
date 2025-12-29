/**
 * POS Screen - Main sales interface
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/hooks/useAuth';
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus';
import { salesApi, type CreateSaleDto, type SaleItem } from '@/lib/api/sales';
import { productsApi, type ProductWithRelations } from '@/lib/api/products';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CART_STORAGE_KEY = '@pos_cart';

interface CartItem extends SaleItem {
  productName: string;
  unitName: string;
  unitPrice: number;
  lineTotal: number;
}

export default function POSScreen() {
  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [customerType, setCustomerType] = useState<'retail' | 'wholesale'>('retail');
  const { user, signOut } = useAuth();
  const isOnline = useNetworkStatus();
  const router = useRouter();

  useEffect(() => {
    loadProducts();
    loadCart();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await productsApi.getAll({ search: searchQuery });
      if (response.success && response.data) {
        setProducts(response.data);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCart = async () => {
    try {
      const cartData = await AsyncStorage.getItem(CART_STORAGE_KEY);
      if (cartData) {
        setCart(JSON.parse(cartData));
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
    }
  };

  const saveCart = async (newCart: CartItem[]) => {
    try {
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newCart));
      setCart(newCart);
    } catch (error) {
      console.error('Failed to save cart:', error);
    }
  };

  const addToCart = (product: ProductWithRelations) => {
    const variation = product.variations?.[0];
    if (!variation) {
      Alert.alert('Error', 'Product has no variations');
      return;
    }

    const unit = product.unit;
    if (!unit) {
      Alert.alert('Error', 'Product has no unit');
      return;
    }

    const unitPrice = customerType === 'retail' ? variation.retail_price : variation.wholesale_price;
    const existingItem = cart.find(
      (item) => item.variationId === variation.id && item.unitId === unit.id
    );

    if (existingItem) {
      const updatedCart = cart.map((item) =>
        item.variationId === variation.id && item.unitId === unit.id
          ? {
              ...item,
              quantity: item.quantity + 1,
              lineTotal: (item.quantity + 1) * item.unitPrice,
            }
          : item
      );
      saveCart(updatedCart);
    } else {
      const newItem: CartItem = {
        variationId: variation.id,
        quantity: 1,
        unitId: unit.id,
        productName: product.name,
        unitName: unit.actual_name,
        unitPrice,
        lineTotal: unitPrice,
      };
      saveCart([...cart, newItem]);
    }
  };

  const updateQuantity = (variationId: number, unitId: number, delta: number) => {
    const updatedCart = cart
      .map((item) => {
        if (item.variationId === variationId && item.unitId === unitId) {
          const newQuantity = Math.max(1, item.quantity + delta);
          return {
            ...item,
            quantity: newQuantity,
            lineTotal: newQuantity * item.unitPrice,
          };
        }
        return item;
      })
      .filter((item) => item.quantity > 0);
    saveCart(updatedCart);
  };

  const removeFromCart = (variationId: number, unitId: number) => {
    const updatedCart = cart.filter(
      (item) => !(item.variationId === variationId && item.unitId === unitId)
    );
    saveCart(updatedCart);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Error', 'Cart is empty');
      return;
    }

    setProcessing(true);
    try {
      const saleData: CreateSaleDto = {
        locationId: 1, // TODO: Get from user context
        customerType,
        items: cart.map((item) => ({
          variationId: item.variationId,
          quantity: item.quantity,
          unitId: item.unitId,
        })),
        status: 'final',
      };

      const response = await salesApi.create(saleData, isOnline);
      if (response.success) {
        Alert.alert('Success', isOnline ? 'Sale completed!' : 'Sale queued for sync');
        saveCart([]);
      } else {
        Alert.alert('Error', response.error?.message || 'Failed to complete sale');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const total = cart.reduce((sum, item) => sum + item.lineTotal, 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>POS</Text>
          {!isOnline && (
            <Text style={styles.offlineBadge}>Offline Mode</Text>
          )}
        </View>
        <TouchableOpacity onPress={() => signOut()}>
          <Ionicons name="log-out-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Customer Type Toggle */}
      <View style={styles.customerTypeContainer}>
        <TouchableOpacity
          style={[styles.customerTypeButton, customerType === 'retail' && styles.customerTypeActive]}
          onPress={() => setCustomerType('retail')}
        >
          <Text style={[styles.customerTypeText, customerType === 'retail' && styles.customerTypeTextActive]}>
            Retail
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.customerTypeButton, customerType === 'wholesale' && styles.customerTypeActive]}
          onPress={() => setCustomerType('wholesale')}
        >
          <Text style={[styles.customerTypeText, customerType === 'wholesale' && styles.customerTypeTextActive]}>
            Wholesale
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Products List */}
        <View style={styles.productsSection}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={loadProducts}
          />
          {loading ? (
            <ActivityIndicator style={styles.loader} />
          ) : (
            <FlatList
              data={products}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => {
                const variation = item.variations?.[0];
                const price = customerType === 'retail' ? variation?.retail_price : variation?.wholesale_price;
                return (
                  <TouchableOpacity
                    style={styles.productItem}
                    onPress={() => addToCart(item)}
                  >
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{item.name}</Text>
                      <Text style={styles.productSku}>{item.sku}</Text>
                    </View>
                    <Text style={styles.productPrice}>${price?.toFixed(2) || '0.00'}</Text>
                    <Ionicons name="add-circle" size={24} color="#2563eb" />
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>

        {/* Cart */}
        <View style={styles.cartSection}>
          <Text style={styles.cartTitle}>Cart ({cart.length})</Text>
          <FlatList
            data={cart}
            keyExtractor={(item, index) => `${item.variationId}-${item.unitId}-${index}`}
            renderItem={({ item }) => (
              <View style={styles.cartItem}>
                <View style={styles.cartItemInfo}>
                  <Text style={styles.cartItemName}>{item.productName}</Text>
                  <Text style={styles.cartItemUnit}>{item.unitName}</Text>
                </View>
                <View style={styles.cartItemControls}>
                  <TouchableOpacity
                    onPress={() => updateQuantity(item.variationId, item.unitId, -1)}
                    style={styles.quantityButton}
                  >
                    <Ionicons name="remove" size={20} color="#666" />
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                  <TouchableOpacity
                    onPress={() => updateQuantity(item.variationId, item.unitId, 1)}
                    style={styles.quantityButton}
                  >
                    <Ionicons name="add" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.cartItemTotal}>${item.lineTotal.toFixed(2)}</Text>
                <TouchableOpacity
                  onPress={() => removeFromCart(item.variationId, item.unitId)}
                  style={styles.removeButton}
                >
                  <Ionicons name="trash" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            )}
          />
          <View style={styles.cartFooter}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.checkoutButton, (cart.length === 0 || processing) && styles.checkoutButtonDisabled]}
            onPress={handleCheckout}
            disabled={cart.length === 0 || processing}
          >
            {processing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.checkoutButtonText}>Checkout</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  offlineBadge: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  customerTypeContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  customerTypeButton: {
    flex: 1,
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  customerTypeActive: {
    backgroundColor: '#2563eb',
  },
  customerTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  customerTypeTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  productsSection: {
    flex: 1,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  searchInput: {
    padding: 12,
    margin: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    fontSize: 16,
  },
  loader: {
    marginTop: 40,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  productSku: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
    marginRight: 12,
  },
  cartSection: {
    width: 350,
    backgroundColor: '#fff',
    padding: 16,
  },
  cartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1a1a1a',
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  cartItemUnit: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  quantityButton: {
    padding: 4,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 8,
    minWidth: 30,
    textAlign: 'center',
  },
  cartItemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    marginRight: 8,
    minWidth: 60,
    textAlign: 'right',
  },
  removeButton: {
    padding: 4,
  },
  cartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  checkoutButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  checkoutButtonDisabled: {
    opacity: 0.5,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

