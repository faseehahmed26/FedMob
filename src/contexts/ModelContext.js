import React, { createContext, useState, useContext } from "react";

const ModelContext = createContext();

export const useModelContext = () => {
  const context = useContext(ModelContext);
  if (!context) {
    throw new Error("useModelContext must be used within a ModelProvider");
  }
  return context;
};

export const ModelProvider = ({ children }) => {
  const [imagesByClass, setImagesByClass] = useState({});
  const [selectedModel, setSelectedModel] = useState(null);
  const [trainedModels, setTrainedModels] = useState([]);
  const [trainingProgress, setTrainingProgress] = useState(null);
  const [isTraining, setIsTraining] = useState(false);

  const value = {
    imagesByClass,
    setImagesByClass,
    selectedModel,
    setSelectedModel,
    trainedModels,
    setTrainedModels,
    trainingProgress,
    setTrainingProgress,
    isTraining,
    setIsTraining,
  };

  return (
    <ModelContext.Provider value={value}>{children}</ModelContext.Provider>
  );
};

export default ModelContext;
