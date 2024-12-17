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

const ModelGallery = () => {
  const navigation = useNavigation();
  const [models, setModels] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStoredModels();
  }, []);

  const loadStoredModels = async () => {
    try {
      const baseDir = `${FileSystem.documentDirectory}/models_file`;
      const exists = await FileSystem.getInfoAsync(baseDir);

      if (!exists.exists) {
        setModels({});
        setLoading(false);
        return;
      }

      const modelDirs = await FileSystem.readDirectoryAsync(baseDir);
      const modelInfo = {};

      for (const modelName of modelDirs) {
        try {
          const metadataPath = `${baseDir}/${modelName}/metadata.json`;
          const metadataStr = await FileSystem.readAsStringAsync(metadataPath);
          const metadata = JSON.parse(metadataStr);

          // Organize by type
          if (!modelInfo[metadata.type]) {
            modelInfo[metadata.type] = [];
          }

          modelInfo[metadata.type].push({
            name: modelName,
            ...metadata,
          });
        } catch (err) {
          console.error(`Error loading metadata for ${modelName}:`, err);
        }
      }

      setModels(modelInfo);
    } catch (err) {
      setError("Failed to load models");
      console.error("Error loading models:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleModelSelect = (model) => {
    navigation.navigate("ModelTesting", {
      modelPath: `${FileSystem.documentDirectory}/models_file/${model.name}`,
      modelInfo: model,
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading stored models...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Stored Models</Text>

      {Object.keys(models).length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No trained models found</Text>
          <TouchableOpacity
            style={styles.trainButton}
            onPress={() => navigation.navigate("AddImages")}
          >
            <Text style={styles.trainButtonText}>Train New Model</Text>
          </TouchableOpacity>
        </View>
      ) : (
        Object.entries(models).map(([type, modelList]) => (
          <View key={type} style={styles.categoryContainer}>
            <Text style={styles.categoryTitle}>
              {type.charAt(0).toUpperCase() + type.slice(1)} Models
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.modelScroll}
            >
              {modelList.map((model) => (
                <TouchableOpacity
                  key={model.name}
                  style={styles.modelCard}
                  onPress={() => handleModelSelect(model)}
                >
                  <Text style={styles.modelName}>{model.name}</Text>
                  <Text style={styles.modelInfo}>
                    Classes: {model.numClasses}
                  </Text>
                  <Text style={styles.modelInfo}>
                    Accuracy:{" "}
                    {(model.performance.finalAccuracy * 100).toFixed(1)}%
                  </Text>
                  <Text style={styles.modelDate}>
                    {new Date(model.trainedAt).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    padding: 20,
    color: "#212529",
  },
  categoryContainer: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "600",
    padding: 15,
    color: "#495057",
  },
  modelScroll: {
    paddingHorizontal: 10,
  },
  modelCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 5,
    width: Dimensions.get("window").width * 0.7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modelName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#212529",
    marginBottom: 8,
  },
  modelInfo: {
    fontSize: 14,
    color: "#6C757D",
    marginBottom: 4,
  },
  modelDate: {
    fontSize: 12,
    color: "#ADB5BD",
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#6C757D",
    marginBottom: 20,
  },
  trainButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  trainButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingText: {
    marginTop: 10,
    color: "#6C757D",
    fontSize: 16,
  },
  errorText: {
    color: "#DC3545",
    fontSize: 16,
  },
});

export default ModelGallery;
