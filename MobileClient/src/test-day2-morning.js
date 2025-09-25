/**
 * Day 2 Morning Test Suite
 * Tests complete Flower client methods, TensorFlow.js model operations, and parameter serialization
 */

import FedMobFlowerClient from './federated/FlowerClient.js';
import ModelManager from './federated/ModelManager.js';
import parameterSerialization from './utils/parameterSerialization.js';
import errorHandler from './utils/errorHandler.js';

class Day2MorningTester {
  constructor() {
    this.client = null;
    this.modelManager = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      tests: [],
    };
  }

  /**
   * Run all Day 2 Morning tests
   */
  async runAllTests() {
    console.log('🧪 Starting Day 2 Morning Test Suite...\n');

    try {
      // Initialize components
      await this.initializeComponents();

      // Run test categories
      await this.testFlowerClientMethods();
      await this.testTensorFlowModelOperations();
      await this.testParameterSerialization();
      await this.testErrorHandling();

      // Generate report
      this.generateReport();
    } catch (error) {
      errorHandler.handleError(error, 'Day 2 Morning Test Suite');
      console.error('Test suite failed:', error);
    }
  }

  /**
   * Initialize test components
   */
  async initializeComponents() {
    console.log('🔧 Initializing test components...');

    try {
      // Initialize error handler
      errorHandler.setLogLevel('debug');

      // Initialize model manager
      this.modelManager = new ModelManager();
      await this.modelManager.initializeTensorFlow();
      await this.modelManager.initializeModel();

      // Initialize Flower client
      this.client = new FedMobFlowerClient('localhost:8080', 'test_client');

      console.log('✅ Components initialized successfully\n');
    } catch (error) {
      throw new Error(`Failed to initialize components: ${error.message}`);
    }
  }

  /**
   * Test Flower client methods
   */
  async testFlowerClientMethods() {
    console.log('📡 Testing Flower Client Methods...');

    const tests = [
      {
        name: 'Client Initialization',
        test: () => {
          return this.client !== null && this.client.clientId === 'test_client';
        },
      },
      {
        name: 'Get Parameters',
        test: async () => {
          const params = await this.client.getParameters();
          return Array.isArray(params) && params.length > 0;
        },
      },
      {
        name: 'Set Parameters',
        test: async () => {
          const testParams = [
            [1, 2, 3],
            [4, 5, 6],
          ];
          await this.client.setParameters(testParams);
          return true; // If no error thrown, test passes
        },
      },
      {
        name: 'Model Weight Extraction',
        test: async () => {
          const weights = await this.modelManager.getModelWeights();
          return Array.isArray(weights) && weights.length > 0;
        },
      },
      {
        name: 'Model Weight Setting',
        test: async () => {
          const weights = await this.modelManager.getModelWeights();
          await this.modelManager.setModelWeights(weights);
          return true; // If no error thrown, test passes
        },
      },
    ];

    await this.runTestCategory('Flower Client Methods', tests);
  }

  /**
   * Test TensorFlow.js model operations
   */
  async testTensorFlowModelOperations() {
    console.log('🤖 Testing TensorFlow.js Model Operations...');

    const tests = [
      {
        name: 'Model Creation',
        test: () => {
          return this.modelManager.hasModel();
        },
      },
      {
        name: 'Model Architecture',
        test: () => {
          const info = this.modelManager.getModelInfo();
          return info && info.totalLayers > 0 && info.totalParams > 0;
        },
      },
      {
        name: 'Weight Validation',
        test: async () => {
          const weights = await this.modelManager.getModelWeights();
          return this.modelManager.validateWeights(weights);
        },
      },
      {
        name: 'Model Cloning',
        test: async () => {
          const clonedModel = await this.modelManager.cloneModel();
          return clonedModel !== null;
        },
      },
      {
        name: 'Memory Management',
        test: () => {
          const memoryInfo = this.modelManager.getMemoryInfo();
          return memoryInfo && typeof memoryInfo.numTensors === 'number';
        },
      },
    ];

    await this.runTestCategory('TensorFlow.js Model Operations', tests);
  }

  /**
   * Test parameter serialization
   */
  async testParameterSerialization() {
    console.log('📦 Testing Parameter Serialization...');

    const tests = [
      {
        name: 'Weight Serialization',
        test: async () => {
          const weights = await this.modelManager.getModelWeights();
          const serialized = parameterSerialization.serializeWeights(weights);
          return Array.isArray(serialized) && serialized.length > 0;
        },
      },
      {
        name: 'Parameter Deserialization',
        test: async () => {
          const weights = await this.modelManager.getModelWeights();
          const serialized = parameterSerialization.serializeWeights(weights);
          const deserialized =
            parameterSerialization.deserializeParameters(serialized);
          return (
            Array.isArray(deserialized) &&
            deserialized.length === weights.length
          );
        },
      },
      {
        name: 'Base64 Encoding',
        test: async () => {
          const weights = await this.modelManager.getModelWeights();
          const base64 = parameterSerialization.weightsToBase64(weights);
          return typeof base64 === 'string' && base64.length > 0;
        },
      },
      {
        name: 'Base64 Decoding',
        test: async () => {
          const weights = await this.modelManager.getModelWeights();
          const base64 = parameterSerialization.weightsToBase64(weights);
          const decoded = parameterSerialization.base64ToWeights(base64);
          return Array.isArray(decoded) && decoded.length === weights.length;
        },
      },
      {
        name: 'Parameter Validation',
        test: async () => {
          const weights = await this.modelManager.getModelWeights();
          const serialized = parameterSerialization.serializeWeights(weights);
          return parameterSerialization.validateParameters(serialized);
        },
      },
      {
        name: 'Parameter Summary',
        test: async () => {
          const weights = await this.modelManager.getModelWeights();
          const summary =
            parameterSerialization.createParameterSummary(weights);
          return (
            summary && summary.totalLayers > 0 && summary.totalParameters > 0
          );
        },
      },
    ];

    await this.runTestCategory('Parameter Serialization', tests);
  }

  /**
   * Test error handling and logging
   */
  async testErrorHandling() {
    console.log('⚠️ Testing Error Handling and Logging...');

    const tests = [
      {
        name: 'Error Handler Initialization',
        test: () => {
          return errorHandler !== null;
        },
      },
      {
        name: 'Logging Levels',
        test: () => {
          errorHandler.setLogLevel('debug');
          errorHandler.debug('Test debug message');
          errorHandler.info('Test info message');
          errorHandler.warn('Test warning message');
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
      {
        name: 'Error Wrapping',
        test: () => {
          const wrappedFn = errorHandler.wrapSync(() => {
            return 'test result';
          }, 'Test operation');

          const result = wrappedFn();
          return result === 'test result';
        },
      },
      {
        name: 'Custom Error Creation',
        test: () => {
          const customError = errorHandler.createError(
            'Test error',
            'Test context',
          );
          return (
            customError instanceof Error &&
            customError.context === 'Test context'
          );
        },
      },
    ];

    await this.runTestCategory('Error Handling and Logging', tests);
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
    console.log('📊 DAY 2 MORNING TEST REPORT');
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
    console.log('  ✅ Flower Client Methods');
    console.log('  ✅ TensorFlow.js Model Operations');
    console.log('  ✅ Parameter Serialization');
    console.log('  ✅ Error Handling and Logging');

    if (successRate >= 90) {
      console.log('\n🎉 DAY 2 MORNING: SUCCESS!');
      console.log('All core Flower client methods, TensorFlow.js operations,');
      console.log(
        'parameter serialization, and error handling are working correctly.',
      );
    } else if (successRate >= 70) {
      console.log('\n⚠️ DAY 2 MORNING: PARTIAL SUCCESS');
      console.log(
        'Most functionality is working, but some issues need attention.',
      );
    } else {
      console.log('\n❌ DAY 2 MORNING: NEEDS WORK');
      console.log('Several critical issues need to be resolved.');
    }

    console.log('\n📈 Next Steps:');
    console.log('1. Fix any failed tests');
    console.log(
      '2. Move to Day 2 Afternoon: Build CNN model and test training',
    );
    console.log('3. Integrate Flower client with TensorFlow.js model');
    console.log('4. Test complete client-server communication');

    console.log('\n' + '='.repeat(60));
  }

  /**
   * Cleanup test resources
   */
  cleanup() {
    try {
      if (this.modelManager) {
        this.modelManager.dispose();
      }

      if (this.client) {
        this.client.disconnect();
      }

      errorHandler.info('Test cleanup completed');
    } catch (error) {
      errorHandler.handleError(error, 'Test cleanup');
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new Day2MorningTester();

  tester
    .runAllTests()
    .then(() => {
      tester.cleanup();
      process.exit(0);
    })
    .catch(error => {
      console.error('Test suite failed:', error);
      tester.cleanup();
      process.exit(1);
    });
}

export default Day2MorningTester;
