/**
 * Worker Steps Screen
 * Displays assigned production steps
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
import { getAssignedSteps, WorkerStep } from '../../api/worker.js';

export default function WorkerStepsScreen({ navigation }: any) {
  const [steps, setSteps] = useState<WorkerStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSteps = async () => {
    try {
      const data = await getAssignedSteps({ include_completed: false });
      setSteps(data);
    } catch (error: any) {
      if (error.code === 'UNAUTHORIZED') {
        Alert.alert('Session Expired', 'Please login again');
        // Navigation to login handled by AuthContext
      } else if (error.code === 'INSUFFICIENT_PERMISSIONS') {
        Alert.alert('Access Denied', error.message);
      } else {
        Alert.alert('Error', error.message || 'Failed to load steps');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSteps();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadSteps();
  };

  const handleStepPress = (step: WorkerStep) => {
    navigation.navigate('UpdateStep', { step });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#34C759';
      case 'in_progress':
        return '#007AFF';
      default:
        return '#8E8E93';
    }
  };

  const renderStep = ({ item }: { item: WorkerStep }) => (
    <TouchableOpacity
      style={styles.stepCard}
      onPress={() => handleStepPress(item)}
    >
      <View style={styles.stepHeader}>
        <Text style={styles.orderNo}>{item.order_no}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <Text style={styles.stepName}>{item.step_name}</Text>

      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          Progress: {item.completed_qty} / {item.step_qty || 'N/A'}
        </Text>
        {item.step_qty && (
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(item.completed_qty / item.step_qty) * 100}%`,
                },
              ]}
            />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading && steps.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading steps...</Text>
      </View>
    );
  }

  if (steps.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No assigned steps</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={steps}
        renderItem={renderStep}
        keyExtractor={(item) => item.step_id.toString()}
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
  stepCard: {
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
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNo: {
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
  stepName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
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
