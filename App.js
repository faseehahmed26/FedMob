import * as React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import FirstPage from "./screens/FirstPage";
import AddImages from "./screens/AddImages";
import imgClassificationModels from "./screens/imgClassificationModels";
import FourthPage from "./screens/FourthPage";
import ImageTask from "./screens/ImageTask";

const Stack = createStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="FirstPage">
        <Stack.Screen
          name="FirstPage"
          component={FirstPage}
          options={{ title: "Options" }}
        />
        <Stack.Screen
          name="ImageTask"
          component={ImageTask}
          options={{ title: "Image Task" }}
        />
        <Stack.Screen
          name="AddImages"
          component={AddImages}
          options={{ title: "Add Images" }}
        />
        <Stack.Screen
          name="imgClassificationModels"
          component={imgClassificationModels}
          options={{ title: "Model Selection" }}
        />
        {/* <Stack.Screen
          name="FourthPage"
          component={FourthPage}
          options={{ title: "Federated Training" }} */}
        {/* /> */}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
