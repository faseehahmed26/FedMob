/**
 * Flower Client Base Class for React Native
 * Based on flower-nodejs-client but adapted for gRPC-Web
 */

class FlowerClientBase {
  static idCounter = 0;

  constructor() {
    this.isConnected = false;
    // Generate unique ID using counter + timestamp + random string
    this.clientId = `mobile_client_${++FlowerClientBase.idCounter}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 6)}`;
    this.currentRound = 0;
  }

  /**
   * Get current model parameters
   * Must be implemented by subclasses
   */
  get_parameters() {
    throw new Error('Abstract method! Must be implemented by subclass.');
  }

  /**
   * Get client properties
   * Must be implemented by subclasses
   */
  get_properties(ins) {
    throw new Error('Abstract method! Must be implemented by subclass.');
  }

  /**
   * Train model on local data
   * Must be implemented by subclasses
   */
  fit(parameters, config) {
    throw new Error('Abstract method! Must be implemented by subclass.');
  }

  /**
   * Evaluate model on local data
   * Must be implemented by subclasses
   */
  evaluate(parameters, config) {
    throw new Error('Abstract method! Must be implemented by subclass.');
  }
}

export default FlowerClientBase;
