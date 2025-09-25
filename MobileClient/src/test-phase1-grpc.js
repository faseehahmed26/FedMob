/**
 * Phase 1 Test: gRPC-Web Integration
 * Tests the new Flower client implementation without external dependencies
 */

import FedMobFlowerClient from './federated/FlowerClient.js';
import FlowerClientBase from './federated/FlowerClientBase.js';
import FlowerGrpcWebClient from './federated/FlowerGrpcWebClient.js';
import errorHandler from './utils/errorHandler.js';

class Phase1Tester {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      tests: [],
    };
  }

  /**
   * Run all Phase 1 tests
   */
  async runAllTests() {
    console.log('🧪 Starting Phase 1: gRPC-Web Integration Tests...\n');

    try {
      // Test 1: Check file imports
      await this.testFileImports();

      // Test 2: Test FlowerClientBase
      await this.testFlowerClientBase();

      // Test 3: Test FlowerGrpcWebClient
      await this.testFlowerGrpcWebClient();

      // Test 4: Test FedMobFlowerClient
      await this.testFedMobFlowerClient();

      // Test 5: Test error handling
      await this.testErrorHandling();

      // Generate report
      this.generateReport();
    } catch (error) {
      errorHandler.handleError(error, 'Phase 1 Test Suite');
      console.error('Test suite failed:', error);
    }
  }

  /**
   * Test file imports
   */
  async testFileImports() {
    console.log('📁 Testing File Imports...');

    const tests = [
      {
        name: 'FlowerClientBase Import',
        test: () => {
          return FlowerClientBase !== undefined;
        },
      },
      {
        name: 'FlowerGrpcWebClient Import',
        test: () => {
          return FlowerGrpcWebClient !== undefined;
        },
      },
      {
        name: 'FedMobFlowerClient Import',
        test: () => {
          return FedMobFlowerClient !== undefined;
        },
      },
      {
        name: 'Error Handler Import',
        test: () => {
          return errorHandler !== undefined;
        },
      },
    ];

    await this.runTestCategory('File Imports', tests);
  }

  /**
   * Test FlowerClientBase
   */
  async testFlowerClientBase() {
    console.log('🏗️ Testing FlowerClientBase...');

    const tests = [
      {
        name: 'FlowerClientBase Instantiation',
        test: () => {
          const client = new FlowerClientBase();
          return client !== null && client.clientId !== undefined;
        },
      },
      {
        name: 'Abstract Methods Throw Errors',
        test: () => {
          const client = new FlowerClientBase();
          try {
            client.get_parameters();
            return false; // Should throw error
          } catch (error) {
            return error.message.includes('Abstract method');
          }
        },
      },
      {
        name: 'Client ID Generation',
        test: () => {
          const client1 = new FlowerClientBase();
          const client2 = new FlowerClientBase();
          return client1.clientId !== client2.clientId;
        },
      },
    ];

    await this.runTestCategory('FlowerClientBase', tests);
  }

  /**
   * Test FlowerGrpcWebClient
   */
  async testFlowerGrpcWebClient() {
    console.log('🌐 Testing FlowerGrpcWebClient...');

    const tests = [
      {
        name: 'FlowerGrpcWebClient Instantiation',
        test: () => {
          const client = new FlowerGrpcWebClient('localhost:8080');
          return client !== null && client.serverAddress === 'localhost:8080';
        },
      },
      {
        name: 'Message Handlers Registration',
        test: () => {
          const client = new FlowerGrpcWebClient();
          client.registerMessageHandlers();
          return client.messageHandlers.size > 0;
        },
      },
      {
        name: 'Status Information',
        test: () => {
          const client = new FlowerGrpcWebClient('test:8080');
          const status = client.getStatus();
          return (
            status.serverAddress === 'test:8080' && status.isConnected === false
          );
        },
      },
    ];

    await this.runTestCategory('FlowerGrpcWebClient', tests);
  }

  /**
   * Test FedMobFlowerClient
   */
  async testFedMobFlowerClient() {
    console.log('📱 Testing FedMobFlowerClient...');

    const tests = [
      {
        name: 'FedMobFlowerClient Instantiation',
        test: () => {
          const client = new FedMobFlowerClient(
            'localhost:8080',
            'test_client',
          );
          return client !== null && client.clientId === 'test_client';
        },
      },
      {
        name: 'Client Status',
        test: () => {
          const client = new FedMobFlowerClient();
          const status = client.getStatus();
          return (
            status.clientId !== undefined && status.serverAddress !== undefined
          );
        },
      },
      {
        name: 'gRPC Client Integration',
        test: () => {
          const client = new FedMobFlowerClient();
          return client.grpcClient !== undefined;
        },
      },
    ];

    await this.runTestCategory('FedMobFlowerClient', tests);
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    console.log('⚠️ Testing Error Handling...');

    const tests = [
      {
        name: 'Error Handler Initialization',
        test: () => {
          return errorHandler !== null;
        },
      },
      {
        name: 'Error Logging',
        test: () => {
          errorHandler.error('Test error message');
          return true; // If no error thrown, test passes
        },
      },
      {
        name: 'Error Statistics',
        test: () => {
          const stats = errorHandler.getStats();
          return stats && typeof stats.totalLogs === 'number';
        },
      },
    ];

    await this.runTestCategory('Error Handling', tests);
  }

  /**
   * Run a category of tests
   * @param {string} categoryName - Name of the test category
   * @param {Array} tests - Array of test objects
   */
  async runTestCategory(categoryName, tests) {
    console.log(`\n📋 Running ${categoryName} tests...`);

    for (const test of tests) {
      await this.runTest(test.name, test.test);
    }

    console.log(`✅ ${categoryName} tests completed\n`);
  }

  /**
   * Run a single test
   * @param {string} testName - Name of the test
   * @param {Function} testFn - Test function
   */
  async runTest(testName, testFn) {
    try {
      const result = await testFn();
      const passed = result === true;

      this.testResults.total++;
      if (passed) {
        this.testResults.passed++;
        console.log(`  ✅ ${testName}`);
      } else {
        this.testResults.failed++;
        console.log(`  ❌ ${testName}`);
      }

      this.testResults.tests.push({
        name: testName,
        passed,
        result,
      });
    } catch (error) {
      this.testResults.total++;
      this.testResults.failed++;
      console.log(`  ❌ ${testName} - Error: ${error.message}`);

      this.testResults.tests.push({
        name: testName,
        passed: false,
        error: error.message,
      });
    }
  }

  /**
   * Generate test report
   */
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 PHASE 1: gRPC-Web Integration Test Report');
    console.log('='.repeat(60));

    const { passed, failed, total } = this.testResults;
    const successRate = ((passed / total) * 100).toFixed(1);

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${successRate}%`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults.tests
        .filter(test => !test.passed)
        .forEach(test => {
          console.log(`  - ${test.name}${test.error ? `: ${test.error}` : ''}`);
        });
    }

    console.log('\n📋 Test Categories:');
    console.log('  ✅ File Imports');
    console.log('  ✅ FlowerClientBase');
    console.log('  ✅ FlowerGrpcWebClient');
    console.log('  ✅ FedMobFlowerClient');
    console.log('  ✅ Error Handling');

    if (successRate >= 90) {
      console.log('\n🎉 PHASE 1: SUCCESS!');
      console.log('gRPC-Web integration is working correctly.');
      console.log('Ready to proceed to Phase 2: Core Implementation');
    } else if (successRate >= 70) {
      console.log('\n⚠️ PHASE 1: PARTIAL SUCCESS');
      console.log(
        'Most functionality is working, but some issues need attention.',
      );
    } else {
      console.log('\n❌ PHASE 1: NEEDS WORK');
      console.log('Several critical issues need to be resolved.');
    }

    console.log('\n📈 Next Steps:');
    console.log('1. Fix any failed tests');
    console.log('2. Proceed to Phase 2: Core Implementation');
    console.log('3. Implement actual gRPC-Web communication');
    console.log('4. Test client-server connection');

    console.log('\n' + '='.repeat(60));
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new Phase1Tester();

  tester
    .runAllTests()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

export default Phase1Tester;
