/**
 * WebSocket Client for FedMob
 * Handles communication with Python Client Server
 */

class WebSocketClient {
  constructor(serverUrl, clientId) {
    this.serverUrl = serverUrl;
    this.clientId = clientId;
    this.ws = null;
    this._connected = false; // renamed from isConnected to _connected
    this.messageQueue = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;

    // Event handlers (to be set by user)
    this.onConnect = null;
    this.onDisconnect = null;
    this.onError = null;
    this.onTrainingStart = null;
    this.onTrainingComplete = null;
    this.onWeightsReceived = null;
    this.onWeightsUpdate = null;  // Callback for when server sends weights to apply
    this.onEvaluateRequest = null;  // Callback for when server requests evaluation
  }

  async connect() {
    try {
      // Don't reconnect if already connected
      if (this._connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log('Already connected, skipping connection attempt');
        return true;
      }

      // Ensure URL has proper WebSocket protocol
      const wsUrl =
        this.serverUrl.startsWith('ws://') ||
        this.serverUrl.startsWith('wss://')
          ? this.serverUrl
          : `ws://${this.serverUrl}`;

      console.log(`Connecting to server: ${wsUrl}`);
      if (this.ws) {
        this.ws.close();
      }
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this._connected = true;
        this.reconnectAttempts = 0;

        // Register with server
        this.send('register', { client_id: this.clientId });

        if (this.onConnect) {
          this.onConnect();
        }

        this.processMessageQueue();
      };

      this.ws.onclose = () => {
        console.log('WebSocket closed');
        this._connected = false;

        if (this.onDisconnect) {
          this.onDisconnect();
        }

        this.attemptReconnect();
      };

      this.ws.onerror = error => {
        console.error('WebSocket error:', error);
        this._connected = false;

        if (this.onError) {
          this.onError(error);
        }
      };

      this.ws.onmessage = event => {
        this.handleMessage(JSON.parse(event.data));
      };

      return new Promise((resolve, reject) => {
        // Set a timeout to avoid hanging
        const timeout = setTimeout(() => {
          clearInterval(checkConnection);
          reject(new Error('Connection timeout'));
        }, 5000);

        const checkConnection = setInterval(() => {
          if (this._connected) {
            clearTimeout(timeout);
            clearInterval(checkConnection);
            resolve(true);
          }
        }, 100);
      });
    } catch (error) {
      console.error('Failed to connect:', error);
      this._connected = false;
      if (this.onError) {
        this.onError(error);
      }
      return false;
    }
  }

  async send(type, payload) {
    const message = { type, ...payload };

    if (!this._connected) {
      console.log('Not connected, queueing message:', message);
      this.messageQueue.push(message);
      return;
    }

    try {
      // Log only message type and keys, not full payload with weights
      const payloadKeys = Object.keys(payload);
      let logMsg = `WS send -> ${type}, keys: [${payloadKeys.join(', ')}]`;
      
      // Log weight array length if weights exist
      if (payload.weights && Array.isArray(payload.weights)) {
        logMsg += `, weights: ${payload.weights.length} layers`;
      }
      
      // Log num_samples if it exists
      if (payload.num_samples !== undefined) {
        logMsg += `, samples: ${payload.num_samples}`;
      }
      
      console.log(logMsg);
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send message:', error);
      this.messageQueue.push(message);
      throw error;
    }
  }

  async processMessageQueue() {
    while (this.messageQueue.length > 0 && this._connected) {
      const message = this.messageQueue.shift();
      try {
        await this.send(message.type, message);
      } catch (error) {
        console.error('Failed to process queued message:', error);
        this.messageQueue.unshift(message);
        break;
      }
    }
  }

  async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`,
    );

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('Reconnection failed:', error);
      }
    }, Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000));
  }

  handleMessage(message) {
    const { type } = message;
    // Log only message type and keys, not full message with weights
    const msgKeys = Object.keys(message);
    let logMsg = `WS recv <- ${type}, keys: [${msgKeys.join(', ')}]`;
    
    if (message.weights && Array.isArray(message.weights)) {
      logMsg += `, weights: ${message.weights.length} layers`;
    }
    
    console.log(logMsg);

    switch (type) {
      case 'register_ack':
        console.log('Registration acknowledged');
        break;

      case 'start_training':
        // Server instructs mobile to begin training for a round
        // May include weights from server to apply before training
        if (message.weights && message.weights.length > 0) {
          console.log(`[WS] Received weights from server: ${message.weights.length} layers`);
          if (this.onWeightsUpdate) {
            this.onWeightsUpdate(message.weights);
          }
        }
        if (this.onTrainingStart) {
          this.onTrainingStart(message.round, message.config);
        }
        break;

      case 'training_started':
        if (this.onTrainingStart) {
          this.onTrainingStart(message.round);
        }
        break;

      case 'progress_acknowledged':
        // Progress ACK from server; no action needed for now
        break;

      case 'training_acknowledged':
        if (this.onTrainingComplete) {
          this.onTrainingComplete();
        }
        break;

      case 'weights_received':
        if (this.onWeightsReceived) {
          this.onWeightsReceived(message.status === 'success');
        }
        break;

      case 'evaluate_request':
        // Server requests evaluation on current model
        console.log('[WS] Received evaluation request from server');
        if (this.onEvaluateRequest) {
          this.onEvaluateRequest(message.parameters, message.config);
        }
        break;

      default:
        console.warn('Unknown message type:', type);
    }
  }

  async startTraining(round) {
    await this.send('start_training', { round });
  }

  async updateTrainingProgress(progress) {
    await this.send('training_update', { progress });
  }

  async sendWeights(weights) {
    await this.send('update_weights', { weights });
  }

  async completeTraining(data) {
    // data should contain: { weights, num_samples, metrics }
    await this.send('training_complete', {
      weights: data.weights || [],
      num_samples: data.num_samples || 0,
      metrics: data.metrics || {},
    });
  }

  async completeEvaluation(data) {
    // data should contain: { loss, accuracy, num_examples, metrics }
    await this.send('evaluate_complete', {
      loss: data.loss || 0.0,
      accuracy: data.accuracy || 0.0,
      num_examples: data.num_examples || 0,
      metrics: data.metrics || {},
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }

  isConnected() {
    return this._connected;
  }
}

export default WebSocketClient;
