import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

const imgClassificationModels = () => {
  const [selectedModel, setSelectedModel] = useState(""); // Tracks the selected model
  const [images, setImages] = useState([
    { id: "1", uri: "https://example.com/sample-image1.jpg" },
    { id: "2", uri: "https://example.com/sample-image2.jpg" },
  ]);

  return (
    <View style={styles.container}>
      <FlatList
        data={images}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => {}}>
            <Image source={{ uri: item.uri }} style={styles.image} />
          </TouchableOpacity>
        )}
      />
      <Text style={styles.label}>Select Model:</Text>
      <Picker
        selectedValue={selectedModel}
        style={styles.picker}
        onValueChange={(itemValue) => setSelectedModel(itemValue)}
      >
        <Picker.Item label="Select a model" value="" />
        <Picker.Item label="Basic MNIST Model" value="mnist" />
        <Picker.Item label="Advanced MNIST Model" value="advanced_mnist" />
      </Picker>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    padding: 10,
  },
  image: {
    width: 100,
    height: 100,
    marginVertical: 10,
  },
  label: {
    fontSize: 16,
    marginTop: 20,
  },
  picker: {
    height: 50,
    width: 200,
  },
});

export default imgClassificationModels;
