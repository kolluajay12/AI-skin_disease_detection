from flask import Flask, request, jsonify
import os
import numpy as np
import tensorflow as tf
from PIL import Image
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Load model ONCE
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model", "model_final.keras")
model = tf.keras.models.load_model(MODEL_PATH)

FULL_CLASS_MAP = {
    0: "Acne Vulgaris", 1: "Actinic Keratoses", 2: "Basal Cell Carcinoma",
    3: "Benign Keratosis", 4: "Cellulitis", 5: "Dermatofibroma",
    6: "Eczema", 7: "Folliculitis", 8: "Impetigo", 9: "Melanoma",
    10: "Nevus (Mole)", 11: "Psoriasis", 12: "Ringworm (Tinea)",
    13: "Rosacea", 14: "Scabies", 15: "Seborrheic Dermatitis",
    16: "Urticaria (Hives)", 17: "Vascular Lesions", 18: "Vitiligo",
    19: "Warts (HPV)"
}

ALLOWED_DISEASES = [
    "Acne Vulgaris", "Actinic Keratoses", "Basal Cell Carcinoma",
    "Eczema", "Folliculitis", "Melanoma", "Psoriasis",
    "Ringworm (Tinea)", "Vitiligo", "Warts (HPV)"
]

CONFIDENCE_THRESHOLD = 0.60

def preprocess(file):
    image = Image.open(file).convert("RGB")
    image = image.resize((224, 224))
    img = np.array(image) / 255.0
    return np.expand_dims(img, axis=0)

@app.route("/predict", methods=["POST"])
def predict():
    try:
        file = request.files["image"]
        img = preprocess(file)

        preds = model.predict(img, verbose=0)[0]
        idx = int(np.argmax(preds))
        confidence = float(preds[idx])

        raw_label = FULL_CLASS_MAP.get(idx, "Uncertain")

        if confidence >= CONFIDENCE_THRESHOLD and raw_label in ALLOWED_DISEASES:
            label = raw_label
        else:
            label = "Uncertain"

        return jsonify({
            "prediction": label,
            "confidence": round(confidence * 100, 2)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)