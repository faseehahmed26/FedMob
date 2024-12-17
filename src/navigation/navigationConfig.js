import { TransitionPresets } from "@react-navigation/stack";

export const navigationConfig = {
  screenOptions: {
    headerStyle: {
      backgroundColor: "#007AFF",
    },
    headerTintColor: "#fff",
    headerTitleStyle: {
      fontWeight: "bold",
    },
    ...TransitionPresets.SlideFromRightIOS,
    cardStyle: { backgroundColor: "#F8F9FA" },
  },
  screens: {
    FirstPage: {
      title: "FedMob",
      headerShown: true,
    },
    ImageTask: {
      title: "Select Task",
      headerShown: true,
    },
    AddImages: {
      title: "Add Training Images",
      headerShown: true,
    },
    ImgClassificationModels: {
      title: "Select Model",
      headerShown: true,
    },
    ModelTraining: {
      title: "Train Model",
      headerShown: true,
    },
    ModelTesting: {
      title: "Test Model",
      headerShown: true,
    },
  },
};

export const routes = {
  initial: "FirstPage",
  classification: {
    start: "ImageTask",
    addImages: "AddImages",
    selectModel: "ImgClassificationModels",
    training: "ModelTraining",
    testing: "ModelTesting",
  },
};
