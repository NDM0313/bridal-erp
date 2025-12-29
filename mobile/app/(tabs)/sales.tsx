/**
 * Sales History Screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { salesApi, type Sale } from '@/lib/api/sales';
import { format } from 'date-fns';

export default function SalesScreen() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      setLoading(true);
      const response = await salesApi.getAll({ per_page: 50 });
      if (response.success && response.data) {
        setSales(response.data);
      }
    } catch (error) {
      console.error('Failed to load sales:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sales History</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.saleItem}>
              <View style={styles.saleInfo}>
                <Text style={styles.saleInvoice}>{item.invoice_no}</Text>
                <Text style={styles.saleDate}>
                  {format(new Date(item.transaction_date), 'MMM dd, yyyy HH:mm')}
                </Text>
                {item.contact && (
                  <Text style={styles.saleCustomer}>{item.contact.name}</Text>
                )}
              </View>
              <View style={styles.saleAmount}>
                <Text style={styles.amountText}>${item.final_total.toFixed(2)}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    item.status === 'final' ? styles.statusFinal : styles.statusDraft,
                  ]}
                >
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No sales found</Text>
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
  },
  loader: {
    marginTop: 40,
  },
  saleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  saleInfo: {
    flex: 1,
  },
  saleInvoice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  saleDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  saleCustomer: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  saleAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusFinal: {
    backgroundColor: '#dcfce7',
  },
  statusDraft: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
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

