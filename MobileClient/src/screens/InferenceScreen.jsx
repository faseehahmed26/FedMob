// src/screens/InferenceScreen.jsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import * as tf from '@tensorflow/tfjs';
import ModelStorageService from '../services/ModelStorageService';
import ModelManager from '../federated/ModelManager';
import tensorFlowManager from '../utils/tensorflow';

const InferenceScreen = ({ route }) => {
  const [selectedModel, setSelectedModel] = useState(null);
  const [modelManager, setModelManager] = useState(null);
  const [currentImage, setCurrentImage] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  // Real MNIST test data loaded from JSON
  const [testImages, setTestImages] = useState([]);
  const [testImagesLoaded, setTestImagesLoaded] = useState(false);
  const [gridWidth, setGridWidth] = useState(
    Dimensions.get('window').width - 80,
  );

  // Initialize on component mount
  useEffect(() => {
    initializeInference();
  }, []);

  // Load selected model from route params - but only after modelManager is ready
  useEffect(() => {
    if (route.params?.selectedModel && modelManager) {
      setSelectedModel(route.params.selectedModel);
      loadModelForInference(route.params.selectedModel);
    }
  }, [route.params, modelManager]); // Add modelManager as dependency

  // Load first test image when test images are loaded
  useEffect(() => {
    if (testImagesLoaded && testImages.length > 0) {
      loadTestImage(0);
    }
  }, [testImagesLoaded, testImages]);

  // Initialize TensorFlow and model manager
  const initializeInference = async () => {
    try {
      console.log('🔧 Initializing inference...');
      await tensorFlowManager.initialize();
      const manager = new ModelManager();
      await manager.initializeModel();
      setModelManager(manager);
      console.log('✅ Model manager initialized');

      // Load real MNIST test data
      await loadRealMNISTTestData();
    } catch (error) {
      console.error('Failed to initialize inference:', error);
      Alert.alert('Initialization Error', error.message);
    }
  };

  // Load model for inference - with better error handling
  const loadModelForInference = async modelData => {
    try {
      setLoading(true);
      console.log('📥 Loading model for inference:', modelData.name);

      if (!modelManager) {
        throw new Error('Model manager not initialized - please wait');
      }

      // Wait for model to be ready
      if (!modelManager.hasModel()) {
        throw new Error('Model not ready - please wait for initialization');
      }

      // Load full model data from storage
      console.log('📚 Loading model data from storage...');
      const fullModelData = await ModelStorageService.loadModel(modelData.id);
      console.log('📚 Model data loaded:', fullModelData.name);

      // Set model weights
      console.log('⚙️ Setting model weights...');
      await modelManager.setModelWeights(fullModelData.weights);
      console.log('✅ Model weights set successfully');

      setModelLoaded(true);
      Alert.alert('Success', 'Model loaded successfully for inference');
    } catch (error) {
      console.error('Failed to load model:', error);
      Alert.alert('Model Load Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Load a test image
  const loadTestImage = index => {
    if (testImages.length === 0) {
      console.log('No test images loaded yet');
      return;
    }
    const imageData = testImages[index];
    if (!imageData) {
      console.log(`No image at index ${index}`);
      return;
    }
    // Debug: log sample values and range for the selected image
    try {
      const vals = Array.isArray(imageData.data) ? imageData.data : [];
      const sample = vals.slice(0, 12);
      const minVal = vals.length ? Math.min(...vals.map(Number)) : 'n/a';
      const maxVal = vals.length ? Math.max(...vals.map(Number)) : 'n/a';
      console.log('MNIST image debug', {
        index,
        label: imageData.label,
        length: vals.length,
        sample,
        range: [minVal, maxVal],
      });
    } catch (e) {
      console.log('MNIST image debug failed:', e?.message);
    }
    setCurrentImage(imageData);
    setImageIndex(index);
    setPrediction(null);
    setConfidence(null);
  };

  // Run inference on current image
  const runInference = async () => {
    try {
      if (!modelManager || !modelLoaded) {
        Alert.alert(
          'Error',
          'Model not loaded. Please select a model from the Library tab.',
        );
        return;
      }

      if (!currentImage) {
        Alert.alert('Error', 'No test image available');
        return;
      }

      setLoading(true);

      // Preprocess image data
      const imageTensor = tf.tensor4d(currentImage.data, [1, 28, 28, 1]);

      // Run prediction
      const predictions = modelManager.getModel().predict(imageTensor);
      const predictionArray = await predictions.array();

      // Get predicted class and confidence
      const predictionData = predictionArray[0];
      const predictedClass = predictionData.indexOf(
        Math.max(...predictionData),
      );
      const maxConfidence = Math.max(...predictionData);

      setPrediction(predictedClass);
      setConfidence(predictionData);

      // Clean up tensors
      imageTensor.dispose();
      predictions.dispose();
    } catch (error) {
      console.error('Inference failed:', error);
      Alert.alert('Inference Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Load next test image
  const loadNextImage = () => {
    const nextIndex = (imageIndex + 1) % testImages.length;
    loadTestImage(nextIndex);
  };

  // Load previous test image
  const loadPreviousImage = () => {
    const prevIndex = imageIndex === 0 ? testImages.length - 1 : imageIndex - 1;
    loadTestImage(prevIndex);
  };

  // Check if prediction is correct
  const isCorrect = () => {
    return (
      prediction !== null && currentImage && prediction === currentImage.label
    );
  };
  // Replace your renderMNISTGrid with this absolute-positioned version
  const renderMNISTGrid = data => {
    if (!Array.isArray(data) || data.length !== 28 * 28) return null;

    const pixel = Math.max(1, Math.floor(Math.min(gridWidth, 280) / 28)) || 3;
    const imgSize = 28 * pixel;

    return (
      <View
        style={{
          width: imgSize,
          height: imgSize,
          position: 'relative', // critical: no flex/wrap
          backgroundColor: '#fff',
          borderWidth: 1,
          borderColor: '#e0e0e0',
        }}
        onLayout={e => setGridWidth(e.nativeEvent.layout.width)}
      >
        {data.map((v, i) => {
          const val = Math.max(0, Math.min(1, Number(v) || 0));
          const g = Math.round((1 - val) * 255); // black ink on white bg
          const x = i % 28;
          const y = (i / 28) | 0; // integer division
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: x * pixel,
                top: y * pixel,
                width: pixel,
                height: pixel,
                backgroundColor: `rgb(${g},${g},${g})`,
              }}
            />
          );
        })}
      </View>
    );
  };
  // const renderMNISTGrid = data => {
  //   if (!Array.isArray(data) || data.length !== 28 * 28) return null;

  //   const pixel = 8;
  //   const imgSize = 28 * pixel;

  //   return (
  //     <View
  //       style={{
  //         width: imgSize,
  //         height: imgSize,
  //         flexDirection: 'row',
  //         flexWrap: 'wrap',
  //         borderWidth: 1,
  //         borderColor: '#ccc',
  //       }}
  //     >
  //       {data.map((v, i) => {
  //         const val = Math.max(0, Math.min(1, Number(v) || 0));
  //         const gray = Math.round((1 - val) * 255); // your data has ink = 1.0 → invert to black
  //         const color = `rgb(${gray},${gray},${gray})`;
  //         return (
  //           <View
  //             key={i}
  //             style={{ width: pixel, height: pixel, backgroundColor: color }}
  //           />
  //         );
  //       })}
  //     </View>
  //   );
  // };
  const transposeImage = data => {
    // // Debug: Log some sample data to understand the pattern
    // console.log('Sample data values:', data.slice(0, 10));
    // console.log('Data range:', Math.min(...data), 'to', Math.max(...data));

    // // Try different layout patterns to fix the scrambled image issue
    // // Pattern: Try reading in reverse column order (right to left)
    // const fixed = [];
    // for (let y = 0; y < 28; y++) {
    //   for (let x = 0; x < 28; x++) {
    //     // Try reading columns in reverse order (right to left)
    //     const index = y * 28 + (27 - x);
    //     fixed.push(data[index]);
    //   }
    // }
    // return fixed;
    const transposed = [];
    for (let y = 0; y < 28; y++) {
      for (let x = 0; x < 28; x++) {
        transposed.push(data[x * 28 + y]); // swap row & column
      }
    }
    return transposed;
  };

  // // Render a 28x28 grayscale grid from flat [0..1] array
  // const renderMNISTGrid = data => {
  //   if (!Array.isArray(data) || data.length !== 28 * 28) {
  //     return null;
  //   }

  //   const pixel = 6; // size of each square pixel in the grid
  //   const imgSize = 28 * pixel;

  //   return (
  //     <View
  //       style={{
  //         width: imgSize,
  //         height: imgSize,
  //         flexDirection: 'row',
  //         flexWrap: 'wrap',
  //         borderWidth: 1,
  //         borderColor: '#ccc',
  //       }}
  //     >
  //       {data.map((v, i) => {
  //         const val = Math.max(0, Math.min(1, Number(v) || 0));
  //         const g = Math.round((1 - val) * 255); // invert so higher val = darker

  //         const color = `rgb(${g},${g},${g})`;
  //         return (
  //           <View
  //             key={i}
  //             style={{ width: pixel, height: pixel, backgroundColor: color }}
  //           />
  //         );
  //       })}
  //     </View>
  //   );
  // };

  // Get random samples per class for inference
  const getRandomSamplesPerClass = (samples, samplesPerClass) => {
    const selectedSamples = [];

    for (let classLabel = 0; classLabel < 10; classLabel++) {
      // Get all samples for this class
      const classSamples = samples.filter(
        sample => sample.label === classLabel,
      );

      // Shuffle and take the requested number
      const shuffled = classSamples.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(
        0,
        Math.min(samplesPerClass, classSamples.length),
      );

      selectedSamples.push(...selected);
    }

    // Shuffle the final selection to mix classes
    return selectedSamples.sort(() => Math.random() - 0.5);
  };

  // Load real MNIST test data from JSON
  const loadRealMNISTTestData = async () => {
    try {
      console.log('Loading real MNIST test data...');

      const testData = require('../data/mnist_test_20.json');
      console.log('Test data loaded meta:', {
        total: Array.isArray(testData?.samples) ? testData.samples.length : 0,
        firstLabel: testData?.samples?.[0]?.label,
        firstLen: Array.isArray(testData?.samples?.[0]?.data)
          ? testData.samples[0].data.length
          : 0,
      });
      console.log(`Loaded ${testData.samples.length} real MNIST test samples`);

      // Randomly select samples for inference (2 per class)
      const inferenceSamples = getRandomSamplesPerClass(testData.samples, 2);
      console.log(
        `Selected ${inferenceSamples.length} samples for inference (2 per class)`,
      );

      // Convert to the format expected by the UI
      const formattedTestImages = inferenceSamples.map(sample => ({
        // Coerce to numbers in case JSON parser delivered strings
        data: Array.isArray(sample.data) ? sample.data.map(v => Number(v)) : [],
        label: sample.label,
      }));

      setTestImages(formattedTestImages);
      setTestImagesLoaded(true);
      console.log('Real MNIST test data loaded successfully');
    } catch (error) {
      console.error('Failed to load real MNIST test data:', error);
      // Fallback to empty array - UI will show instructions
      setTestImages([]);
      setTestImagesLoaded(true); // Still set to true to prevent infinite loading
    }
  };

  // Generate confidence bars for visualization
  const renderConfidenceBars = () => {
    if (!confidence) return null;

    return (
      <View style={styles.confidenceContainer}>
        <Text style={styles.confidenceTitle}>Confidence Scores:</Text>
        {confidence.map((score, index) => (
          <View key={index} style={styles.confidenceBar}>
            <Text style={styles.confidenceLabel}>{index}:</Text>
            <View style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  {
                    width: `${score * 100}%`,
                    backgroundColor:
                      index === prediction ? '#28a745' : '#6c757d',
                  },
                ]}
              />
            </View>
            <Text style={styles.confidenceValue}>
              {(score * 100).toFixed(1)}%
            </Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Model Inference</Text>
          {selectedModel && (
            <Text style={styles.subtitle}>Testing: {selectedModel.name}</Text>
          )}
        </View>

        {/* Model Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Model Status</Text>
          <View style={styles.statusContainer}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Model Loaded:</Text>
              <Text
                style={[
                  styles.statusValue,
                  { color: modelLoaded ? '#28a745' : '#dc3545' },
                ]}
              >
                {modelLoaded ? 'Yes' : 'No'}
              </Text>
            </View>
            {selectedModel && (
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Model Name:</Text>
                <Text style={styles.statusValue}>{selectedModel.name}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Test Image */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🖼️ Test Image</Text>
          {!testImagesLoaded ? (
            <View style={styles.imageContainer}>
              <Text style={styles.imageText}>Loading test images...</Text>
            </View>
          ) : testImages.length === 0 ? (
            <View style={styles.imageContainer}>
              <Text style={styles.imageText}>No test images available</Text>
            </View>
          ) : currentImage ? (
            <View style={styles.imageContainer}>
              <Text style={styles.imageLabel}>
                Ground Truth: {currentImage.label}
              </Text>
              <View style={styles.imagePlaceholder}>
                {renderMNISTGrid(currentImage.data)}
              </View>
            </View>
          ) : (
            <View style={styles.imageContainer}>
              <Text style={styles.imageText}>No image selected</Text>
            </View>
          )}
        </View>

        {/* Inference Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Inference</Text>

          <TouchableOpacity
            style={[
              styles.inferenceButton,
              (!modelLoaded || loading) && styles.disabledButton,
            ]}
            onPress={runInference}
            disabled={!modelLoaded || loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Run Inference</Text>
            )}
          </TouchableOpacity>

          {/* Image Navigation */}
          <View style={styles.navigationContainer}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={loadPreviousImage}
            >
              <Text style={styles.navButtonText}>← Previous</Text>
            </TouchableOpacity>

            <Text style={styles.imageCounter}>
              {imageIndex + 1} / {testImages.length}
            </Text>

            <TouchableOpacity style={styles.navButton} onPress={loadNextImage}>
              <Text style={styles.navButtonText}>Next →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Results */}
        {prediction !== null && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📈 Results</Text>

            <View style={styles.resultsContainer}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Predicted:</Text>
                <Text
                  style={[
                    styles.resultValue,
                    { color: isCorrect() ? '#28a745' : '#dc3545' },
                  ]}
                >
                  {prediction}
                </Text>
              </View>

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Ground Truth:</Text>
                <Text style={styles.resultValue}>{currentImage.label}</Text>
              </View>

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Correct:</Text>
                <Text
                  style={[
                    styles.resultValue,
                    { color: isCorrect() ? '#28a745' : '#dc3545' },
                  ]}
                >
                  {isCorrect() ? '✅ Yes' : '❌ No'}
                </Text>
              </View>
            </View>

            {/* Confidence Visualization */}
            {renderConfidenceBars()}
          </View>
        )}

        {/* Instructions */}
        {!selectedModel && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ℹ️ Instructions</Text>
            <Text style={styles.instructionText}>
              1. Go to the Library tab{'\n'}
              2. Select a trained model{'\n'}
              3. Tap "Test Model" to load it here{'\n'}
              4. Run inference on test images
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  statusContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34495e',
  },
  statusValue: {
    fontSize: 14,
    color: '#2c3e50',
  },
  imageContainer: {
    alignItems: 'center',
  },
  imageLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  imagePlaceholder: {
    // Let content (rendered MNIST grid) dictate size to avoid cropping
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#dee2e6',
  },
  imageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6c757d',
  },
  imageSubtext: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  inferenceButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  disabledButton: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  navButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  imageCounter: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '600',
  },
  resultsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34495e',
  },
  resultValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: 'bold',
  },
  confidenceContainer: {
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 15,
  },
  confidenceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 10,
  },
  confidenceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  confidenceLabel: {
    fontSize: 12,
    color: '#155724',
    width: 20,
  },
  barContainer: {
    flex: 1,
    height: 20,
    backgroundColor: '#dee2e6',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
  confidenceValue: {
    fontSize: 12,
    color: '#155724',
    width: 40,
    textAlign: 'right',
  },
  instructionText: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
  },
});

export default InferenceScreen;
