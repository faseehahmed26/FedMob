import React from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";

const LoadingSpinner = ({ message = "Loading...", color = "#007AFF" }) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={color} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
  },
  message: {
    marginTop: 12,
    fontSize: 16,
    color: "#666666",
  },
});

export default LoadingSpinner;
