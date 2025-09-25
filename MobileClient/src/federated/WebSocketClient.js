// src/federated/WebSocketClient.js

class WebSocketClient {
    constructor(serverUrl) {
      this.serverUrl = serverUrl;
      this.ws = null;
      this.isConnected = false;
      this.messageQueue = [];
      this.handlers = new Map();
      this.reconnectAttempts = 0;
      this.maxReconnectAttempts = 5;
    }
  
    async connect() {
      try {
        console.log(`Connecting to server: ${this.serverUrl}`);
        
        this.ws = new WebSocket(this.serverUrl);
        
        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.processMessageQueue();
        };
  
        this.ws.onclose = () => {
          console.log('WebSocket closed');
          this.isConnected = false;
          this.attemptReconnect();
        };
  
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnected = false;
        };
  
        this.ws.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data));
        };
  
        return new Promise((resolve) => {
          const checkConnection = setInterval(() => {
            if (this.isConnected) {
              clearInterval(checkConnection);
              resolve(true);
            }
          }, 100);
        });
      } catch (error) {
        console.error('Failed to connect:', error);
        return false;
      }
    }
  
    async send(type, payload) {
      const message = { type, payload };
      
      if (!this.isConnected) {
        console.log('Not connected, queueing message:', message);
        this.messageQueue.push(message);
        return;
      }
  
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send message:', error);
        this.messageQueue.push(message);
      }
    }
  
    private async processMessageQueue() {
      while (this.messageQueue.length > 0 && this.isConnected) {
        const message = this.messageQueue.shift();
        await this.send(message.type, message.payload);
      }
    }
  
    private attemptReconnect() {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        return;
      }
  
      this.reconnectAttempts++;
      console.log(`Reconnection attempt ${this.reconnectAttempts}`);
      
      setTimeout(() => {
        this.connect();
      }, Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000));
    }
  
    registerHandler(type, handler) {
      this.handlers.set(type, handler);
    }
  
    private handleMessage(message) {
      const handler = this.handlers.get(message.type);
      if (handler) {
        handler(message.payload);
      } else {
        console.warn('No handler for message type:', message.type);
      }
    }
  
    disconnect() {
      if (this.ws) {
        this.ws.close();
      }
      this.isConnected = false;
    }
  
    getStatus() {
      return {
        isConnected: this.isConnected,
        serverUrl: this.serverUrl,
        queuedMessages: this.messageQueue.length,
        reconnectAttempts: this.reconnectAttempts
      };
    }
  }
  
  export default WebSocketClient;