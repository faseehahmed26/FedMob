import * as tf from "@tensorflow/tfjs";
import * as resnet from "@tensorflow-models/resnet";

const ResNetModel = {
  model: null,

  // Load the ResNet-50 model (asynchronously)
  async loadModel() {
    if (!this.model) {
      this.model = await resnet.load();
      console.log("ResNet-50 model loaded successfully.");
    }
    return this.model;
  },

  // Preprocess the image tensor to fit the ResNet model input requirements
  preprocessImage(imageTensor) {
    // ResNet expects images of shape [224, 224, 3]
    return tf.image
      .resizeBilinear(imageTensor, [224, 224])
      .expandDims(0) // Add batch dimension
      .toFloat();
  },

  // Classify the image using ResNet-50
  async classify(imageTensor) {
    const model = await this.loadModel();

    // Preprocess image to match ResNet input requirements
    const preprocessedImage = this.preprocessImage(imageTensor);

    // Get predictions
    const predictions = await model.classify(preprocessedImage);

    // Return the top prediction (or you can return top-k if needed)
    return predictions;
  },
};

export default ResNetModel;
