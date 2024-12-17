import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";

const Button = ({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  style = {},
  textStyle = {},
}) => {
  const buttonStyles = [
    styles.button,
    styles[variant],
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`${variant}Text`],
    disabled && styles.disabledText,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={textStyles}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
  },
  primary: {
    backgroundColor: "#007AFF",
  },
  secondary: {
    backgroundColor: "#6c757d",
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  disabled: {
    backgroundColor: "#cccccc",
    opacity: 0.7,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
  },
  primaryText: {
    color: "#ffffff",
  },
  secondaryText: {
    color: "#ffffff",
  },
  outlineText: {
    color: "#007AFF",
  },
  disabledText: {
    color: "#666666",
  },
});

export default Button;
