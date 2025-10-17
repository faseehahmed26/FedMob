// src/screens/ModelLibraryScreen.jsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ModelStorageService from '../services/ModelStorageService';

const ModelLibraryScreen = ({ navigation }) => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [storageInfo, setStorageInfo] = useState(null);

  // Load models on component mount
  useEffect(() => {
    loadModels();
  }, []);

  // Load models from storage
  const loadModels = async () => {
    try {
      setLoading(true);
      const modelsList = await ModelStorageService.getAllModels();
      setModels(modelsList);

      // Get storage info
      const info = await ModelStorageService.getStorageInfo();
      setStorageInfo(info);
    } catch (error) {
      console.error('Failed to load models:', error);
      Alert.alert('Error', 'Failed to load models from storage');
    } finally {
      setLoading(false);
    }
  };

  // Refresh models
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadModels();
    setRefreshing(false);
  }, []);

  // Delete a model
  const handleDeleteModel = async (modelId, modelName) => {
    Alert.alert(
      'Delete Model',
      `Are you sure you want to delete "${modelName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await ModelStorageService.deleteModel(modelId);
              if (success) {
                await loadModels(); // Refresh the list
                Alert.alert('Success', 'Model deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete model');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete model');
            }
          },
        },
      ],
    );
  };

  // Navigate to inference with selected model
  const handleLoadForInference = model => {
    navigation.navigate('Inference', { selectedModel: model });
  };

  // Debug storage function
  const debugStorage = async () => {
    try {
      console.log('=== DEBUGGING STORAGE ===');

      // Check AsyncStorage directly
      const keys = await AsyncStorage.getAllKeys();
      console.log('All AsyncStorage keys:', keys);

      // Check models list
      const modelsList = await AsyncStorage.getItem('fedmob_models_list');
      console.log('Models list:', modelsList);

      // Try to get all models
      const models = await ModelStorageService.getAllModels();
      console.log('Models from service:', models);

      // Get storage info
      const info = await ModelStorageService.getStorageInfo();
      console.log('Storage info:', info);
    } catch (error) {
      console.error('Debug storage error:', error);
    }
  };

  // Format date for display
  const formatDate = timestamp => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Format metrics for display
  const formatMetrics = metrics => {
    if (!metrics) return 'No metrics';

    const parts = [];
    if (metrics.accuracy !== undefined) {
      parts.push(`Acc: ${(metrics.accuracy * 100).toFixed(1)}%`);
    }
    if (metrics.loss !== undefined) {
      parts.push(`Loss: ${metrics.loss.toFixed(3)}`);
    }
    if (metrics.round !== undefined) {
      parts.push(`Round: ${metrics.round}`);
    }

    return parts.join(' | ');
  };

  // Render individual model item
  const renderModelItem = ({ item }) => (
    <View style={styles.modelCard}>
      <View style={styles.modelHeader}>
        <Text style={styles.modelName}>{item.name}</Text>
        <Text style={styles.modelDate}>{formatDate(item.timestamp)}</Text>
      </View>

      <View style={styles.modelMetrics}>
        <Text style={styles.metricsText}>{formatMetrics(item.metrics)}</Text>
      </View>

      {/* Training History */}
      {item.metrics &&
        item.metrics.rounds &&
        item.metrics.rounds.length > 0 && (
          <View style={styles.trainingHistory}>
            <Text style={styles.historyTitle}>Training History:</Text>
            {item.metrics.rounds.map((round, index) => (
              <View key={index} style={styles.roundItem}>
                <Text style={styles.roundText}>
                  Round {round.round}: Acc{' '}
                  {round.accuracy ? (round.accuracy * 100).toFixed(1) : 'N/A'}%
                  | Loss {round.loss ? round.loss.toFixed(3) : 'N/A'}
                </Text>
              </View>
            ))}
          </View>
        )}

      <View style={styles.modelActions}>
        <TouchableOpacity
          style={styles.inferenceButton}
          onPress={() => handleLoadForInference(item)}
        >
          <Text style={styles.buttonText}>🔍 Test Model</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteModel(item.id, item.name)}
        >
          <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>📚 No Models Found</Text>
      <Text style={styles.emptySubtitle}>
        Train a model in the Training tab to see it here
      </Text>
    </View>
  );

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Loading models...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Model Library</Text>
        {storageInfo && (
          <Text style={styles.subtitle}>
            {storageInfo.totalModels} models • {storageInfo.totalSizeMB} MB
          </Text>
        )}
        <TouchableOpacity style={styles.debugButton} onPress={debugStorage}>
          <Text style={styles.buttonText}>🐛 Debug Storage</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={models}
        renderItem={renderModelItem}
        keyExtractor={item => item.id}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
  },
  listContainer: {
    padding: 20,
  },
  modelCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  modelName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  modelDate: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 10,
  },
  modelMetrics: {
    marginBottom: 12,
  },
  metricsText: {
    fontSize: 14,
    color: '#495057',
    fontFamily: 'monospace',
  },
  trainingHistory: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 8,
  },
  roundItem: {
    marginBottom: 4,
  },
  roundText: {
    fontSize: 12,
    color: '#6c757d',
    fontFamily: 'monospace',
  },
  modelActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inferenceButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6c757d',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
  debugButton: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginTop: 8,
    alignSelf: 'center',
  },
});

export default ModelLibraryScreen;
