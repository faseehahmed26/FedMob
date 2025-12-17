// src/screens/TrainingScreen.jsx

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import FlowerClient from '../federated/FlowerClient.js';
import tensorFlowManager from '../utils/tensorflow.js';
import ModelManager from '../federated/ModelManager.js';
import ModelStorageService from '../services/ModelStorageService.js';

const TrainingScreen = () => {
  // State management
  const [client, setClient] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  // const [serverAddress, setServerAddress] = useState('10.118.29.192:8082');
  const [serverAddress, setServerAddress] = useState('10.5.1.254:8082');

  const [clientId, setClientId] = useState(`mobile_${Date.now()}`);
  const [currentRound, setCurrentRound] = useState(0);
  const [trainingStatus, setTrainingStatus] = useState('idle');
  const [metrics, setMetrics] = useState({});
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);
  const [modelReady, setModelReady] = useState(false);
  const [memoryStats, setMemoryStats] = useState(null);
  const [modelManager, setModelManager] = useState(null);
  const modelManagerRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize client
  useEffect(() => {
    const initializeClient = async () => {
      try {
        // Initialize TensorFlow.js
        await tensorFlowManager.initialize();

        // Create model manager
        const manager = new ModelManager();
        await manager.initializeModel();
        setModelManager(manager);
        modelManagerRef.current = manager;

        // Create new client
        const flowerClient = new FlowerClient(serverAddress, clientId);

        // Set up event handlers
        flowerClient.onRoundStart = round => {
          setCurrentRound(round);
          setProgress(0);
          setTrainingStatus('training');
          addLog(`Starting round ${round}`);
        };

        flowerClient.onRoundComplete = async (round, roundMetrics) => {
          setMetrics(roundMetrics);
          setProgress(100);
          setTrainingStatus('completed');
          addLog(`Completed round ${round}`);

          // Auto-save model after training completion
          if (roundMetrics && Object.keys(roundMetrics).length > 0) {
            await handleAutoSave(roundMetrics);
          }
        };

        flowerClient.onTrainingProgress = roundProgress => {
          setProgress(Math.round(roundProgress * 100));
        };

        setClient(flowerClient);
        setModelReady(true);
        addLog('FedMob client initialized');
      } catch (error) {
        addLog(`❌ Initialization error: ${error.message}`);
        Alert.alert('Initialization Error', error.message);
      }
    };

    initializeClient();
  }, [serverAddress, clientId]);

  // Memory monitoring
  useEffect(() => {
    const monitorMemory = () => {
      if (modelReady && modelManager) {
        const stats = modelManager.getMemoryInfo();
        setMemoryStats(stats);
      }
    };

    const interval = setInterval(monitorMemory, 5000);
    return () => clearInterval(interval);
  }, [modelReady, modelManager]);

  // Add log message
  const addLog = message => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // Auto-save model after training
  const handleAutoSave = async roundMetrics => {
    try {
      const mm = modelManagerRef.current || modelManager;
      if (!mm) {
        addLog('❌ Model manager not available for saving');
        return;
      }

      setIsSaving(true);
      addLog('💾 Auto-saving trained model...');

      // Get model weights
      const weights = await mm.getModelWeights();

      // Create model data for storage
      const modelData = {
        name: `FL Round ${currentRound} Model - ${new Date().toLocaleString()}`,
        weights: weights,
        metrics: {
          ...roundMetrics,
          round: currentRound,
          timestamp: Date.now(),
        },
      };

      // Save to storage
      const modelId = await ModelStorageService.saveModel(modelData);
      addLog(`✅ Model saved with ID: ${modelId}`);
    } catch (error) {
      // Keep user-facing log only
      addLog(`❌ Auto-save failed: ${error.message}`);
      Alert.alert('Auto-save Error', `Failed to save model: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Manual save model
  const handleManualSave = async () => {
    try {
      if (!modelManager) {
        Alert.alert('Error', 'Model manager not available');
        return;
      }

      if (!metrics || Object.keys(metrics).length === 0) {
        Alert.alert('Error', 'No training metrics available to save');
        return;
      }

      setIsSaving(true);
      addLog('💾 Manually saving model...');

      const weights = await modelManager.getModelWeights();

      const modelData = {
        name: `Manual Save - Round ${currentRound}`,
        weights: weights,
        metrics: {
          ...metrics,
          round: currentRound,
          timestamp: Date.now(),
        },
      };

      const modelId = await ModelStorageService.saveModel(modelData);
      addLog(`✅ Model manually saved with ID: ${modelId}`);

      Alert.alert('Success', 'Model saved successfully!');
    } catch (error) {
      addLog(`❌ Manual save failed: ${error.message}`);
      Alert.alert('Save Error', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Connect to server
  const handleConnect = async () => {
    try {
      if (!modelReady) {
        Alert.alert(
          'Not Ready',
          'TensorFlow.js is still initializing. Please wait.',
        );
        return;
      }

      addLog(`Connecting to server: ${serverAddress}`);
      setTrainingStatus('connecting');

      const connected = await client.connect();

      if (connected) {
        setIsConnected(true);
        setTrainingStatus('connected');
        addLog('✅ Successfully connected to server');
      } else {
        setTrainingStatus('error');
        addLog('❌ Failed to connect to server');
        Alert.alert(
          'Connection Failed',
          'Could not connect to the server. Please check the server address and try again.',
        );
      }
    } catch (error) {
      setTrainingStatus('error');
      addLog(`❌ Connection error: ${error.message}`);
      Alert.alert('Connection Error', error.message);
    }
  };

  // Disconnect from server
  const handleDisconnect = async () => {
    try {
      await client.disconnect();
      setIsConnected(false);
      setTrainingStatus('idle');
      setCurrentRound(0);
      setMetrics({});
      setProgress(0);
      addLog('Disconnected from server');
    } catch (error) {
      addLog(`Disconnect error: ${error.message}`);
    }
  };

  // Start federated learning
  const handleStartFL = async () => {
    try {
      addLog('🚀 Starting federated learning...');
      setTrainingStatus('training');
      setProgress(0);

      await client.startTraining(currentRound);
    } catch (error) {
      setTrainingStatus('error');
      addLog(`❌ FL error: ${error.message}`);
      Alert.alert('Training Error', error.message);
    }
  };

  // Get client status
  const getClientStatus = () => {
    if (!client) return {};
    return client.getStatus();
  };

  const status = getClientStatus();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>FedMob</Text>
          <Text style={styles.subtitle}>Federated Learning Mobile Client</Text>
        </View>

        {/* Connection Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔗 Connection</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Server Address:</Text>
            <TextInput
              style={styles.input}
              value={serverAddress}
              onChangeText={setServerAddress}
              placeholder="10.5.1.254:8082"
              editable={!isConnected}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Client ID:</Text>
            <TextInput
              style={styles.input}
              value={clientId}
              onChangeText={setClientId}
              placeholder="mobile_client_123"
              editable={!isConnected}
            />
          </View>

          <View style={styles.buttonContainer}>
            {!isConnected ? (
              <TouchableOpacity
                style={[
                  styles.connectButton,
                  !modelReady && styles.disabledButton,
                ]}
                onPress={handleConnect}
                disabled={!modelReady}
              >
                <Text style={styles.buttonText}>
                  {modelReady ? 'Connect to Server' : 'Initializing...'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.disconnectButton}
                onPress={handleDisconnect}
              >
                <Text style={styles.buttonText}>Disconnect</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Status</Text>

          <View style={styles.statusContainer}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Connection:</Text>
              <Text
                style={[
                  styles.statusValue,
                  { color: isConnected ? '#28a745' : '#dc3545' },
                ]}
              >
                {isConnected ? 'Connected' : 'Disconnected'}
              </Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Model:</Text>
              <Text
                style={[
                  styles.statusValue,
                  { color: modelReady ? '#28a745' : '#ffc107' },
                ]}
              >
                {modelReady ? 'Ready' : 'Initializing...'}
              </Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status:</Text>
              <Text style={styles.statusValue}>{trainingStatus}</Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Round:</Text>
              <Text style={styles.statusValue}>{currentRound}</Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Client ID:</Text>
              <Text style={styles.statusValue}>{clientId}</Text>
            </View>
          </View>
        </View>

        {/* Training Section */}
        {isConnected && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🤖 Federated Learning</Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.flButton,
                  trainingStatus === 'training' && styles.disabledButton,
                ]}
                onPress={handleStartFL}
                disabled={trainingStatus === 'training'}
              >
                <Text style={styles.buttonText}>
                  {trainingStatus === 'training'
                    ? 'Training...'
                    : 'Start FL Training'}
                </Text>
              </TouchableOpacity>
            </View>

            {trainingStatus === 'training' && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${progress}%` }]} />
                <Text style={styles.progressText}>{progress}%</Text>
              </View>
            )}

            {/* Save Model Button */}
            {trainingStatus === 'completed' &&
              metrics &&
              Object.keys(metrics).length > 0 && (
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      isSaving && styles.disabledButton,
                    ]}
                    onPress={handleManualSave}
                    disabled={isSaving}
                  >
                    <Text style={styles.buttonText}>
                      {isSaving ? 'Saving...' : '💾 Save Model'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

            {/* Metrics Display */}
            {metrics && Object.keys(metrics).length > 0 && (
              <View style={styles.metricsContainer}>
                <Text style={styles.metricsTitle}>Training Metrics:</Text>
                {Object.entries(metrics).map(([key, value]) => (
                  <View key={key} style={styles.metricRow}>
                    <Text style={styles.metricLabel}>{key}:</Text>
                    <Text style={styles.metricValue}>
                      {typeof value === 'number' ? value.toFixed(4) : value}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Memory Stats */}
            {memoryStats && (
              <View style={styles.metricsContainer}>
                <Text style={styles.metricsTitle}>Memory Usage:</Text>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Tensors:</Text>
                  <Text style={styles.metricValue}>
                    {memoryStats.numTensors}
                  </Text>
                </View>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Memory (MB):</Text>
                  <Text style={styles.metricValue}>
                    {(memoryStats.numBytes / 1024 / 1024).toFixed(2)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Logs Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Logs</Text>
          <View style={styles.logsContainer}>
            {logs.slice(-10).map((log, index) => (
              <Text key={index} style={styles.logText}>
                {log}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  progressContainer: {
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    marginTop: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#28a745',
    borderRadius: 10,
  },
  progressText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    color: '#000',
    fontSize: 12,
    lineHeight: 20,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  buttonContainer: {
    marginTop: 10,
  },
  connectButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disconnectButton: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  flButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#17a2b8',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34495e',
  },
  statusValue: {
    fontSize: 14,
    color: '#2c3e50',
  },
  metricsContainer: {
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 15,
    marginTop: 15,
  },
  metricsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 10,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  metricLabel: {
    fontSize: 14,
    color: '#155724',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#155724',
  },
  logsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    maxHeight: 200,
  },
  logText: {
    fontSize: 12,
    color: '#495057',
    marginBottom: 2,
    fontFamily: 'monospace',
  },
});

export default TrainingScreen;
