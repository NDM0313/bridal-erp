/**
 * Sales List Screen
 * Displays all sales transactions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { getSales, Sale } from '../../api/sales.js';

export default function SalesListScreen({ navigation }: any) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSales = async () => {
    try {
      const data = await getSales();
      setSales(data);
    } catch (error: any) {
      if (error.code === 'UNAUTHORIZED') {
        Alert.alert('Session Expired', 'Please login again');
      } else if (error.code === 'INSUFFICIENT_PERMISSIONS') {
        Alert.alert('Access Denied', error.message);
      } else {
        Alert.alert('Error', error.message || 'Failed to load sales');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadSales();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'final':
        return '#34C759';
      case 'draft':
        return '#FF9500';
      default:
        return '#8E8E93';
    }
  };

  const renderSale = ({ item }: { item: Sale }) => (
    <TouchableOpacity style={styles.saleCard}>
      <View style={styles.saleHeader}>
        <Text style={styles.invoiceNo}>{item.invoice_no}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.saleDetails}>
        <Text style={styles.date}>{formatDate(item.transaction_date)}</Text>
        <Text style={styles.amount}>{formatCurrency(item.final_total)}</Text>
      </View>

      <View style={styles.paymentStatus}>
        <Text style={styles.paymentLabel}>Payment:</Text>
        <Text style={styles.paymentValue}>{item.payment_status}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading && sales.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading sales...</Text>
      </View>
    );
  }

  if (sales.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No sales found</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sales}
        renderItem={renderSale}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  list: {
    padding: 16,
  },
  saleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  invoiceNo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  saleDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
    color: '#666',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  paymentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  paymentLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 4,
  },
  paymentValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  refreshButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
