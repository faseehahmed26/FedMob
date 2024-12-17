// src/components/common/TaskButton.jsx
import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { Image } from "lucide-react";

const TaskButton = ({
  title,
  onPress,
  disabled = false,
  disabledMessage,
  icon,
}) => {
  const buttonStyles = [
    styles.button,
    disabled ? styles.disabled : styles.enabled,
  ];

  const textStyles = [
    styles.text,
    disabled ? styles.disabledText : styles.enabledText,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {icon && (
        <Image
          size={24}
          color={disabled ? "#888" : "#fff"}
          style={styles.icon}
        />
      )}
      <Text style={textStyles}>
        {disabled && disabledMessage ? `${title} (${disabledMessage})` : title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginVertical: 10,
    width: "80%",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  disabled: {
    backgroundColor: "#E9ECEF",
  },
  enabled: {
    backgroundColor: "#007AFF",
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },
  disabledText: {
    color: "#6C757D",
  },
  enabledText: {
    color: "#fff",
  },
  icon: {
    marginRight: 8,
  },
});

export default TaskButton;
