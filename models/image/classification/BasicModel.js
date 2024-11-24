import * as tf from "@tensorflow/tfjs";

const BasicModel = {
  async createModel() {
    const model = tf.sequential();

    // First convolutional layer
    model.add(
      tf.layers.conv2d({
        inputShape: [28, 28, 1], // Assuming grayscale images of 28x28 pixels
        filters: 16,
        kernelSize: 3,
        activation: "relu",
      })
    );

    model.add(tf.layers.maxPooling2d({ poolSize: [2, 2] }));

    // Second convolutional layer
    model.add(
      tf.layers.conv2d({
        filters: 32,
        kernelSize: 3,
        activation: "relu",
      })
    );

    model.add(tf.layers.maxPooling2d({ poolSize: [2, 2] }));

    // Flattening the output for dense layers
    model.add(tf.layers.flatten());

    // Dense layer
    model.add(
      tf.layers.dense({
        units: 64,
        activation: "relu",
      })
    );

    // Output layer for 10 classes (e.g., digits 0-9)
    model.add(
      tf.layers.dense({
        units: 10,
        activation: "softmax",
      })
    );

    model.compile({
      optimizer: tf.train.adam(),
      loss: "categoricalCrossentropy",
      metrics: ["accuracy"],
    });

    return model;
  },

  async classify(imageTensor) {
    const model = await this.createModel();

    // Here, you would normally load pre-trained weights or train the model
    // For this example, we're just assuming the model is ready and returning a dummy result
    const prediction = model.predict(imageTensor);
    const predictedClass = prediction.argMax(-1).dataSync()[0];
    return predictedClass;
  },
};

export default BasicModel;
