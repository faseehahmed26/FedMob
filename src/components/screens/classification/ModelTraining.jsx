import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useModelContext } from "../../../contexts/ModelContext";
import { useModelTraining } from "../../../hooks/useModelTraining";
import Button from "../../common/Button";
import LoadingSpinner from "../../common/LoadingSpinner";

const ModelTraining = () => {
  const navigation = useNavigation();
  const { selectedModel, isTraining, trainingProgress } = useModelContext();
  const { trainModel } = useModelTraining();
  const [modelName, setModelName] = useState("");
  const [epochs, setEpochs] = useState("10");
  const [batchSize, setBatchSize] = useState("32");
  const [learningRate, setLearningRate] = useState("0.001");
  const [validationSplit, setValidationSplit] = useState("0.2");

  useEffect(() => {
    if (!selectedModel) {
      Alert.alert("Error", "No model selected", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    }
  }, [selectedModel]);

  const validateInputs = () => {
    if (!modelName.trim()) {
      Alert.alert("Error", "Please enter a model name");
      return false;
    }

    const numEpochs = parseInt(epochs);
    if (isNaN(numEpochs) || numEpochs < 1) {
      Alert.alert("Error", "Please enter a valid number of epochs");
      return false;
    }

    const numBatchSize = parseInt(batchSize);
    if (isNaN(numBatchSize) || numBatchSize < 1) {
      Alert.alert("Error", "Please enter a valid batch size");
      return false;
    }

    const lr = parseFloat(learningRate);
    if (isNaN(lr) || lr <= 0 || lr >= 1) {
      Alert.alert(
        "Error",
        "Please enter a valid learning rate between 0 and 1"
      );
      return false;
    }

    const valSplit = parseFloat(validationSplit);
    if (isNaN(valSplit) || valSplit < 0 || valSplit >= 1) {
      Alert.alert(
        "Error",
        "Please enter a valid validation split between 0 and 1"
      );
      return false;
    }

    return true;
  };
  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack(); // This is the correct method for going back.
    } else {
      console.warn("Cannot go back, no previous screen.");
    }
  };
  const handleStartTraining = async () => {
    if (!validateInputs()) return;

    try {
      await trainModel({
        modelName,
        epochs: parseInt(epochs),
        batchSize: parseInt(batchSize),
        learningRate: parseFloat(learningRate),
        validationSplit: parseFloat(validationSplit),
      });

      Alert.alert(
        "Training Complete",
        "Your model has been trained and saved successfully!",
        [
          {
            text: "Test Model",
            onPress: () => navigation.navigate("ModelTesting"),
          },
          { text: "OK", style: "cancel" },
        ]
      );
    } catch (error) {
      Alert.alert("Error", `Training failed: ${error.message}`);
    }
  };

  if (isTraining) {
    return (
      <View style={styles.container}>
        <LoadingSpinner
          message={`Training in progress: ${trainingProgress?.progress || 0}%`}
        />
        <Text style={styles.progressText}>
          Epoch: {trainingProgress?.epoch || 0}/{epochs}
        </Text>
        <Text style={styles.progressText}>
          Loss: {trainingProgress?.loss?.toFixed(4) || "N/A"}
        </Text>
        <Text style={styles.progressText}>
          Accuracy: {trainingProgress?.accuracy?.toFixed(4) || "N/A"}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Training Configuration</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Model Name:</Text>
        <TextInput
          style={styles.input}
          value={modelName}
          onChangeText={setModelName}
          placeholder="Enter model name"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Number of Epochs:</Text>
        <TextInput
          style={styles.input}
          value={epochs}
          onChangeText={setEpochs}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Batch Size:</Text>
        <TextInput
          style={styles.input}
          value={batchSize}
          onChangeText={setBatchSize}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Learning Rate:</Text>
        <TextInput
          style={styles.input}
          value={learningRate}
          onChangeText={setLearningRate}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Validation Split:</Text>
        <TextInput
          style={styles.input}
          value={validationSplit}
          onChangeText={setValidationSplit}
          keyboardType="numeric"
        />
      </View>

      {/* <View style={styles.buttonContainer}>
        <Button
          title="Back"
          variant="outline"
          onPress={() => navigation.goBack()}
          style={styles.button}
        />
        <Button
          title="Start Training"
          variant="primary"
          onPress={handleStartTraining}
          style={styles.button}
        />
      </View> */}
      <View style={styles.buttonContainer}>
        <Button
          title="Back"
          variant="outline"
          onPress={handleBack}
          style={styles.button}
        />
        <Button
          title="Start Training"
          variant="primary"
          onPress={handleStartTraining}
          style={styles.button}
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
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: "#495057",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#CED4DA",
    fontSize: 16,
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
  progressText: {
    fontSize: 16,
    color: "#495057",
    textAlign: "center",
    marginTop: 8,
  },
});

export default ModelTraining;
