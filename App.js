import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { ModelProvider } from "./src/contexts/ModelContext";
import { navigationConfig, routes } from "./src/navigation/navigationConfig";

// Import all screens
import FirstPage from "./src/components/screens/home/FirstPage";
import ModelGallery from "./src/components/screens/home/ModelGallery";

import ImageTask from "./src/components/screens/home/ImageTask";
import AddImages from "./src/components/screens/classification/AddImages";
import ModelSelection from "./src/components/screens/classification/ModelSelection";
import ModelTraining from "./src/components/screens/classification/ModelTraining";
import ModelTesting from "./src/components/screens/classification/ModelTesting";

// Initialize the stack navigator
const Stack = createStackNavigator();

const App = () => {
  return (
    <ModelProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={routes.initial}
          screenOptions={navigationConfig.screenOptions}
        >
          <Stack.Screen
            name="FirstPage"
            component={FirstPage}
            options={navigationConfig.screens.FirstPage}
          />
          <Stack.Screen
            name="ImageTask"
            component={ImageTask}
            options={navigationConfig.screens.ImageTask}
          />
          <Stack.Screen
            name="AddImages"
            component={AddImages}
            options={navigationConfig.screens.AddImages}
          />
          <Stack.Screen
            name="ImgClassificationModels"
            component={ModelSelection}
            options={navigationConfig.screens.ImgClassificationModels}
          />
          <Stack.Screen
            name="ModelTraining"
            component={ModelTraining}
            options={navigationConfig.screens.ModelTraining}
          />
          <Stack.Screen
            name="ModelTesting"
            component={ModelTesting}
            options={navigationConfig.screens.ModelTesting}
          />
          <Stack.Screen
            name="ModelGallery"
            component={ModelGallery}
            options={navigationConfig.screens.ModelGallery}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ModelProvider>
  );
};

export default App;
