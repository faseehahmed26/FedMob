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
  Alert,
  ScrollView,
} from "react-native";
// import { launchImageLibrary } from "react-native-image-picker";
// import { launchImageLibraryAsync } from "expo-image-picker";
import * as ImagePicker from "expo-image-picker";
// import * as ImagePicker from "react-native-image-picker";
import { useModelContext } from "../../../contexts/ModelContext";

const MAX_CLASSES = 11;
const MAX_IMAGES_PER_CLASS = 50;

const AddImages = ({ navigation }) => {
  const { imagesByClass, setImagesByClass } = useModelContext();
  const [className, setClassName] = useState("");
  const [selectedClass, setSelectedClass] = useState("");

  const addClass = () => {
    if (!className.trim()) {
      Alert.alert("Error", "Class name cannot be empty.");
      return;
    }

    if (Object.keys(imagesByClass).length >= MAX_CLASSES) {
      Alert.alert("Error", `You can only have up to ${MAX_CLASSES} classes.`);
      return;
    }

    if (imagesByClass[className]) {
      Alert.alert("Error", "Class name must be unique.");
      return;
    }

    setImagesByClass((prevClasses) => ({
      ...prevClasses,
      [className]: [],
    }));
    setClassName("");
  };

  // const addImage = async () => {
  //   if (!selectedClass) {
  //     Alert.alert("Error", "Please select a class before adding images.");
  //     return;
  //   }

  //   if (imagesByClass[selectedClass]?.length >= MAX_IMAGES_PER_CLASS) {
  //     Alert.alert(
  //       "Error",
  //       `Class ${selectedClass} already has the maximum of ${MAX_IMAGES_PER_CLASS} images.`
  //     );
  //     return;
  //   }

  //   try {
  //     const result = await ImagePicker.launchImageLibrary({
  //       mediaType: "photo",
  //       selectionLimit: 10,
  //       quality: 1,
  //       noData: true,
  //     });
  //     console.log(response);

  //     if (result.assets && result.assets.length > 0) {
  //       const newImages = result.assets.map((asset) => ({
  //         id: asset.uri,
  //         uri: asset.uri,
  //       }));

  //       setImagesByClass((prevClasses) => {
  //         const currentImages = prevClasses[selectedClass] || [];
  //         const availableSlots = MAX_IMAGES_PER_CLASS - currentImages.length;
  //         const imagesToAdd = newImages.slice(0, availableSlots);

  //         return {
  //           ...prevClasses,
  //           [selectedClass]: [...currentImages, ...imagesToAdd],
  //         };
  //       });
  //     }
  //   } catch (error) {
  //     console.error("Error selecting images:", error);
  //     Alert.alert("Error", "Failed to select images");
  //   }
  // };
  const addImage = async () => {
    if (!selectedClass) {
      Alert.alert("Error", "Please select a class before adding images.");
      return;
    }

    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Error", "Permission to access media library is required.");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImages = result.assets.map((asset) => ({
          id: asset.uri,
          uri: asset.uri,
        }));

        setImagesByClass((prevClasses) => {
          const currentImages = prevClasses[selectedClass] || [];
          const availableSlots = MAX_IMAGES_PER_CLASS - currentImages.length;
          const imagesToAdd = newImages.slice(0, availableSlots);

          return {
            ...prevClasses,
            [selectedClass]: [...currentImages, ...imagesToAdd],
          };
        });
      }
    } catch (error) {
      console.error("Error selecting images:", error);
      Alert.alert("Error", "Failed to select images");
    }
  };
  const deleteClass = (classToDelete) => {
    Alert.alert(
      "Delete Class",
      `Are you sure you want to delete class "${classToDelete}" and all its images?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setImagesByClass((prevClasses) => {
              const newClasses = { ...prevClasses };
              delete newClasses[classToDelete];
              return newClasses;
            });
            if (selectedClass === classToDelete) {
              setSelectedClass("");
            }
          },
        },
      ]
    );
  };

  const deleteImage = (imageUri) => {
    setImagesByClass((prevClasses) => ({
      ...prevClasses,
      [selectedClass]: prevClasses[selectedClass].filter(
        (img) => img.uri !== imageUri
      ),
    }));
  };

  const handleContinue = () => {
    const classesWithImages = Object.entries(imagesByClass).filter(
      ([_, images]) => images.length > 0
    );

    if (classesWithImages.length < 2) {
      Alert.alert(
        "Error",
        "You need at least 2 classes with images to continue."
      );
      return;
    }

    navigation.navigate("ImgClassificationModels");
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Add New Class Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add New Class</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter class name"
              value={className}
              onChangeText={setClassName}
            />
            <TouchableOpacity style={styles.addButton} onPress={addClass}>
              <Text style={styles.buttonText}>Add Class</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Class Selection Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Classes</Text>
          {Object.keys(imagesByClass).length === 0 ? (
            <Text style={styles.emptyText}>
              No classes available. Create a new class to start.
            </Text>
          ) : (
            <View style={styles.classContainer}>
              {Object.keys(imagesByClass).map((name) => (
                <TouchableOpacity
                  key={name}
                  style={[
                    styles.classItem,
                    selectedClass === name && styles.selectedClass,
                  ]}
                  onPress={() => setSelectedClass(name)}
                >
                  <Text style={styles.className}>{name}</Text>
                  <Text style={styles.imageCount}>
                    ({imagesByClass[name].length}/{MAX_IMAGES_PER_CLASS})
                  </Text>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteClass(name)}
                  >
                    <Text style={styles.deleteButtonText}>×</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Image Management Section */}
        {selectedClass && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Images for {selectedClass}</Text>
            <TouchableOpacity style={styles.addImagesButton} onPress={addImage}>
              <Text style={styles.buttonText}>Add Images</Text>
            </TouchableOpacity>

            <View style={styles.imageGrid}>
              {imagesByClass[selectedClass]?.map((image) => (
                <View key={image.uri} style={styles.imageContainer}>
                  <Image source={{ uri: image.uri }} style={styles.image} />
                  <TouchableOpacity
                    style={styles.deleteImageButton}
                    onPress={() => deleteImage(image.uri)}
                  >
                    <Text style={styles.deleteButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text style={styles.buttonText}>Continue to Model Selection</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#212529",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CED4DA",
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  classContainer: {
    gap: 8,
  },
  classItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DEE2E6",
  },
  selectedClass: {
    borderColor: "#007AFF",
    backgroundColor: "#E6F3FF",
  },
  className: {
    flex: 1,
    fontSize: 16,
    color: "#212529",
  },
  imageCount: {
    marginRight: 8,
    color: "#6C757D",
  },
  deleteButton: {
    padding: 4,
  },
  deleteButtonText: {
    color: "#DC3545",
    fontSize: 24,
    fontWeight: "bold",
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  imageContainer: {
    position: "relative",
    width: 100,
    height: 100,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  deleteImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DC3545",
  },
  addImagesButton: {
    backgroundColor: "#28A745",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  emptyText: {
    textAlign: "center",
    color: "#6C757D",
    fontSize: 16,
    marginVertical: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
    backgroundColor: "#FFFFFF",
  },
  continueButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
});

export default AddImages;
