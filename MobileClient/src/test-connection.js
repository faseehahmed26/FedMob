/**
 * Test Client-Server Connection for FedMob
 * Simple test to verify Flower client can connect to server
 */

import FedMobFlowerClient from './federated/FlowerClient';

class ConnectionTester {
  constructor() {
    this.client = null;
    this.serverAddress = 'localhost:8080';
  }

  /**
   * Test basic client initialization
   */
  async testClientInitialization() {
    try {
      console.log('Testing client initialization...');
      
      this.client = new FedMobFlowerClient(this.serverAddress, 'test_client');
      
      console.log('Client created successfully');
      console.log('Client status:', this.client.getStatus());
      
      return true;
    } catch (error) {
      console.error('Client initialization failed:', error);
      return false;
    }
  }

  /**
   * Test client connection to server
   */
  async testConnection() {
    try {
      console.log('Testing connection to server...');
      
      if (!this.client) {
        await this.testClientInitialization();
      }
      
      const connected = await this.client.connect();
      
      if (connected) {
        console.log('✅ Successfully connected to server');
        return true;
      } else {
        console.log('❌ Failed to connect to server');
        return false;
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Test model operations
   */
  async testModelOperations() {
    try {
      console.log('Testing model operations...');
      
      if (!this.client || !this.client.isConnected) {
        console.log('Client not connected, skipping model test');
        return false;
      }
      
      // Test getting parameters
      console.log('Testing getParameters...');
      const parameters = await this.client.getParameters();
      console.log(`Retrieved ${parameters.length} parameter layers`);
      
      // Test setting parameters
      console.log('Testing setParameters...');
      await this.client.setParameters(parameters);
      console.log('Parameters set successfully');
      
      // Test fit (training)
      console.log('Testing fit...');
      const fitResults = await this.client.fit(parameters, {
        epochs: 1,
        batch_size: 32,
        learning_rate: 0.01
      });
      console.log('Fit completed:', fitResults.metrics);
      
      // Test evaluate
      console.log('Testing evaluate...');
      const evalResults = await this.client.evaluate(parameters, {
        batch_size: 32
      });
      console.log('Evaluate completed:', evalResults.metrics);
      
      console.log('✅ All model operations completed successfully');
      return true;
    } catch (error) {
      console.error('Model operations test failed:', error);
      return false;
    }
  }

  /**
   * Test federated learning simulation
   */
  async testFederatedLearning() {
    try {
      console.log('Testing federated learning simulation...');
      
      if (!this.client || !this.client.isConnected) {
        console.log('Client not connected, skipping federated learning test');
        return false;
      }
      
      // Run a short federated learning simulation
      await this.client.startFederatedLearning(2); // 2 rounds
      
      console.log('✅ Federated learning simulation completed');
      return true;
    } catch (error) {
      console.error('Federated learning test failed:', error);
      return false;
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting FedMob Connection Tests...\n');
    
    const results = {
      initialization: false,
      connection: false,
      modelOperations: false,
      federatedLearning: false
    };
    
    // Test 1: Client Initialization
    console.log('='.repeat(50));
    console.log('TEST 1: Client Initialization');
    console.log('='.repeat(50));
    results.initialization = await this.testClientInitialization();
    
    // Test 2: Connection
    console.log('\n' + '='.repeat(50));
    console.log('TEST 2: Server Connection');
    console.log('='.repeat(50));
    results.connection = await this.testConnection();
    
    // Test 3: Model Operations
    if (results.connection) {
      console.log('\n' + '='.repeat(50));
      console.log('TEST 3: Model Operations');
      console.log('='.repeat(50));
      results.modelOperations = await this.testModelOperations();
      
      // Test 4: Federated Learning
      console.log('\n' + '='.repeat(50));
      console.log('TEST 4: Federated Learning Simulation');
      console.log('='.repeat(50));
      results.federatedLearning = await this.testFederatedLearning();
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Initialization: ${results.initialization ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Connection: ${results.connection ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Model Operations: ${results.modelOperations ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Federated Learning: ${results.federatedLearning ? '✅ PASS' : '❌ FAIL'}`);
    
    const allPassed = Object.values(results).every(result => result === true);
    console.log(`\nOverall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    return results;
  }

  /**
   * Cleanup
   */
  async cleanup() {
    try {
      if (this.client) {
        await this.client.disconnect();
        console.log('Client disconnected');
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}

// Export for use in other modules
export default ConnectionTester;

// If running directly, run tests
if (typeof window !== 'undefined') {
  const tester = new ConnectionTester();
  tester.runAllTests().then(() => {
    tester.cleanup();
  });
}
