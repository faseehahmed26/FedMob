// src/navigation/AppNavigator.jsx
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { ModelProvider } from "../contexts/ModelContext";
import FirstPage from "../components/screens/home/FirstPage";
import ImageTask from "../components/screens/home/ImageTask";
import { AddImages } from "../components/screens/classification/AddImages";
import ModelSelection from "../components/screens/classification/ModelSelection";
import ModelTraining from "../components/screens/classification/ModelTraining";
import ModelTesting from "../components/screens/classification/ModelTesting";

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <ModelProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="FirstPage"
          screenOptions={{
            headerStyle: {
              backgroundColor: "#007AFF",
            },
            headerTintColor: "#fff",
            headerTitleStyle: {
              fontWeight: "bold",
            },
          }}
        >
          <Stack.Screen
            name="FirstPage"
            component={FirstPage}
            options={{ title: "Select Task" }}
          />
          <Stack.Screen
            name="ImageTask"
            component={ImageTask}
            options={{ title: "Image Processing" }}
          />
          <Stack.Screen
            name="AddImages"
            component={AddImages}
            options={{ title: "Add Training Images" }}
          />
          <Stack.Screen
            name="ModelSelection"
            component={ModelSelection}
            options={{ title: "Select Model" }}
          />
          <Stack.Screen
            name="ModelTraining"
            component={ModelTraining}
            options={{ title: "Train Model" }}
          />
          <Stack.Screen
            name="ModelTesting"
            component={ModelTesting}
            options={{ title: "Test Model" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ModelProvider>
  );
};

export default AppNavigator;
