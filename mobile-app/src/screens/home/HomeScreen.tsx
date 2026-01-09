/**
 * Home / Dashboard Screen
 * Role-based module cards and navigation
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '../../auth/AuthContext.js';
import { usePermissions } from '../../hooks/usePermissions.js';
import RoleGuard from '../../components/RoleGuard.js';

export default function HomeScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { hasPermission } = usePermissions();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome, {user?.email}</Text>
        <Text style={styles.role}>Role: {user?.role}</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.modules}>
        {/* Production Worker Module */}
        <RoleGuard permission="worker.steps.view">
          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => navigation.navigate('WorkerSteps')}
          >
            <Text style={styles.moduleTitle}>My Assigned Steps</Text>
            <Text style={styles.moduleDescription}>
              View and update your production steps
            </Text>
          </TouchableOpacity>
        </RoleGuard>

        {/* Sales Module */}
        <RoleGuard permission="sales.view">
          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => navigation.navigate('SalesList')}
          >
            <Text style={styles.moduleTitle}>View Sales</Text>
            <Text style={styles.moduleDescription}>
              View all sales transactions
            </Text>
          </TouchableOpacity>
        </RoleGuard>

        <RoleGuard permission="sales.create">
          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => navigation.navigate('CreateSale')}
          >
            <Text style={styles.moduleTitle}>Create Sale</Text>
            <Text style={styles.moduleDescription}>
              Create a new sale transaction
            </Text>
          </TouchableOpacity>
        </RoleGuard>

        {/* Production Overview (Admin/Manager) */}
        <RoleGuard permission="production.view">
          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => {
              Alert.alert('Coming Soon', 'Production overview screen');
            }}
          >
            <Text style={styles.moduleTitle}>Production Overview</Text>
            <Text style={styles.moduleDescription}>
              View production orders and status
            </Text>
          </TouchableOpacity>
        </RoleGuard>

        {/* Reports (Admin/Manager/Auditor) */}
        <RoleGuard permission="reports.view">
          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => {
              Alert.alert('Coming Soon', 'Reports screen');
            }}
          >
            <Text style={styles.moduleTitle}>Reports</Text>
            <Text style={styles.moduleDescription}>
              View business reports and analytics
            </Text>
          </TouchableOpacity>
        </RoleGuard>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  role: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  logoutButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#ff3b30',
    borderRadius: 6,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modules: {
    padding: 16,
  },
  moduleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  moduleDescription: {
    fontSize: 14,
    color: '#666',
  },
});
