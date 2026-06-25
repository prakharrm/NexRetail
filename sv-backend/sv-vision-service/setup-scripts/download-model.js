// ────────────────────────────────────────────────────────────
// Download MobileNetV3-Large ONNX model from Hugging Face
// ────────────────────────────────────────────────────────────
// Run with:  npm run download-model
//
// This downloads the pre-trained MobileNetV3-Large model in
// ONNX format. The model is ~22MB. It is NOT checked into git.
// ────────────────────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modelsDir = path.join(__dirname, '..', 'models');
const modelPath = path.join(modelsDir, 'mobilenetv3.onnx');

// MobileNetV3-Large feature extractor (no classification head)
const MODEL_URL = 'https://huggingface.co/onnx-community/mobilenetv3_large_100.ra_in1k/resolve/main/onnx/model.onnx';

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    let totalBytes = 0;
    let downloadedBytes = 0;

    https.get(url, (response) => {
      // Follow redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return download(response.headers.location, dest).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      totalBytes = parseInt(response.headers['content-length'], 10) || 0;

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (totalBytes > 0) {
          const pct = ((downloadedBytes / totalBytes) * 100).toFixed(1);
          const mb = (downloadedBytes / 1024 / 1024).toFixed(1);
          process.stdout.write(`\r   Downloading: ${mb}MB / ${(totalBytes / 1024 / 1024).toFixed(1)}MB (${pct}%)`);
        }
      });

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('\n');
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function main() {
  if (fs.existsSync(modelPath)) {
    const sizeMB = (fs.statSync(modelPath).size / 1024 / 1024).toFixed(1);
    console.log(` Model already exists at models/mobilenetv3.onnx (${sizeMB}MB)`);
    return;
  }

  // Create models directory
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
  }

  console.log(' Downloading MobileNetV3-Large ONNX model...');
  console.log(`   Source: ${MODEL_URL}\n`);

  await download(MODEL_URL, modelPath);

  const sizeMB = (fs.statSync(modelPath).size / 1024 / 1024).toFixed(1);
  console.log(` Model downloaded successfully (${sizeMB}MB)`);
  console.log(`   Saved to: ${modelPath}`);
}

main().catch((err) => {
  console.error(' Download failed:', err.message);
  process.exit(1);
});
