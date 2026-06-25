// Embedding service for MobileNetV3 feature extraction
// Generates 1280-dimensional feature embeddings from images using MobileNetV3-Large.
// Pipeline: Loads model, resizes to 224x224, normalizes, runs model, L2-normalizes.
import ort from 'onnxruntime-node';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// ImageNet normalization constants
const IMAGENET_MEAN = [0.485, 0.456, 0.406]; // R, G, B
const IMAGENET_STD = [0.229, 0.224, 0.225];

const INPUT_SIZE = 224;
const EMBEDDING_DIM = 1280; // MobileNetV3-Large feature extractor output

let session = null;
let outputName = null; // Resolved at load time from the model

/**
 * Load the ONNX model into memory.
 * Prefers the feature extractor model; falls back to the classifier model.
 */
export async function loadModel() {
  // Prefer feature extractor, fall back to classifier
  const featurePath = path.resolve(process.env.MODEL_PATH_FEATURES || './models/mobilenetv3_features.onnx');
  const classifierPath = path.resolve(process.env.MODEL_PATH || './models/mobilenetv3.onnx');

  let modelPath = null;

  if (fs.existsSync(featurePath)) {
    modelPath = featurePath;
    console.log(`Loading feature extractor model from ${modelPath}...`);
  } else if (fs.existsSync(classifierPath)) {
    console.warn(`Feature extractor not found at ${featurePath}`);
    console.warn('Run "python scripts/convert-to-features.py" to create it.');
    console.warn(`Falling back to classifier model at ${classifierPath}`);
    console.warn('WARNING: Classifier model produces class logits, not feature embeddings.');
    console.warn('Visual search quality will be significantly degraded.\n');
    modelPath = classifierPath;
  } else {
    console.warn('No model found.');
    console.warn('Run "npm run download-model" then "python scripts/convert-to-features.py".');
    console.warn('Embedding generation will be disabled.\n');
    return false;
  }

  session = await ort.InferenceSession.create(modelPath);
  outputName = session.outputNames[0];

  const inputName = session.inputNames[0];
  console.log(`Model loaded: input="${inputName}", output="${outputName}"`);
  return true;
}

/**
 * Generate an embedding from an image file.
 *
 * @param {string} imagePath - absolute path to an image file
 * @returns {Float32Array|null} - L2-normalized embedding, or null if model not loaded
 */
export async function generateEmbedding(imagePath) {
  if (!session) {
    console.warn('Model not loaded - skipping embedding generation');
    return null;
  }

  // Step 1: Resize image to 224x224
  const pixelBuffer = await sharp(imagePath)
    .resize(INPUT_SIZE, INPUT_SIZE, { fit: 'cover' })
    .removeAlpha()
    .raw()
    .toBuffer();

  // Step 2: Convert pixels to normalized float tensor
  // Model expects [1, 3, 224, 224] in CHW format
  const totalPixels = INPUT_SIZE * INPUT_SIZE;
  const float32Data = new Float32Array(3 * totalPixels);

  for (let i = 0; i < totalPixels; i++) {
    for (let c = 0; c < 3; c++) {
      const pixelValue = pixelBuffer[i * 3 + c] / 255.0;
      const normalized = (pixelValue - IMAGENET_MEAN[c]) / IMAGENET_STD[c];
      float32Data[c * totalPixels + i] = normalized;
    }
  }

  // Step 3: Run the model
  const inputTensor = new ort.Tensor('float32', float32Data, [1, 3, INPUT_SIZE, INPUT_SIZE]);
  const inputName = session.inputNames[0];
  const results = await session.run({ [inputName]: inputTensor });

  // Step 4: Extract embedding
  const embedding = results[outputName].data;

  // Step 5: L2-normalize the embedding
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  const normalized = new Float32Array(embedding.length);
  for (let i = 0; i < embedding.length; i++) {
    normalized[i] = embedding[i] / (norm + 1e-10);
  }

  return normalized;
}

/**
 * Get the embedding dimension of the loaded model.
 */
export function getEmbeddingDim() {
  return EMBEDDING_DIM;
}

/**
 * Check if the model is loaded and ready.
 */
export function isModelReady() {
  return session !== null;
}
