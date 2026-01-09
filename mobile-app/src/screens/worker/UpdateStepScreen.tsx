/**
 * Update Step Screen
 * Allows worker to update step progress and status
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
import {
  updateStepProgress,
  updateStepStatus,
  WorkerStep,
} from '../../api/worker.js';

export default function UpdateStepScreen({ route, navigation }: any) {
  const { step: initialStep } = route.params;
  const [step, setStep] = useState<WorkerStep>(initialStep);
  const [completedQty, setCompletedQty] = useState(
    step.completed_qty.toString()
  );
  const [loading, setLoading] = useState(false);

  const handleUpdateProgress = async () => {
    const qty = parseFloat(completedQty);
    if (isNaN(qty) || qty < 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    if (step.step_qty && qty > step.step_qty) {
      Alert.alert(
        'Error',
        `Completed quantity cannot exceed step quantity (${step.step_qty})`
      );
      return;
    }

    setLoading(true);
    try {
      const updated = await updateStepProgress(step.step_id, qty);
      setStep(updated);
      Alert.alert('Success', 'Progress updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update progress');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: 'in_progress' | 'completed') => {
    if (newStatus === 'completed' && step.step_qty) {
      if (step.completed_qty !== step.step_qty) {
        Alert.alert(
          'Error',
          `Cannot mark as completed. Completed quantity (${step.completed_qty}) must equal step quantity (${step.step_qty})`
        );
        return;
      }
    }

    setLoading(true);
    try {
      const updated = await updateStepStatus(step.step_id, newStatus);
      setStep(updated);
      Alert.alert('Success', 'Status updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.label}>Order Number</Text>
          <Text style={styles.value}>{step.order_no}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.label}>Step Name</Text>
          <Text style={styles.value}>{step.step_name}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.label}>Status</Text>
          <Text style={[styles.value, styles.statusText]}>{step.status}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.label}>Step Quantity</Text>
          <Text style={styles.value}>
            {step.step_qty ? step.step_qty.toString() : 'Not set'}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.label}>Completed Quantity</Text>
          <Text style={styles.value}>{step.completed_qty}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Update Progress</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter completed quantity"
            value={completedQty}
            onChangeText={setCompletedQty}
            keyboardType="numeric"
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleUpdateProgress}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Updating...' : 'Update Progress'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Update Status</Text>
          {step.status === 'pending' && (
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => handleUpdateStatus('in_progress')}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Mark as In Progress</Text>
            </TouchableOpacity>
          )}
          {step.status === 'in_progress' && (
            <TouchableOpacity
              style={[styles.button, styles.buttonSuccess]}
              onPress={() => handleUpdateStatus('completed')}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Mark as Completed</Text>
            </TouchableOpacity>
          )}
        </View>
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
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusText: {
    textTransform: 'uppercase',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: '#fff',
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
  buttonSuccess: {
    backgroundColor: '#34C759',
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
