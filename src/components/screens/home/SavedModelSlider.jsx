import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import * as FileSystem from "expo-file-system";
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.8;
const SPACING = 10;

const SavedModelsSlider = () => {
  const navigation = useNavigation();
  const [savedModels, setSavedModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState(null);

  useEffect(() => {
    loadSavedModels();
  }, []);

  const loadSavedModels = async () => {
    try {
      const modelsDir = `${FileSystem.documentDirectory}/models_file`;
      const dirInfo = await FileSystem.getInfoAsync(modelsDir);

      if (!dirInfo.exists) {
        setLoading(false);
        return;
      }

      const modelDirs = await FileSystem.readDirectoryAsync(modelsDir);
      const models = [];

      for (const dir of modelDirs) {
        try {
          const metadataPath = `${modelsDir}/${dir}/metadata.json`;
          const metadataStr = await FileSystem.readAsStringAsync(metadataPath);
          const metadata = JSON.parse(metadataStr);
          models.push({
            id: dir,
            ...metadata,
          });
        } catch (error) {
          console.error(`Error loading metadata for ${dir}:`, error);
        }
      }

      setSavedModels(models);
    } catch (error) {
      console.error("Error loading saved models:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleModelSelect = (model) => {
    setSelectedModel(model);
  };

  const handleTestModel = (model) => {
    navigation.navigate("ModelTesting", { modelId: model.id });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading saved models...</Text>
      </View>
    );
  }

  if (savedModels.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No saved models found</Text>
        <Text style={styles.emptySubtext}>
          Train a model first to see it here
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Saved Models</Text>

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={CARD_WIDTH + SPACING * 2}
        decelerationRate="fast"
      >
        {savedModels.map((model) => (
          <TouchableOpacity
            key={model.id}
            style={[
              styles.modelCard,
              selectedModel?.id === model.id && styles.selectedCard,
            ]}
            onPress={() => handleModelSelect(model)}
          >
            <Text style={styles.modelName}>{model.name}</Text>
            <Text style={styles.modelType}>Type: {model.type}</Text>
            <Text style={styles.modelClasses}>Classes: {model.numClasses}</Text>
            <Text style={styles.modelDate}>
              Trained: {new Date(model.trainedAt).toLocaleDateString()}
            </Text>

            <View style={styles.performanceContainer}>
              <Text style={styles.performanceTitle}>Performance:</Text>
              <Text style={styles.performanceText}>
                Accuracy: {(model.performance.finalAccuracy * 100).toFixed(2)}%
              </Text>
              <Text style={styles.performanceText}>
                Loss: {model.performance.finalLoss.toFixed(4)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.testButton}
              onPress={() => handleTestModel(model)}
            >
              <Text style={styles.testButtonText}>Test Model</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.pagination}>
        {savedModels.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              selectedModel?.id === savedModels[index].id && styles.activeDot,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    paddingHorizontal: 20,
    color: "#212529",
  },
  scrollContent: {
    paddingHorizontal: SPACING,
  },
  modelCard: {
    width: CARD_WIDTH,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginHorizontal: SPACING,
    elevation: 3,
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
    fontSize: 20,
    fontWeight: "bold",
    color: "#212529",
    marginBottom: 10,
  },
  modelType: {
    fontSize: 16,
    color: "#495057",
    marginBottom: 5,
  },
  modelClasses: {
    fontSize: 16,
    color: "#495057",
    marginBottom: 5,
  },
  modelDate: {
    fontSize: 14,
    color: "#6C757D",
    marginBottom: 15,
  },
  performanceContainer: {
    backgroundColor: "#F8F9FA",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  performanceTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212529",
    marginBottom: 5,
  },
  performanceText: {
    fontSize: 14,
    color: "#495057",
    marginBottom: 2,
  },
  testButton: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  testButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#CED4DA",
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: "#007AFF",
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#6C757D",
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6C757D",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6C757D",
  },
});

export default SavedModelsSlider;
