import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useModelContext } from "../../../contexts/ModelContext";
import Button from "../../common/Button";
import LoadingSpinner from "../../common/LoadingSpinner";

const AVAILABLE_MODELS = [
  {
    id: "basic",
    name: "Basic CNN",
    description:
      "Simple convolutional neural network suitable for basic image classification tasks.",
    requirements: "Minimum 5 images per class recommended",
  },
  {
    id: "resnet50",
    name: "ResNet50",
    description:
      "Deep residual network with transfer learning, suitable for complex image classification.",
    requirements: "Minimum 10 images per class recommended",
  },
];

const ModelSelection = ({ navigation }) => {
  const { setSelectedModel, imagesByClass } = useModelContext();
  const [selectedModelId, setSelectedModelId] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleModelSelect = (modelId) => {
    setSelectedModelId(modelId);
  };
  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack(); // This is the correct method for going back.
    } else {
      console.warn("Cannot go back, no previous screen.");
    }
  };
  const handleContinue = () => {
    if (!selectedModelId) {
      Alert.alert("Error", "Please select a model to continue");
      return;
    }

    // Validate number of images per class
    const minImagesRequired = selectedModelId === "resnet50" ? 5 : 5;
    const hasEnoughImages = Object.values(imagesByClass).every(
      (images) => images.length >= minImagesRequired
    );

    if (!hasEnoughImages) {
      Alert.alert(
        "Warning",
        `Some classes have fewer than ${minImagesRequired} images. This may affect model performance. Do you want to continue?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Continue",
            onPress: () => proceedToTraining(),
          },
        ]
      );
      return;
    }

    proceedToTraining();
  };

  const proceedToTraining = () => {
    setSelectedModel(selectedModelId);
    navigation.navigate("ModelTraining");
  };

  if (loading) {
    return <LoadingSpinner message="Loading models..." />;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Select Model Architecture</Text>

      {AVAILABLE_MODELS.map((model) => (
        <TouchableOpacity
          key={model.id}
          style={[
            styles.modelCard,
            selectedModelId === model.id && styles.selectedCard,
          ]}
          onPress={() => handleModelSelect(model.id)}
        >
          <Text style={styles.modelName}>{model.name}</Text>
          <Text style={styles.modelDescription}>{model.description}</Text>
          <Text style={styles.requirements}>{model.requirements}</Text>
        </TouchableOpacity>
      ))}

      <View style={styles.buttonContainer}>
        <Button
          title="Back to Images"
          variant="outline"
          onPress={handleBack}
          style={styles.button}
        />
        <Button
          title="Continue to Training"
          variant="primary"
          onPress={handleContinue}
          disabled={!selectedModelId}
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
  modelCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedCard: {
    borderColor: "#007AFF",
    borderWidth: 2,
  },
  modelName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#212529",
  },
  modelDescription: {
    fontSize: 14,
    color: "#6C757D",
    marginBottom: 8,
  },
  requirements: {
    fontSize: 12,
    color: "#495057",
    fontStyle: "italic",
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

export default ModelSelection;
