/**
 * Inventory Screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { reportsApi, type InventoryItem } from '@/lib/api/reports';

export default function InventoryScreen() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lowStockOnly, setLowStockOnly] = useState(false);

  useEffect(() => {
    loadInventory();
  }, [lowStockOnly]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const response = await reportsApi.getInventory({ low_stock_only: lowStockOnly });
      if (response.success && response.data) {
        setInventory(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Inventory</Text>
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Low Stock Only</Text>
          <Switch value={lowStockOnly} onValueChange={setLowStockOnly} />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <FlatList
          data={inventory}
          keyExtractor={(item, index) => `${item.variationId}-${index}`}
          renderItem={({ item }) => (
            <View style={styles.inventoryItem}>
              <View style={styles.inventoryInfo}>
                <Text style={styles.productName}>{item.productName}</Text>
                <Text style={styles.variationName}>{item.variationName}</Text>
                <Text style={styles.locationName}>{item.locationName}</Text>
              </View>
              <View style={styles.inventoryStock}>
                <Text style={styles.stockAmount}>{item.qtyInPieces}</Text>
                <Text style={styles.stockLabel}>Pieces</Text>
                {item.isLowStock && (
                  <View style={styles.lowStockBadge}>
                    <Text style={styles.lowStockText}>Low Stock</Text>
                  </View>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No inventory items found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterLabel: {
    fontSize: 14,
    color: '#666',
  },
  loader: {
    marginTop: 40,
  },
  inventoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  inventoryInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  variationName: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  locationName: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  inventoryStock: {
    alignItems: 'flex-end',
  },
  stockAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  stockLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  lowStockBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
  },
  lowStockText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

