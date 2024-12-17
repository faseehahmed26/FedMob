import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

import { useModelContext } from "../../../contexts/ModelContext";
import { useImageProcessing } from "../../../hooks/useImageProcessing";
import Button from "../../common/Button";
import LoadingSpinner from "../../common/LoadingSpinner";
import SavedModelsSlider from "../home/SavedModelSlider";

const ModelTesting = ({ navigation }) => {
  const { selectedModel } = useModelContext();
  const { preprocessImage } = useImageProcessing();

  const [testImage, setTestImage] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const selectImage = async () => {
    try {
      // const result = await launchImageLibrary({
      //   mediaType: "photo",
      //   quality: 1,
      // });
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
      });
      // if (result.assets && result.assets[0]) {
      //   setTestImage(result.assets[0]);
      //   await processImage(result.assets[0].uri);
      // }
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // const newImages = result.assets.map((asset) => ({
        //   id: asset.uri,
        //   uri: asset.uri,
        // }));
        setTestImage(result.assets[0]);
        await processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error selecting image:", error);
      Alert.alert("Error", "Failed to select image");
    }
  };

  const processImage = async (imageUri) => {
    try {
      setIsProcessing(true);
      setPrediction(null);

      // Preprocess the image
      const processedImage = await preprocessImage(imageUri);

      // Load and run model prediction
      const model = await selectedModel.model;
      const predictions = await model.predict(processedImage).data();

      // Get class probabilities
      const probabilities = Array.from(predictions);
      const maxProbIndex = probabilities.indexOf(Math.max(...probabilities));

      setPrediction({
        class: maxProbIndex,
        confidence: probabilities[maxProbIndex],
        probabilities: probabilities
          .map((prob, index) => ({
            class: index,
            probability: prob,
          }))
          .sort((a, b) => b.probability - a.probability),
      });
    } catch (error) {
      console.error("Error processing image:", error);
      Alert.alert("Error", "Failed to process image");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <SavedModelsSlider />

      <Text style={styles.title}>Test Your Model</Text>

      <View style={styles.imageSection}>
        <Button
          title="Select Image"
          onPress={selectImage}
          disabled={isProcessing}
          style={styles.selectButton}
        />

        {testImage && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: testImage.uri }}
              style={styles.image}
              resizeMode="contain"
            />
          </View>
        )}
      </View>

      {isProcessing && <LoadingSpinner message="Processing image..." />}

      {prediction && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Prediction Results:</Text>

          <View style={styles.mainPrediction}>
            <Text style={styles.predictionText}>
              Predicted Class: {prediction.class}
            </Text>
            <Text style={styles.predictionText}>
              Confidence: {(prediction.confidence * 100).toFixed(2)}%
            </Text>
          </View>

          <Text style={styles.subtitle}>All Class Probabilities:</Text>
          {prediction.probabilities.map((pred, index) => (
            <View key={index} style={styles.probabilityItem}>
              <View style={styles.probabilityBar}>
                <View
                  style={[
                    styles.probabilityFill,
                    { width: `${pred.probability * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.probabilityText}>
                Class {pred.class}: {(pred.probability * 100).toFixed(1)}%
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.buttonContainer}>
        <Button
          title="Back"
          variant="outline"
          onPress={() => navigation.goBack()}
          style={styles.button}
        />
        <Button
          title="Test Another"
          variant="primary"
          onPress={selectImage}
          style={styles.button}
          disabled={isProcessing}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#F8F9FA",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#212529",
  },
  imageSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  selectButton: {
    marginBottom: 16,
  },
  imageContainer: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#E9ECEF",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  resultContainer: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#212529",
  },
  mainPrediction: {
    backgroundColor: "#E9ECEF",
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  predictionText: {
    fontSize: 16,
    color: "#212529",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#495057",
  },
  probabilityItem: {
    marginBottom: 8,
  },
  probabilityBar: {
    height: 20,
    backgroundColor: "#E9ECEF",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  probabilityFill: {
    height: "100%",
    backgroundColor: "#007AFF",
  },
  probabilityText: {
    fontSize: 14,
    color: "#495057",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    paddingBottom: 20,
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
});

export default ModelTesting;
