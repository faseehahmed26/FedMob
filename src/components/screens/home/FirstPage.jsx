import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

const FirstPage = () => {
  const navigation = useNavigation();

  const handleImagePress = () => {
    navigation.navigate("ImageTask");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

      <Text style={styles.title}>FedMob</Text>
      <Text style={styles.subtitle}>Select a Task Type</Text>

      <View style={styles.optionsContainer}>
        {/* Disabled Text Option */}
        <TouchableOpacity
          style={[styles.option, styles.disabledOption]}
          disabled={true}
        >
          <Text style={styles.disabledText}>Text Processing</Text>
          <Text style={styles.comingSoon}>(Coming Soon)</Text>
        </TouchableOpacity>

        {/* Enabled Image Option */}
        <TouchableOpacity
          style={[styles.option, styles.enabledOption]}
          onPress={handleImagePress}
          activeOpacity={0.7}
        >
          <Text style={styles.enabledText}>Image Processing</Text>
          <Text style={styles.availableText}>Classification Available</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.option}
          onPress={() => navigation.navigate("ModelGallery")}
        >
          <Text style={styles.optionText}>View Stored Models</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footerText}>
        Select Image Processing to start training your model
      </Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#212529",
    textAlign: "center",
    marginTop: 40,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: "#6C757D",
    textAlign: "center",
    marginBottom: 40,
  },
  optionsContainer: {
    flex: 1,
    justifyContent: "center",
    gap: 20,
  },
  option: {
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  disabledOption: {
    backgroundColor: "#E9ECEF",
  },
  enabledOption: {
    backgroundColor: "#007AFF",
  },
  disabledText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6C757D",
  },
  enabledText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  comingSoon: {
    fontSize: 14,
    color: "#6C757D",
    marginTop: 4,
  },
  availableText: {
    fontSize: 14,
    color: "#E6F0FF",
    marginTop: 4,
  },
  footerText: {
    fontSize: 14,
    color: "#6C757D",
    textAlign: "center",
    marginBottom: 20,
  },
});

export default FirstPage;
