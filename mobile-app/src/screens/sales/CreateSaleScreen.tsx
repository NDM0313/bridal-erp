/**
 * Create Sale Screen
 * Allows creating a new sale transaction
 * 
 * NOTE: This is a simplified MVP version
 * Full implementation would include:
 * - Product selection/search
 * - Quantity input
 * - Customer selection
 * - Payment method
 * - Discounts
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { createSale, CreateSaleRequest } from '../../api/sales.js';
import { useAuth } from '../../auth/AuthContext.js';

export default function CreateSaleScreen({ navigation }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([
    { productId: '', variationId: '', unitId: '', quantity: '' },
  ]);

  // MVP: Simplified form
  // In full implementation, this would have:
  // - Product picker
  // - Variation selector
  // - Unit selector
  // - Quantity input
  // - Customer selector
  // - Payment method selector

  const handleCreateSale = async () => {
    // Validate items
    const validItems = items.filter(
      (item) => item.productId && item.quantity && parseFloat(item.quantity) > 0
    );

    if (validItems.length === 0) {
      Alert.alert('Error', 'Please add at least one product');
      return;
    }

    // MVP: Using default location_id from user context
    // In full implementation, this would come from BranchContext
    const saleData: CreateSaleRequest = {
      locationId: 1, // TODO: Get from active branch context
      items: validItems.map((item) => ({
        productId: parseInt(item.productId),
        variationId: parseInt(item.variationId),
        unitId: parseInt(item.unitId),
        quantity: parseFloat(item.quantity),
      })),
      status: 'draft', // MVP: Always create as draft
    };

    setLoading(true);
    try {
      const result = await createSale(saleData);
      Alert.alert('Success', 'Sale created successfully', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('SalesList'),
        },
      ]);
    } catch (error: any) {
      if (error.code === 'INSUFFICIENT_STOCK') {
        Alert.alert('Insufficient Stock', error.message);
      } else if (error.code === 'VALIDATION_ERROR') {
        Alert.alert('Validation Error', error.message);
      } else {
        Alert.alert('Error', error.message || 'Failed to create sale');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.note}>
          MVP Version: This is a simplified create sale screen.{'\n'}
          Full implementation will include product selection, customer selection,
          and payment method.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sale Items</Text>
          {items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <TextInput
                style={styles.input}
                placeholder="Product ID"
                value={item.productId}
                onChangeText={(text) => {
                  const newItems = [...items];
                  newItems[index].productId = text;
                  setItems(newItems);
                }}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Variation ID"
                value={item.variationId}
                onChangeText={(text) => {
                  const newItems = [...items];
                  newItems[index].variationId = text;
                  setItems(newItems);
                }}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Unit ID"
                value={item.unitId}
                onChangeText={(text) => {
                  const newItems = [...items];
                  newItems[index].unitId = text;
                  setItems(newItems);
                }}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Quantity"
                value={item.quantity}
                onChangeText={(text) => {
                  const newItems = [...items];
                  newItems[index].quantity = text;
                  setItems(newItems);
                }}
                keyboardType="numeric"
              />
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => {
            setItems([
              ...items,
              { productId: '', variationId: '', unitId: '', quantity: '' },
            ]);
          }}
        >
          <Text style={styles.buttonText}>Add Item</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCreateSale}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating...' : 'Create Sale (Draft)'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  note: {
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  itemRow: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  button: {
    height: 50,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonSecondary: {
    backgroundColor: '#5856D6',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
