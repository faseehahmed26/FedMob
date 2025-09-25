// src/federated/FlowerClient.js

import WebSocketClient from './WebSocketClient';
import tensorFlowManager from '../utils/tensorflow.js';

class FlowerClient {
  constructor(serverUrl, clientId) {
    this.clientId = clientId;
    this.wsClient = new WebSocketClient(serverUrl);
    this.model = null;
    this.currentRound = 0;
    this.setupMessageHandlers();
  }

  async connect() {
    try {
      // Initialize TensorFlow.js
      await tensorFlowManager.initialize();
      
      // Create initial model
      this.model = await tensorFlowManager.createMNISTModel();
      
      // Connect WebSocket
      const connected = await this.wsClient.connect();
      
      if (connected) {
        await this.sendJoin();
      }
      
      return connected;
    } catch (error) {
      console.error('Failed to connect:', error);
      return false;
    }
  }

  private setupMessageHandlers() {
    this.wsClient.registerHandler('get_parameters', this.handleGetParameters.bind(this));
    this.wsClient.registerHandler('fit', this.handleFit.bind(this));
    this.wsClient.registerHandler('evaluate', this.handleEvaluate.bind(this));
  }

  private async sendJoin() {
    await this.wsClient.send('join', {
      client_id: this.clientId,
      capabilities: {
        training: true,
        evaluation: true
      }
    });
  }

  async handleGetParameters() {
    try {
      const parameters = await tensorFlowManager.extractWeights(this.model);
      return this.wsClient.send('parameters', { parameters });
    } catch (error) {
      console.error('Failed to get parameters:', error);
    }
  }

  async handleFit(payload) {
    try {
      const { parameters, config } = payload;
      
      // Update model with received parameters
      await tensorFlowManager.setWeights(this.model, parameters);
      
      // Train for one epoch
      const result = await this.trainOneEpoch(config);
      
      // Send back the updated parameters
      const updatedParameters = await tensorFlowManager.extractWeights(this.model);
      
      await this.wsClient.send('fit_res', {
        parameters: updatedParameters,
        metrics: result
      });
    } catch (error) {
      console.error('Failed to perform fit:', error);
    }
  }

  private async trainOneEpoch(config) {
    // Implementation depends on your data handling
    // This is a placeholder
    return {
      loss: 0,
      accuracy: 0
    };
  }

  disconnect() {
    this.wsClient.disconnect();
    if (this.model) {
      tensorFlowManager.disposeModel(this.model);
    }
  }

  getStatus() {
    return {
      ...this.wsClient.getStatus(),
      currentRound: this.currentRound,
      modelReady: !!this.model
    };
  }
}

export default FlowerClient;