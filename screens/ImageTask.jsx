import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

const ImageTask = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.optionsContainer}>
        {/* Disabled Text Option */}
        <TouchableOpacity
          style={[styles.option, styles.disabledOption]}
          disabled={true}
        >
          <Text style={styles.disabledText}>Generation (Disabled)</Text>
        </TouchableOpacity>

        {/* Enabled Image Option */}
        <TouchableOpacity
          style={[styles.option, styles.enabledOption]}
          onPress={() => navigation.navigate("AddImages")}
        >
          <Text style={styles.enabledText}>Classification</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  optionsContainer: {
    flexDirection: "column",
    alignItems: "center",
  },
  option: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginVertical: 10,
    width: "80%",
    alignItems: "center",
    justifyContent: "center",
  },
  disabledOption: {
    backgroundColor: "#cccccc",
  },
  disabledText: {
    color: "#888",
  },
  enabledOption: {
    backgroundColor: "#007AFF",
  },
  enabledText: {
    color: "#fff",
  },
});

export default ImageTask;
