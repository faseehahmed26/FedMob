import React, { useState } from "react";
import {
  View,
  Button,
  Image,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { launchImageLibrary } from "react-native-image-picker";

const MAX_CLASSES = 11;
const MAX_IMAGES_PER_CLASS = 50;

const AddImages = () => {
  const [className, setClassName] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [imagesByClass, setImagesByClass] = useState({});
  const [classNames, setClassNames] = useState({});

  const addClass = () => {
    if (!className.trim()) {
      alert("Class name cannot be empty.");
      return;
    }

    if (Object.keys(classNames).length >= MAX_CLASSES) {
      alert(`You can only have up to ${MAX_CLASSES} classes.`);
      return;
    }

    if (classNames[className]) {
      alert("Class name must be unique.");
      return;
    }

    setClassNames((prevClassNames) => ({
      ...prevClassNames,
      [className]: className,
    }));
    setClassName("");
  };

  const addImage = () => {
    if (!selectedClass) {
      alert("Please select a class before adding an image.");
      return;
    }

    if (imagesByClass[selectedClass]?.length >= MAX_IMAGES_PER_CLASS) {
      alert(`Class ${selectedClass} already has the maximum of 50 images.`);
      return;
    }

    launchImageLibrary({ mediaType: "photo" }, (response) => {
      if (response.assets && response.assets.length > 0) {
        const newImage = {
          id: response.assets[0].uri,
          uri: response.assets[0].uri,
        };

        setImagesByClass((prevImages) => {
          const updatedImages = { ...prevImages };
          if (!updatedImages[selectedClass]) {
            updatedImages[selectedClass] = [];
          }
          updatedImages[selectedClass].push(newImage);
          return updatedImages;
        });
      }
    });
  };

  const renderImageList = () => {
    if (!selectedClass) {
      return <Text style={styles.infoText}>Select a class to view images</Text>;
    }

    const images = imagesByClass[selectedClass] || [];

    return (
      <FlatList
        data={images}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Image source={{ uri: item.uri }} style={styles.image} />
        )}
      />
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Create a New Class:</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter class name"
        value={className}
        onChangeText={setClassName}
      />
      <TouchableOpacity style={styles.addButton} onPress={addClass}>
        <Text style={styles.buttonText}>Add Class</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Select a Class:</Text>
      {Object.keys(classNames).length === 0 ? (
        <Text style={styles.infoText}>
          No classes available. Create a new class to start.
        </Text>
      ) : (
        <FlatList
          data={Object.keys(classNames)}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.classItem}
              onPress={() => setSelectedClass(item)}
            >
              <Text style={styles.classText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <Button title="Add Image to Selected Class" onPress={addImage} />

      <Text style={styles.imageCount}>
        {selectedClass
          ? `${selectedClass} - ${
              imagesByClass[selectedClass]?.length || 0
            } / ${MAX_IMAGES_PER_CLASS} images`
          : "No class selected"}
      </Text>

      {renderImageList()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    padding: 10,
  },
  label: {
    fontSize: 16,
    marginTop: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    width: "80%",
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginBottom: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
  },
  classItem: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    marginVertical: 5,
    width: "80%",
    alignItems: "center",
  },
  classText: {
    fontSize: 16,
  },
  imageCount: {
    fontSize: 14,
    marginVertical: 10,
  },
  image: {
    width: 100,
    height: 100,
    marginVertical: 10,
  },
  infoText: {
    fontSize: 16,
    marginVertical: 20,
    color: "gray",
    textAlign: "center",
  },
});

export default AddImages;
