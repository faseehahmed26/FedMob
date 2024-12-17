import * as tf from "@tensorflow/tfjs";
import { decode } from "base64-js";
import { Buffer } from "buffer";
import RNFS from "react-native-fs";

class ImageProcessor {
  async loadImage(uri) {
    try {
      // Read image file
      const response = await RNFS.readFile(uri, "base64");
      const buffer = Buffer.from(decode(response));

      // Decode image
      const imageTensor = tf.node.decodeImage(buffer);
      return imageTensor;
    } catch (error) {
      console.error("Error loading image:", error);
      throw error;
    }
  }

  async preprocessImage(imageTensor, targetSize = [224, 224]) {
    try {
      // Resize image
      const resized = tf.image.resizeBilinear(imageTensor, targetSize);

      // Normalize pixel values to [0, 1]
      const normalized = resized.div(255.0);

      // Add batch dimension
      const batched = normalized.expandDims(0);

      return batched;
    } catch (error) {
      console.error("Error preprocessing image:", error);
      throw error;
    }
  }

  async augmentImage(imageTensor) {
    try {
      // Random rotation
      const rotated = tf.image.rotateWithOffset(
        imageTensor,
        (Math.random() - 0.5) * 0.5 // Random rotation between -0.25 and 0.25 radians
      );

      // Random flip
      const flipped = tf.image.randomFlipLeftRight(rotated);

      // Random brightness
      const brightened = tf.image.adjustBrightness(
        flipped,
        (Math.random() - 0.5) * 0.4 // Random brightness adjustment
      );

      return brightened;
    } catch (error) {
      console.error("Error augmenting image:", error);
      throw error;
    }
  }
}

export default new ImageProcessor();
