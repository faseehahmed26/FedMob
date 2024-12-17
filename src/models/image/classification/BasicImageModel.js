// models/image/classification/BasicImageModel.js

class BasicImageModel {
  constructor() {
    this.modelName = "basic";
    this.defaultConfig = {
      inputShape: [224, 224, 3],
      numClasses: null,
      learningRate: 0.001,
      batchSize: 32,
    };
  }

  async buildModel(numClasses) {
    const tf = require("@tensorflow/tfjs");

    const model = tf.sequential();

    // Basic CNN architecture
    model.add(
      tf.layers.conv2d({
        inputShape: this.defaultConfig.inputShape,
        filters: 32,
        kernelSize: 3,
        activation: "relu",
      })
    );
    model.add(tf.layers.maxPooling2d({ poolSize: 2 }));

    model.add(
      tf.layers.conv2d({
        filters: 64,
        kernelSize: 3,
        activation: "relu",
      })
    );
    model.add(tf.layers.maxPooling2d({ poolSize: 2 }));

    model.add(tf.layers.flatten());
    model.add(tf.layers.dense({ units: 128, activation: "relu" }));
    model.add(tf.layers.dropout({ rate: 0.5 }));
    model.add(tf.layers.dense({ units: numClasses, activation: "softmax" }));

    return model;
  }

  async compile(model) {
    model.compile({
      optimizer: tf.train.adam(this.defaultConfig.learningRate),
      loss: "categoricalCrossentropy",
      metrics: ["accuracy"],
    });
    return model;
  }

  getModelInfo() {
    return {
      name: this.modelName,
      description: "A basic CNN model for image classification",
      defaultConfig: this.defaultConfig,
    };
  }
}

export default BasicImageModel;
