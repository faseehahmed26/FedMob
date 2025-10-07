/**
 * Training Engine for FedMob
 * Handles on-device model training and evaluation
 */

import * as tf from '@tensorflow/tfjs';

class TrainingEngine {
  constructor() {
    this.isTraining = false;
    this.trainingHistory = [];
    this.currentEpoch = 0;
    this.currentBatch = 0;
    this.onEpochEnd = null; // optional callback invoked after each epoch
  }

  /**
   * Train model on local data
   * @param {tf.LayersModel} model - TensorFlow.js model
   * @param {tf.Tensor} X_train - Training input data
   * @param {tf.Tensor} y_train - Training labels
   * @param {Object} config - Training configuration
   * @returns {Object} Training results
   */
  async trainModel(model, X_train, y_train, config = {}) {
    try {
      const {
        epochs = 1,
        batchSize = 8,
        learningRate = 0.01,
        validationSplit = 0.1,
      } = config;

      console.log(
        `Starting training: epochs=${epochs}, batchSize=${batchSize}, lr=${learningRate}`,
      );

      this.isTraining = true;
      this.currentEpoch = 0;
      this.currentBatch = 0;

      // Update learning rate
      if (model.optimizer && model.optimizer.learningRate) {
        model.optimizer.learningRate = learningRate;
      }

      // Prepare training data
      const { X_train_processed, y_train_processed, X_val, y_val } =
        this.prepareTrainingData(X_train, y_train, validationSplit);

      // Training history
      const history = {
        loss: [],
        accuracy: [],
        valLoss: [],
        valAccuracy: [],
      };

      // Training loop
      for (let epoch = 0; epoch < epochs; epoch++) {
        this.currentEpoch = epoch;
        console.log(`Epoch ${epoch + 1}/${epochs}`);

        // Train for one epoch
        const epochResults = await this.trainEpoch(
          model,
          X_train_processed,
          y_train_processed,
          batchSize,
        );

        // Validate if validation data exists
        let valResults = null;
        if (X_val && y_val) {
          valResults = await this.evaluateModel(model, X_val, y_val, batchSize);
        }

        // Record history
        history.loss.push(epochResults.loss);
        history.accuracy.push(epochResults.accuracy);

        if (valResults) {
          history.valLoss.push(valResults.loss);
          history.valAccuracy.push(valResults.accuracy);
        }

        console.log(
          `Epoch ${epoch + 1} - Loss: ${epochResults.loss.toFixed(
            4,
          )}, Accuracy: ${epochResults.accuracy.toFixed(4)}`,
        );

        if (valResults) {
          console.log(
            `Epoch ${epoch + 1} - Val Loss: ${valResults.loss.toFixed(
              4,
            )}, Val Accuracy: ${valResults.accuracy.toFixed(4)}`,
          );
        }

        // Notify after each epoch if a callback is provided
        if (typeof this.onEpochEnd === 'function') {
          try {
            const progress = (epoch + 1) / epochs;
            await this.onEpochEnd({
              epoch,
              epochs,
              progress,
              metrics: {
                loss: epochResults.loss,
                accuracy: epochResults.accuracy,
                valLoss: valResults?.loss,
                valAccuracy: valResults?.accuracy,
              },
            });
          } catch (e) {
            console.warn('onEpochEnd hook failed:', e);
          }
        }
      }

      // Calculate final metrics
      const finalLoss = history.loss[history.loss.length - 1];
      const finalAccuracy = history.accuracy[history.accuracy.length - 1];

      this.isTraining = false;
      this.trainingHistory.push(history);

      console.log(
        `Training completed - Final Loss: ${finalLoss.toFixed(
          4,
        )}, Final Accuracy: ${finalAccuracy.toFixed(4)}`,
      );

      // Dispose of processed data
      X_train_processed.dispose();
      y_train_processed.dispose();
      if (X_val) X_val.dispose();
      if (y_val) y_val.dispose();

      return {
        loss: finalLoss,
        accuracy: finalAccuracy,
        history: history,
      };
    } catch (error) {
      this.isTraining = false;
      console.error('Training failed:', error);
      throw error;
    }
  }
  /**
   * Get training history
   * @returns {Object} - Training history
   */

  getTrainingHistory() {
    if (!this.trainingHistory || this.trainingHistory.length === 0) {
      return [];
    }

    // Return the most recent training history
    const latestHistory = this.trainingHistory[this.trainingHistory.length - 1];
    return latestHistory || [];
  }

  /**
   * Train model for one epoch
   * @param {tf.LayersModel} model - TensorFlow.js model
   * @param {tf.Tensor} X - Input data
   * @param {tf.Tensor} y - Labels
   * @param {number} batchSize - Batch size
   * @returns {Object} Epoch results
   */
  async trainEpoch(model, X, y, batchSize) {
    try {
      const numSamples = X.shape[0];
      const numBatches = Math.ceil(numSamples / batchSize);

      let totalLoss = 0;
      let totalAccuracy = 0;
      let processedSamples = 0;

      const epochStart = Date.now();
      for (let batch = 0; batch < numBatches; batch++) {
        this.currentBatch = batch;

        const start = batch * batchSize;
        const end = Math.min(start + batchSize, numSamples);

        // Get batch data
        const X_batch = X.slice([start, 0, 0, 0], [end - start, -1, -1, -1]);
        const y_batch = y.slice([start, 0], [end - start, -1]);

        // Train on batch
        const batchStart = Date.now();
        const batchResults = await this.trainBatch(model, X_batch, y_batch);
        const batchMs = Date.now() - batchStart;
        console.log(
          `Batch ${batch + 1}/${numBatches} size=${end - start} loss=${
            batchResults.loss
          } acc=${batchResults.accuracy} (${batchMs}ms)`,
        );

        totalLoss += batchResults.loss * (end - start);
        totalAccuracy += batchResults.accuracy * (end - start);
        processedSamples += end - start;

        // Dispose of batch tensors
        X_batch.dispose();
        y_batch.dispose();

        // Small delay to prevent blocking
        if (batch % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }

      const epochMs = Date.now() - epochStart;
      console.log(`Epoch finished in ${epochMs}ms`);

      return {
        loss: totalLoss / processedSamples,
        accuracy: totalAccuracy / processedSamples,
      };
    } catch (error) {
      console.error('Epoch training failed:', error);
      throw error;
    }
  }

  /**
   * Train model on a single batch
   * @param {tf.LayersModel} model - TensorFlow.js model
   * @param {tf.Tensor} X_batch - Batch input data
   * @param {tf.Tensor} y_batch - Batch labels
   * @returns {Object} Batch results
   */
  async trainBatch(model, X_batch, y_batch, learningRate = 0.01) {
    try {
      // Prefer trainOnBatch on RN CPU to avoid potential fit()-related hangs
      console.log(
        `trainBatch: starting trainOnBatch with batchSize=${X_batch.shape[0]}`,
      );
      const lossResult = await model.trainOnBatch(X_batch, y_batch);
      let finalLoss = 0;
      if (Array.isArray(lossResult)) {
        // Could be [loss, ...metrics]
        const first = lossResult[0];
        if (typeof first === 'number') {
          finalLoss = first;
        } else if (first && typeof first.data === 'function') {
          const arr = await first.data();
          finalLoss = Array.isArray(arr) ? arr[0] : arr;
          first.dispose?.();
        }
        // Dispose any tensor entries
        lossResult.forEach(t => t && t.dispose && t.dispose());
      } else if (typeof lossResult === 'number') {
        finalLoss = lossResult;
      } else if (lossResult && typeof lossResult.data === 'function') {
        const arr = await lossResult.data();
        finalLoss = Array.isArray(arr) ? arr[0] : arr;
        lossResult.dispose?.();
      }

      // Compute accuracy manually
      const preds = model.predict(X_batch);
      const accTensor = this.calculateAccuracy(y_batch, preds);
      const accArray = await accTensor.data();
      const finalAccuracy = Array.isArray(accArray) ? accArray[0] : accArray;
      if (Array.isArray(preds)) {
        preds.forEach(t => t.dispose());
      } else {
        preds.dispose();
      }
      accTensor.dispose();

      console.log(
        `trainBatch: done trainOnBatch loss=${finalLoss} acc=${finalAccuracy}`,
      );

      return {
        loss: finalLoss,
        accuracy: finalAccuracy,
      };
    } catch (error) {
      console.error('Batch training failed:', error);
      throw error;
    }
  }

  /**
   * Evaluate model on test data
   * @param {tf.LayersModel} model - TensorFlow.js model
   * @param {tf.Tensor} X_test - Test input data
   * @param {tf.Tensor} y_test - Test labels
   * @param {number} batchSize - Batch size
   * @returns {Object} Evaluation results
   */
  async evaluateModel(model, X_test, y_test, batchSize = 32) {
    try {
      console.log('Evaluating model...');

      const numSamples = X_test.shape[0];
      const numBatches = Math.ceil(numSamples / batchSize);

      let totalLoss = 0;
      let totalAccuracy = 0;
      let processedSamples = 0;

      for (let batch = 0; batch < numBatches; batch++) {
        const start = batch * batchSize;
        const end = Math.min(start + batchSize, numSamples);

        // Get batch data
        const X_batch = X_test.slice(
          [start, 0, 0, 0],
          [end - start, -1, -1, -1],
        );
        const y_batch = y_test.slice([start, 0], [end - start, -1]);

        // Evaluate batch
        const batchResults = await this.evaluateBatch(model, X_batch, y_batch);

        totalLoss += batchResults.loss * (end - start);
        totalAccuracy += batchResults.accuracy * (end - start);
        processedSamples += end - start;

        // Dispose of batch tensors
        X_batch.dispose();
        y_batch.dispose();
      }

      const finalLoss = totalLoss / processedSamples;
      const finalAccuracy = totalAccuracy / processedSamples;

      console.log(
        `Evaluation completed - Loss: ${finalLoss.toFixed(
          4,
        )}, Accuracy: ${finalAccuracy.toFixed(4)}`,
      );

      return {
        loss: finalLoss,
        accuracy: finalAccuracy,
      };
    } catch (error) {
      console.error('Evaluation failed:', error);
      throw error;
    }
  }

  /**
   * Evaluate model on a single batch
   * @param {tf.LayersModel} model - TensorFlow.js model
   * @param {tf.Tensor} X_batch - Batch input data
   * @param {tf.Tensor} y_batch - Batch labels
   * @returns {Object} Batch results
   */
  async evaluateBatch(model, X_batch, y_batch) {
    try {
      // Use model.evaluate instead of manual prediction
      const results = await model.evaluate(X_batch, y_batch, {
        verbose: 0,
        batchSize: X_batch.shape[0],
      });

      // Extract loss and accuracy values
      const lossValue = Array.isArray(results)
        ? await results[0].data()
        : await results.data();
      const accuracyValue =
        Array.isArray(results) && results.length > 1
          ? await results[1].data()
          : [0]; // Default accuracy if not available

      // Dispose results tensors
      if (Array.isArray(results)) {
        results.forEach(tensor => tensor.dispose());
      } else {
        results.dispose();
      }

      return {
        loss: lossValue[0] || lossValue,
        accuracy: accuracyValue[0] || accuracyValue,
      };
    } catch (error) {
      console.error('Batch evaluation failed:', error);
      throw error;
    }
  }

  /**
   * Calculate accuracy
   * @param {tf.Tensor} y_true - True labels
   * @param {tf.Tensor} y_pred - Predicted labels
   * @returns {tf.Tensor} Accuracy
   */
  calculateAccuracy(y_true, y_pred) {
    const predictedClasses = tf.argMax(y_pred, 1);
    const trueClasses = tf.argMax(y_true, 1);
    const correct = tf.equal(predictedClasses, trueClasses);
    const accuracy = tf.mean(tf.cast(correct, 'float32'));

    // Dispose of intermediate tensors
    predictedClasses.dispose();
    trueClasses.dispose();
    correct.dispose();

    return accuracy;
  }

  /**
   * Prepare training data
   * @param {tf.Tensor} X - Input data
   * @param {tf.Tensor} y - Labels
   * @param {number} validationSplit - Validation split ratio
   * @returns {Object} Prepared data
   */
  prepareTrainingData(X, y, validationSplit = 0.1) {
    try {
      if (validationSplit <= 0) {
        return {
          X_train_processed: X,
          y_train_processed: y,
          X_val: null,
          y_val: null,
        };
      }

      const numSamples = X.shape[0];
      const numValSamples = Math.floor(numSamples * validationSplit);
      const numTrainSamples = numSamples - numValSamples;

      // Split data
      const X_train = X.slice([0, 0, 0, 0], [numTrainSamples, -1, -1, -1]);
      const y_train = y.slice([0, 0], [numTrainSamples, -1]);
      const X_val = X.slice(
        [numTrainSamples, 0, 0, 0],
        [numValSamples, -1, -1, -1],
      );
      const y_val = y.slice([numTrainSamples, 0], [numValSamples, -1]);

      return {
        X_train_processed: X_train,
        y_train_processed: y_train,
        X_val: X_val,
        y_val: y_val,
      };
    } catch (error) {
      console.error('Failed to prepare training data:', error);
      throw error;
    }
  }

  /**
   * Get training status
   * @returns {Object} Training status
   */
  getTrainingStatus() {
    return {
      isTraining: this.isTraining,
      currentEpoch: this.currentEpoch,
      currentBatch: this.currentBatch,
      historyLength: this.trainingHistory.length,
    };
  }

  /**
   * Get training history
   * @returns {Array} Training history
   */
  getTrainingHistory() {
    return this.trainingHistory;
  }

  /**
   * Clear training history
   */
  clearHistory() {
    this.trainingHistory = [];
    console.log('Training history cleared');
  }

  /**
   * Stop training
   */
  stopTraining() {
    this.isTraining = false;
    console.log('Training stopped');
  }
}

export default TrainingEngine;
