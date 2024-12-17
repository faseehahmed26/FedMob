export const MODEL_TYPES = {
  BASIC: "basic",
  RESNET50: "resnet50",
};

export const IMAGE_CONFIG = {
  MAX_CLASSES: 10,
  MIN_IMAGES_PER_CLASS: 50,
  MAX_IMAGES_PER_CLASS: 1000,
  SUPPORTED_FORMATS: ["jpg", "jpeg", "png"],
  TARGET_SIZE: [224, 224],
};

export const TRAINING_CONFIG = {
  DEFAULT_EPOCHS: 10,
  DEFAULT_BATCH_SIZE: 32,
  DEFAULT_LEARNING_RATE: 0.001,
  DEFAULT_VALIDATION_SPLIT: 0.2,
  MIN_EPOCHS: 1,
  MAX_EPOCHS: 100,
  MIN_BATCH_SIZE: 1,
  MAX_BATCH_SIZE: 128,
};

export const ERROR_MESSAGES = {
  INVALID_MODEL: "Invalid model type selected",
  NOT_ENOUGH_IMAGES: "Not enough images for training",
  TOO_MANY_IMAGES: "Too many images in class",
  INVALID_IMAGE_FORMAT: "Unsupported image format",
  MODEL_LOAD_ERROR: "Failed to load model",
  MODEL_SAVE_ERROR: "Failed to save model",
  TRAINING_ERROR: "Error during model training",
};

export const SUCCESS_MESSAGES = {
  MODEL_SAVED: "Model saved successfully",
  TRAINING_COMPLETE: "Training completed successfully",
  IMAGES_ADDED: "Images added successfully",
};
