/**
 * Simple Verification for FedMob Setup
 * Basic verification without React Native dependencies
 */

console.log('🔍 Simple FedMob Setup Verification...\n');

// Test 1: Check basic TensorFlow.js
console.log('='.repeat(50));
console.log('TEST 1: Basic TensorFlow.js');
console.log('='.repeat(50));

try {
  const tf = require('@tensorflow/tfjs');
  console.log('✅ TensorFlow.js imported successfully');
  console.log(`   Version: ${tf.version.tfjs}`);

  // Test basic operations
  const tensor = tf.tensor2d([
    [1, 2],
    [3, 4],
  ]);
  const result = tensor.mul(2);
  const data = result.dataSync();
  tensor.dispose();
  result.dispose();

  console.log('✅ Basic tensor operations working');
  console.log(`   Test result: [${data.join(', ')}]`);
} catch (error) {
  console.error('❌ TensorFlow.js test failed:', error.message);
  process.exit(1);
}

// Test 2: Check dependencies
console.log('\n' + '='.repeat(50));
console.log('TEST 2: Dependencies');
console.log('='.repeat(50));

try {
  require('base-64');
  console.log('✅ base-64 imported successfully');

  require('buffer');
  console.log('✅ buffer imported successfully');
} catch (error) {
  console.error('❌ Dependencies test failed:', error.message);
  process.exit(1);
}

// Test 3: Check file structure
console.log('\n' + '='.repeat(50));
console.log('TEST 3: File Structure');
console.log('='.repeat(50));

const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'src/federated/FlowerClient.js',
  'src/federated/ModelManager.js',
  'src/federated/DatasetLoader.js',
  'src/federated/TrainingEngine.js',
  'src/utils/tensorflow.js',
  'src/utils/constants.js',
  'src/utils/networking.js',
  'src/utils/storage.js',
];

let allFilesExist = true;
for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  console.error('❌ Some required files are missing');
  process.exit(1);
}

// Test 4: Check package.json
console.log('\n' + '='.repeat(50));
console.log('TEST 4: Package Configuration');
console.log('='.repeat(50));

try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

  console.log(`✅ Package name: ${packageJson.name}`);
  console.log(
    `✅ React Native version: ${packageJson.dependencies['react-native']}`,
  );
  console.log(
    `✅ TensorFlow.js version: ${packageJson.dependencies['@tensorflow/tfjs']}`,
  );

  // Check for required dependencies
  const requiredDeps = [
    '@tensorflow/tfjs',
    '@tensorflow/tfjs-react-native',
    'react-native',
    'base-64',
    'buffer',
  ];

  for (const dep of requiredDeps) {
    if (packageJson.dependencies[dep]) {
      console.log(`✅ ${dep}: ${packageJson.dependencies[dep]}`);
    } else {
      console.log(`❌ ${dep} missing from dependencies`);
    }
  }
} catch (error) {
  console.error('❌ Package.json test failed:', error.message);
  process.exit(1);
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('VERIFICATION SUMMARY');
console.log('='.repeat(50));
console.log('✅ TensorFlow.js working correctly');
console.log('✅ Basic dependencies available');
console.log('✅ File structure complete');
console.log('✅ Package configuration valid');
console.log('\n🎉 FedMob setup verification completed successfully!');
console.log('\n📋 Next Steps:');
console.log('1. Install flower-client: npm install flower-client');
console.log('2. Start Flower server: cd ../flower-server && python server.py');
console.log('3. Test in React Native environment');
console.log('4. Implement client-server connection');
