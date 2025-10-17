# Model Library & Inference Features

## Overview
The FedMob mobile app now includes a Model Library and Inference system for testing trained models locally.

## New Features

### 1. Model Library Tab 📚
- **View Saved Models**: See all trained models with metrics and training history
- **Model Details**: Display accuracy, loss, training rounds, and timestamps
- **Delete Models**: Remove models you no longer need
- **Storage Info**: See total models and storage usage

### 2. Inference Tab 🔍
- **Test Models**: Load any saved model for testing
- **MNIST Test Images**: Test with pre-generated MNIST-like data
- **Real-time Predictions**: See predicted vs actual labels
- **Confidence Scores**: Visualize prediction confidence for all classes
- **Image Navigation**: Cycle through different test images

### 3. Enhanced Training Tab 🤖
- **Auto-save**: Models are automatically saved after training completion
- **Manual Save**: Save models manually with custom names
- **Training History**: Track metrics across multiple rounds

## How to Use

### Training a Model
1. Go to the **Training** tab
2. Connect to your FedMob server
3. Start federated learning
4. Model is automatically saved when training completes

### Viewing Saved Models
1. Go to the **Library** tab
2. See all your trained models
3. View training metrics and history
4. Delete models you don't need

### Testing Models
1. Go to the **Library** tab
2. Select a model and tap "Test Model"
3. Go to the **Inference** tab
4. Run inference on test images
5. Compare predictions with ground truth

## Technical Details

### Model Storage
- Models are stored locally using AsyncStorage
- Storage format: `{ id, name, weights, metrics, timestamp }`
- Weights stored as flat arrays for efficient transfer
- Training history preserved for each model

### Inference Process
1. Load model weights from storage
2. Create TensorFlow.js model with same architecture
3. Set weights using ModelManager
4. Preprocess test images
5. Run prediction and display results

### Navigation
- Bottom tab navigation with 3 screens
- Simple text-based icons
- Clean, intuitive interface

## File Structure
```
src/
  screens/
    TrainingScreen.jsx       # Refactored from App.jsx
    ModelLibraryScreen.jsx    # Model library interface
    InferenceScreen.jsx      # Model testing interface
  services/
    ModelStorageService.js   # Model storage management
  navigation/
    AppNavigator.jsx         # Tab navigation setup
```

## Dependencies
- `@react-native-async-storage/async-storage` (already installed)
- `@react-navigation/bottom-tabs` (already installed)
- `@tensorflow/tfjs` (already installed)

## Notes
- All inference runs locally on the device
- No backend required for model testing
- Models are stored client-side only
- Simple UI focused on functionality over aesthetics
