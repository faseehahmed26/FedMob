/**
 * Flower gRPC-Web Client Wrapper
 * Handles communication with Flower server using gRPC-Web
 */

import { grpc } from 'grpc-web';
import errorHandler from '../utils/errorHandler.js';

class FlowerGrpcWebClient {
  constructor(serverAddress = 'localhost:8081') {
    this.serverAddress = serverAddress;
    this.isConnected = false;
    this.client = null;
    this.messageHandlers = new Map();
    this.stream = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.messageQueue = [];
    this.isProcessing = false;

    errorHandler.info(`FlowerGrpcWebClient initialized: ${serverAddress}`);
  }

  /**
   * Connect to Flower server using gRPC-Web
   * @param {FlowerClientBase} client - Client instance
   */
  async connect(client) {
    try {
      errorHandler.info(`Connecting to Flower server: ${this.serverAddress}`);

      // Store client reference
      this.client = client;

      // Initialize gRPC-Web connection
      await this.initializeGrpcWebConnection();

      this.isConnected = true;
      this.reconnectAttempts = 0;
      errorHandler.info('Successfully connected to Flower server via gRPC-Web');

      return true;
    } catch (error) {
      errorHandler.handleError(error, 'gRPC-Web connection');
      this.isConnected = false;

      // Attempt reconnection
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        errorHandler.info(
          `Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`,
        );
        setTimeout(() => this.connect(client), 5000);
      }

      return false;
    }
  }

  /**
   * Initialize gRPC-Web connection
   */
  async initializeGrpcWebConnection() {
    try {
      // For now, we'll implement a simplified HTTP-based connection
      // In a full implementation, this would use the actual gRPC-Web protocol
      errorHandler.info('Initializing gRPC-Web connection (HTTP fallback)');

      // Test connection to server
      const testUrl = `http://${this.serverAddress}/health`;
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Server not responding: ${response.status}`);
      }

      errorHandler.info('gRPC-Web connection established');
    } catch (error) {
      errorHandler.handleError(error, 'gRPC-Web initialization');
      throw error;
    }
  }

  /**
   * Register message handlers for Flower protocol
   */
  registerMessageHandlers() {
    this.messageHandlers.set(
      'get_parameters',
      this.handleGetParameters.bind(this),
    );
    this.messageHandlers.set('fit_ins', this.handleFitIns.bind(this));
    this.messageHandlers.set('evaluate_ins', this.handleEvaluateIns.bind(this));
    this.messageHandlers.set(
      'properties_ins',
      this.handlePropertiesIns.bind(this),
    );

    errorHandler.info('Message handlers registered');
  }

  /**
   * Handle get_parameters message
   */
  async handleGetParameters(message) {
    try {
      const parameters = await this.client.get_parameters();
      errorHandler.debug('Handled get_parameters request');
      return { parameters };
    } catch (error) {
      errorHandler.handleError(error, 'Handle get_parameters');
      throw error;
    }
  }

  /**
   * Handle fit_ins message
   */
  async handleFitIns(message) {
    try {
      const { parameters, config } = message;
      const result = await this.client.fit(parameters, config);
      errorHandler.debug('Handled fit_ins request');
      return result;
    } catch (error) {
      errorHandler.handleError(error, 'Handle fit_ins');
      throw error;
    }
  }

  /**
   * Handle evaluate_ins message
   */
  async handleEvaluateIns(message) {
    try {
      const { parameters, config } = message;
      const result = await this.client.evaluate(parameters, config);
      errorHandler.debug('Handled evaluate_ins request');
      return result;
    } catch (error) {
      errorHandler.handleError(error, 'Handle evaluate_ins');
      throw error;
    }
  }

  /**
   * Handle properties_ins message
   */
  async handlePropertiesIns(message) {
    try {
      const { config } = message;
      const properties = await this.client.get_properties(config);
      errorHandler.debug('Handled properties_ins request');
      return { properties };
    } catch (error) {
      errorHandler.handleError(error, 'Handle properties_ins');
      throw error;
    }
  }

  /**
   * Send message to server
   * @param {Object} message - Message to send
   */
  async sendMessage(message) {
    try {
      if (!this.isConnected) {
        throw new Error('Not connected to server');
      }

      // For now, we'll use HTTP POST as a fallback
      // In a real implementation, this would use gRPC-Web streaming
      const response = await fetch(`http://${this.serverAddress}/api/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      errorHandler.handleError(error, 'Send message');
      throw error;
    }
  }

  /**
   * Start federated learning session
   */
  async startFederatedLearning() {
    try {
      errorHandler.info('Starting federated learning session');

      // Send join message
      const joinMessage = {
        type: 'join',
        client_id: this.client.clientId,
        capabilities: {
          num_rounds: 1,
          local_epochs: 1,
          batch_size: 32,
          learning_rate: 0.01,
        },
      };

      const response = await this.sendMessage(joinMessage);
      errorHandler.info('Successfully joined federated learning session');

      return response;
    } catch (error) {
      errorHandler.handleError(error, 'Start federated learning');
      throw error;
    }
  }

  /**
   * Send training results
   * @param {Object} results - Training results
   */
  async sendTrainingResults(results) {
    try {
      const message = {
        type: 'fit_res',
        client_id: this.client.clientId,
        results: results,
      };

      const response = await this.sendMessage(message);
      errorHandler.debug('Training results sent');
      return response;
    } catch (error) {
      errorHandler.handleError(error, 'Send training results');
      throw error;
    }
  }

  /**
   * Send evaluation results
   * @param {Object} results - Evaluation results
   */
  async sendEvaluationResults(results) {
    try {
      const message = {
        type: 'evaluate_res',
        client_id: this.client.clientId,
        results: results,
      };

      const response = await this.sendMessage(message);
      errorHandler.debug('Evaluation results sent');
      return response;
    } catch (error) {
      errorHandler.handleError(error, 'Send evaluation results');
      throw error;
    }
  }

  /**
   * Disconnect from server
   */
  async disconnect() {
    try {
      this.isConnected = false;
      this.client = null;
      this.stream = null;
      errorHandler.info('Disconnected from Flower server');
    } catch (error) {
      errorHandler.handleError(error, 'Disconnect');
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      serverAddress: this.serverAddress,
      clientId: this.client?.clientId || 'unknown',
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

export default FlowerGrpcWebClient;
