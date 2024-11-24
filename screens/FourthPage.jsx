import React, { useState, useEffect } from "react";
import { View, Text, Button, StyleSheet, Alert } from "react-native";
import NetInfo from "@react-native-community/netinfo";

const FourthPage = () => {
  const [isWifiConnected, setIsWifiConnected] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsWifiConnected(state.type === "wifi" && state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  const startTraining = () => {
    if (isWifiConnected) {
      Alert.alert("Training Started", "Federated training has begun.");
      // Add actual federated training code here
    } else {
      Alert.alert(
        "No Wi-Fi Connection",
        "Please connect to a Wi-Fi network to start training."
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.infoText}>
        {isWifiConnected
          ? "Wi-Fi is connected. Ready for training."
          : "Please connect to Wi-Fi for training."}
      </Text>
      <Button title="Start Training" onPress={startTraining} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
  infoText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
});

export default FourthPage;
