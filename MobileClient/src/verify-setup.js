/**
 * Verify FedMob Setup
 * Simple verification that all components are working
 */

// Mock React Native environment for testing
global.require = require;
global.__dirname = __dirname;

// Mock React Native modules
const mockRN = {
  Platform: { OS: 'ios' },
  NativeModules: {},
  DeviceEventEmitter: { addListener: () => {}, removeListener: () => {} },
};

global.ReactNative = mockRN;
global.Platform = mockRN.Platform;

console.log('🔍 Verifying FedMob Setup...\n');

// Test 1: Check if modules can be imported
console.log('='.repeat(50));
console.log('TEST 1: Module Imports');
console.log('='.repeat(50));

try {
  // Test TensorFlow.js import
  console.log('Testing TensorFlow.js import...');
  const tf = require('@tensorflow/tfjs');
  console.log('✅ TensorFlow.js imported successfully');
  console.log(`   Version: ${tf.version.tfjs}`);

  // Test TensorFlow.js React Native import
  console.log('Testing TensorFlow.js React Native import...');
  try {
    require('@tensorflow/tfjs-react-native');
    console.log('✅ TensorFlow.js React Native imported successfully');
  } catch (error) {
    console.log(
      '⚠️  TensorFlow.js React Native import failed (expected in Node.js environment)',
    );
    console.log('   This is normal when testing outside React Native');
  }

  // Test other dependencies
  console.log('Testing other dependencies...');
  require('base-64');
  require('buffer');
  console.log('✅ Base dependencies imported successfully');
} catch (error) {
  console.error('❌ Module import failed:', error.message);
  process.exit(1);
}

// Test 2: Check if our modules can be imported
console.log('\n' + '='.repeat(50));
console.log('TEST 2: FedMob Module Imports');
console.log('='.repeat(50));

try {
  // Test our custom modules
  console.log('Testing TensorFlowManager import...');
  const TensorFlowManager = require('./utils/tensorflow').default;
  console.log('✅ TensorFlowManager imported successfully');

  console.log('Testing ModelManager import...');
  const ModelManager = require('./federated/ModelManager').default;
  console.log('✅ ModelManager imported successfully');

  console.log('Testing DatasetLoader import...');
  const DatasetLoader = require('./federated/DatasetLoader').default;
  console.log('✅ DatasetLoader imported successfully');

  console.log('Testing TrainingEngine import...');
  const TrainingEngine = require('./federated/TrainingEngine').default;
  console.log('✅ TrainingEngine imported successfully');

  console.log('Testing FlowerClient import...');
  const FedMobFlowerClient = require('./federated/FlowerClient').default;
  console.log('✅ FlowerClient imported successfully');
} catch (error) {
  console.error('❌ FedMob module import failed:', error.message);
  process.exit(1);
}

// Test 3: Check if classes can be instantiated
console.log('\n' + '='.repeat(50));
console.log('TEST 3: Class Instantiation');
console.log('='.repeat(50));

try {
  console.log('Testing TensorFlowManager instantiation...');
  const TensorFlowManager = require('./utils/tensorflow').default;
  const tfManager = new TensorFlowManager();
  console.log('✅ TensorFlowManager instantiated successfully');

  console.log('Testing ModelManager instantiation...');
  const ModelManager = require('./federated/ModelManager').default;
  const modelManager = new ModelManager();
  console.log('✅ ModelManager instantiated successfully');

  console.log('Testing DatasetLoader instantiation...');
  const DatasetLoader = require('./federated/DatasetLoader').default;
  const datasetLoader = new DatasetLoader();
  console.log('✅ DatasetLoader instantiated successfully');

  console.log('Testing TrainingEngine instantiation...');
  const TrainingEngine = require('./federated/TrainingEngine').default;
  const trainingEngine = new TrainingEngine();
  console.log('✅ TrainingEngine instantiated successfully');

  console.log('Testing FlowerClient instantiation...');
  const FedMobFlowerClient = require('./federated/FlowerClient').default;
  const flowerClient = new FedMobFlowerClient('localhost:8080', 'test_client');
  console.log('✅ FlowerClient instantiated successfully');
} catch (error) {
  console.error('❌ Class instantiation failed:', error.message);
  process.exit(1);
}

// Test 4: Check basic functionality
console.log('\n' + '='.repeat(50));
console.log('TEST 4: Basic Functionality');
console.log('='.repeat(50));

try {
  console.log('Testing TensorFlow.js readiness...');
  const tf = require('@tensorflow/tfjs');

  // Test basic tensor operations
  const tensor = tf.tensor2d([
    [1, 2],
    [3, 4],
  ]);
  const result = tensor.mul(2);
  const data = result.dataSync();
  tensor.dispose();
  result.dispose();

  console.log('✅ TensorFlow.js basic operations working');
  console.log(`   Test result: [${data.join(', ')}]`);

  console.log('Testing FlowerClient status...');
  const FedMobFlowerClient = require('./federated/FlowerClient').default;
  const client = new FedMobFlowerClient('localhost:8080', 'test_client');
  const status = client.getStatus();
  console.log('✅ FlowerClient status retrieved');
  console.log(`   Client ID: ${status.clientId}`);
  console.log(`   Server Address: ${status.serverAddress}`);
} catch (error) {
  console.error('❌ Basic functionality test failed:', error.message);
  process.exit(1);
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('VERIFICATION SUMMARY');
console.log('='.repeat(50));
console.log('✅ All module imports successful');
console.log('✅ All class instantiations successful');
console.log('✅ Basic functionality tests passed');
console.log('\n🎉 FedMob setup verification completed successfully!');
console.log('\nNext steps:');
console.log(
  '1. Start the Flower server: cd ../flower-server && python server.py',
);
console.log('2. Run the mobile client: npm start');
console.log('3. Test federated learning connection');
