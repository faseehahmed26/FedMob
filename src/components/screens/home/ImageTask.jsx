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

const ImageTask = () => {
  const navigation = useNavigation();

  const handleClassificationPress = () => {
    navigation.navigate("AddImages");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

      <Text style={styles.title}>Image Processing</Text>
      <Text style={styles.subtitle}>Select Task Type</Text>

      <View style={styles.optionsContainer}>
        {/* Disabled Generation Option */}
        <TouchableOpacity
          style={[styles.option, styles.disabledOption]}
          disabled={true}
        >
          <Text style={styles.disabledText}>Image Generation</Text>
          <Text style={styles.comingSoon}>(Coming Soon)</Text>
        </TouchableOpacity>

        {/* Enabled Classification Option */}
        <TouchableOpacity
          style={[styles.option, styles.enabledOption]}
          onPress={handleClassificationPress}
          activeOpacity={0.7}
        >
          <Text style={styles.enabledText}>Image Classification</Text>
          <Text style={styles.featureList}>
            • Train custom models{"\n"}• Federated learning{"\n"}• Real-time
            inference
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footerText}>
        Select Classification to start training your model
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
    fontSize: 28,
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
    marginBottom: 8,
  },
  comingSoon: {
    fontSize: 14,
    color: "#6C757D",
    marginTop: 4,
  },
  featureList: {
    fontSize: 14,
    color: "#E6F0FF",
    textAlign: "left",
    alignSelf: "stretch",
    paddingLeft: 20,
  },
  footerText: {
    fontSize: 14,
    color: "#6C757D",
    textAlign: "center",
    marginBottom: 20,
  },
});

export default ImageTask;
