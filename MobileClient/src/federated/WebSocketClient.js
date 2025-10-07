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
      console.log('WS send →', type, JSON.stringify(payload));
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
    console.log('WS recv ←', type, JSON.stringify(message));

    switch (type) {
      case 'register_ack':
        console.log('Registration acknowledged');
        break;

      case 'start_training':
        // Server instructs mobile to begin training for a round
        if (this.onTrainingStart) {
          this.onTrainingStart(message.round);
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

  async completeTraining(metrics) {
    await this.send('training_complete', { metrics });
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
