#!/usr/bin/env python3
"""
AI Skin Disease Detection Model Training Script (Corrected & Production-leaning)
Python 3.12+ | TensorFlow 2.17–2.19 compatible | CUDA 12+

Key improvements vs previous version:
- Consistent checkpointing/early-stopping on the same metric (val_loss)
- Proper save format (.keras) + SavedModel export
- Optional hold-out TEST set (expects dataset/test/ if available)
- Test-Time Augmentation (TTA) + "Unknown/Uncertain" mapping
- Confidence threshold applied in evaluation and provided utility for inference
- Correct class-name ordering for confusion matrix/report
- Label smoothing to mitigate noisy labels
- Non-interactive CLI (no input() prompt). Use flags instead.
"""

import os
import sys
import json
import argparse
from pathlib import Path
from datetime import datetime

import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, regularizers
from tensorflow.keras.applications import EfficientNetV2S
from tensorflow.keras.applications.efficientnet_v2 import preprocess_input as mobilenet_preprocess
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import (
    EarlyStopping,
    ReduceLROnPlateau,
    ModelCheckpoint,
    TensorBoard,
    Callback,
)
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.utils.class_weight import compute_class_weight
import matplotlib.pyplot as plt
import seaborn as sns

# =============================================================================
# CONFIGURATION
# =============================================================================

class Config:
    # Image & Training Parameters
    IMG_SIZE = 224
    BATCH_SIZE = 32
    EPOCHS_PHASE1 = 20
    EPOCHS_PHASE2 = 30
    VALIDATION_SPLIT = 0.2

    # Hold-out TEST: If directory dataset/test exists, it's used.
    # Otherwise, test evaluation is skipped with a warning.
    TEST_DIR_NAME = 'test'

    # Learning Rates
    LR_INITIAL = 1e-3
    LR_FINETUNE = 1e-5  # Must be very small to preserve ImageNet pretrained weights

    # Uncertainty Threshold
    CONFIDENCE_THRESHOLD = 0.65  # Below this => "Unknown/Uncertain"

    # Paths
    DATASET_PATH = 'dataset/'         # expects class-subfolders
    MODEL_DIR = '/content/drive/MyDrive/model/'
    LOGS_DIR = '/content/drive/MyDrive/logs/'

    # Augmentation Strength: 'low' | 'medium' | 'high'
    AUGMENTATION_STRENGTH = 'medium'

    # Test-Time Augmentation
    USE_TTA = True
    TTA_STEPS = 5

CONFIG = Config()

# =============================================================================
# GPU CONFIGURATION
# =============================================================================

def configure_gpu():
    """Configure GPU with memory growth and mixed precision if GPU present."""
    print("\n" + "="*70)
    print("GPU & SYSTEM CONFIGURATION")
    print("="*70)
    print(f"Python Version: {sys.version}")
    print(f"TensorFlow Version: {tf.__version__}")
    print(f"Keras Version: {keras.__version__}")

    gpus = tf.config.list_physical_devices('GPU')
    if gpus:
        try:
            print(f"\n✓ GPU(s) detected: {len(gpus)}")
            for i, gpu in enumerate(gpus):
                print(f"  GPU {i}: {gpu.name}")
                tf.config.experimental.set_memory_growth(gpu, True)
            print("✓ GPU memory growth enabled")
            try:
                bi = tf.sysconfig.get_build_info()
                print(f"✓ CUDA Version: {bi.get('cuda_version', 'unknown')}")
                print(f"✓ cuDNN Version: {bi.get('cudnn_version', 'unknown')}")
            except Exception:
                pass
        except RuntimeError as e:
            print(f"⚠ GPU configuration error: {e}")
        # Mixed precision
        try:
            keras.mixed_precision.set_global_policy('mixed_float16')
            print("✓ Mixed precision training enabled (mixed_float16)")
        except Exception as e:
            print(f"⚠ Mixed precision not available: {e}")
    else:
        print("⚠ No GPU detected - training will use CPU (slower)")
        print("  For GPU support, ensure CUDA 12+ and cuDNN 8.9+ are installed")
    print("="*70 + "\n")

# =============================================================================
# DATA ANALYSIS & CLASS DETECTION
# =============================================================================

def analyze_dataset(dataset_path):
    """Auto-detect classes and analyze dataset distribution."""
    print("Analyzing dataset structure...")

    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Dataset not found at '{dataset_path}'")

    class_folders = sorted([
        d for d in os.listdir(dataset_path)
        if os.path.isdir(os.path.join(dataset_path, d))
        and not d.startswith('.')
        and d != CONFIG.TEST_DIR_NAME  # exclude explicit test directory
    ])

    if len(class_folders) == 0:
        raise RuntimeError(f"No class folders found in '{dataset_path}'")

    class_distribution = {}
    total_images = 0

    print(f"\n✓ Found {len(class_folders)} disease classes:")
    print("-" * 70)
    for cls in class_folders:
        cls_path = os.path.join(dataset_path, cls)
        images = [
            f for f in os.listdir(cls_path)
            if f.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp'))
        ]
        count = len(images)
        class_distribution[cls] = count
        total_images += count
        print(f"  {cls:.<50} {count:>6} images")
    print("-" * 70)
    print(f"  {'TOTAL':.<50} {total_images:>6} images")

    counts = list(class_distribution.values())
    max_count = max(counts)
    min_count = min(counts) if counts else 0
    imbalance_ratio = (max_count / min_count) if min_count > 0 else 0

    print(f"\n  Imbalance Ratio: {imbalance_ratio:.2f}x")
    if imbalance_ratio > 5:
        print("  ⚠ HIGH imbalance detected - using class weights")
    elif imbalance_ratio > 2:
        print("  ⚠ Moderate imbalance - using class weights")
    else:
        print("  ✓ Dataset is relatively balanced")
    print("="*70 + "\n")

    return class_folders, class_distribution, total_images

# =============================================================================
# ADVANCED DATA AUGMENTATION
# =============================================================================

def get_data_generators(dataset_path, validation_split, augmentation_strength='high'):
    """Create training/validation generators. Optional test generator if test dir exists."""
    print(f"Creating data generators (augmentation: {augmentation_strength})...")

    aug_params = {
        'low':    dict(rotation_range=10, width_shift_range=0.1, height_shift_range=0.1,
                       zoom_range=0.1, shear_range=0.0, brightness_range=[0.9, 1.1]),
        'medium': dict(rotation_range=20, width_shift_range=0.15, height_shift_range=0.15,
                       zoom_range=0.15, shear_range=0.1, brightness_range=[0.85, 1.15]),
        'high':   dict(rotation_range=40, width_shift_range=0.25, height_shift_range=0.25,
                       zoom_range=0.25, shear_range=0.2, brightness_range=[0.7, 1.3]),
    }
    params = aug_params[augmentation_strength]

    # FIX: Use MobileNetV2's preprocess_input (scales to [-1,1]) NOT rescale=1./255
    train_datagen = ImageDataGenerator(
        preprocessing_function=mobilenet_preprocess,
        rotation_range=params['rotation_range'],
        width_shift_range=params['width_shift_range'],
        height_shift_range=params['height_shift_range'],
        horizontal_flip=True,
        vertical_flip=True,
        zoom_range=params['zoom_range'],
        shear_range=params['shear_range'],
        brightness_range=params['brightness_range'],
        channel_shift_range=20.0,
        fill_mode='reflect',
        validation_split=validation_split
    )

    # FIX: Validation must also use preprocess_input, NOT rescale=1./255
    val_datagen = ImageDataGenerator(
        preprocessing_function=mobilenet_preprocess,
        validation_split=validation_split
    )

    train_generator = train_datagen.flow_from_directory(
        dataset_path,
        target_size=(CONFIG.IMG_SIZE, CONFIG.IMG_SIZE),
        batch_size=CONFIG.BATCH_SIZE,
        class_mode='categorical',
        subset='training',
        shuffle=True,
        seed=42
    )

    val_generator = val_datagen.flow_from_directory(
        dataset_path,
        target_size=(CONFIG.IMG_SIZE, CONFIG.IMG_SIZE),
        batch_size=CONFIG.BATCH_SIZE,
        class_mode='categorical',
        subset='validation',
        shuffle=False,
        seed=42
    )

    print(f"✓ Training samples: {train_generator.samples}")
    print(f"✓ Validation samples: {val_generator.samples}")
    print(f"✓ Classes detected: {train_generator.num_classes}")

    # Save class indices
    class_indices = train_generator.class_indices
    Path(CONFIG.MODEL_DIR).mkdir(parents=True, exist_ok=True)
    with open(os.path.join(CONFIG.MODEL_DIR, 'class_indices.json'), 'w') as f:
        json.dump(class_indices, f, indent=2)
    print(f"✓ Class indices saved to {CONFIG.MODEL_DIR}class_indices.json\n")

    # Optional TEST generator if dataset/test/ exists
    test_dir = os.path.join(dataset_path, CONFIG.TEST_DIR_NAME)
    test_generator = None
    if os.path.isdir(test_dir):
        test_datagen = ImageDataGenerator(preprocessing_function=mobilenet_preprocess)  # FIX: was rescale=1./255
        test_generator = test_datagen.flow_from_directory(
            test_dir,
            target_size=(CONFIG.IMG_SIZE, CONFIG.IMG_SIZE),
            batch_size=CONFIG.BATCH_SIZE,
            class_mode='categorical',
            shuffle=False
        )
        print(f"✓ Test samples: {test_generator.samples}")
    else:
        print(f"⚠ No explicit test directory found at '{test_dir}'. Test evaluation will be skipped.\n")

    return train_generator, val_generator, test_generator, class_indices

# =============================================================================
# CLASS WEIGHTS
# =============================================================================

def compute_class_weights_from_generator(generator):
    """Compute class weights to handle imbalanced datasets."""
    print("Computing class weights for imbalanced data...")
    labels = generator.classes
    class_weights_array = compute_class_weight(
        class_weight='balanced',
        classes=np.unique(labels),
        y=labels
    )
    class_weights = dict(enumerate(class_weights_array))

    # Pretty print with names
    idx_to_class = {v: k for k, v in generator.class_indices.items()}
    print("✓ Class weights computed:")
    for idx, weight in class_weights.items():
        print(f"  {idx_to_class[idx]:.<50} {weight:.4f}")
    print()
    return class_weights

# =============================================================================
# MODEL
# =============================================================================

def create_model(num_classes):
    """Create robust MobileNetV2 model with regularization and label smoothing."""
    print("\nBuilding model architecture...")

    base_model = EfficientNetV2S(
    input_shape=(224, 224, 3),   # EfficientNetB3 prefers 300x300
    include_top=False,
    weights='imagenet'
)
    base_model.trainable = False  # freeze initially

    inputs = keras.Input(shape=(CONFIG.IMG_SIZE, CONFIG.IMG_SIZE, 3))
    x = base_model(inputs, training=False)
    x = layers.GlobalAveragePooling2D()(x)

    # FIX: Removed excessive regularization — l2(0.01) + stacked Dropout(0.4/0.5/0.3) was
    # preventing the model from learning. Simplified to one dense layer with light regularization.
    x = layers.Dense(
        512, activation='relu',
        kernel_regularizer=regularizers.l2(1e-4),  # was l2(0.01) — 100x too strong
        kernel_initializer='he_normal'
    )(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(0.4)(x)
    x = layers.Dense(256, activation='relu',
                 kernel_regularizer=regularizers.l2(1e-4),
                 kernel_initializer='he_normal')(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(num_classes, activation='softmax', dtype='float32')(x)

    model = keras.Model(inputs, outputs)
    print("✓ Model architecture created")
    print(f"  Total parameters: {model.count_params():,}")
    return model, base_model

# =============================================================================
# CALLBACKS
# =============================================================================

class TrainingProgressCallback(Callback):
    """Custom callback to show detailed training progress."""
    def on_epoch_begin(self, epoch, logs=None):
        print(f"\n{'='*70}\nEpoch {epoch + 1}/{self.params.get('epochs', '?')}\n{'='*70}")
    def on_epoch_end(self, epoch, logs=None):
        logs = logs or {}
        print("\nResults:")
        print(f"  Loss: {logs.get('loss', 0):.4f} | Acc: {logs.get('accuracy', 0):.4f}")
        print(f"  Val Loss: {logs.get('val_loss', 0):.4f} | Val Acc: {logs.get('val_accuracy', 0):.4f}")
        if 'top_3_accuracy' in logs:
            print(f"  Top-3 Acc: {logs.get('top_3_accuracy', 0):.4f}")
        print(f"{'='*70}")

def compile_model(model, lr):
    """Compile with label smoothing to reduce noise sensitivity."""
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=lr),
        loss=keras.losses.CategoricalCrossentropy(label_smoothing=0.1),
        metrics=[
            'accuracy',
            keras.metrics.TopKCategoricalAccuracy(k=3, name='top_3_accuracy')
        ]
    )

# =============================================================================
# TRAINING PHASES
# =============================================================================

def train_phase1(model, train_gen, val_gen, class_weights):
    print("\n" + "="*70)
    print("PHASE 1: TRAINING WITH FROZEN BASE MODEL")
    print("="*70)

    compile_model(model, CONFIG.LR_INITIAL)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    callbacks = [
        TrainingProgressCallback(),
        EarlyStopping(monitor='val_loss', patience=7, restore_best_weights=True, verbose=1),
        ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=3, min_lr=1e-7, verbose=1),
        ModelCheckpoint(
            os.path.join(CONFIG.MODEL_DIR, 'best_phase1.keras'),
            monitor='val_loss', save_best_only=True, verbose=1
        ),
        TensorBoard(log_dir=os.path.join(CONFIG.LOGS_DIR, f'{timestamp}_phase1'), histogram_freq=1)
    ]

    history = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=CONFIG.EPOCHS_PHASE1,
        callbacks=callbacks,
        class_weight=class_weights,
        verbose=0
    )
    print("\n✓ Phase 1 completed")
    return history

def train_phase2(model, base_model, train_gen, val_gen, class_weights):
    print("\n" + "="*70)
    print("PHASE 2: FINE-TUNING UNFROZEN LAYERS")
    print("="*70)

    # FIX: Unfreeze only last 30 layers (was 40% of all layers — too many, destroys features)
    base_model.trainable = True
    for layer in base_model.layers[:-30]:
        layer.trainable = False
    for layer in base_model.layers[-30:]:
        layer.trainable = True
    trainable_params = np.sum([np.prod(w.shape) for w in model.trainable_weights])
    print(f"✓ Trainable parameters: {trainable_params:,}")

    compile_model(model, CONFIG.LR_FINETUNE)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    callbacks = [
        TrainingProgressCallback(),
        EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True, verbose=1),
        ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=5, min_lr=1e-8, verbose=1),
        ModelCheckpoint(
            os.path.join(CONFIG.MODEL_DIR, 'best_phase2.keras'),
            monitor='val_loss', save_best_only=True, verbose=1
        ),
        TensorBoard(log_dir=os.path.join(CONFIG.LOGS_DIR, f'{timestamp}_phase2'), histogram_freq=1)
    ]

    history = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=CONFIG.EPOCHS_PHASE2,
        callbacks=callbacks,
        class_weight=class_weights,
        verbose=0
    )
    print("\n✓ Phase 2 completed")
    return history

# =============================================================================
# TTA & UNKNOWN
# =============================================================================

def predict_with_tta(model, x_batch, steps=5):
    """Return averaged probabilities over simple random augmentations."""
    preds = []
    for _ in range(steps):
        xb = tf.image.random_flip_left_right(x_batch)
        xb = tf.image.random_brightness(xb, 0.1)
        xb = tf.image.random_contrast(xb, 0.9, 1.1)
        preds.append(model(xb, training=False))
    return tf.reduce_mean(tf.stack(preds), axis=0).numpy()

def map_unknown(probs, threshold, class_names):
    idx = int(np.argmax(probs))
    conf = float(probs[idx])
    if conf < threshold:
        return "Unknown/Uncertain", conf
    return class_names[idx], conf

# =============================================================================
# EVALUATION
# =============================================================================

def evaluate_model(model, generator, class_indices, split_name="Validation", use_tta=False):
    """Evaluate on a generator, create confusion matrix and metrics."""
    print("\n" + "="*70)
    print(f"MODEL EVALUATION — {split_name.upper()}")
    print("="*70)

    generator.reset()
    # Predict probabilities
    if use_tta:
        # Collect all batches to numpy (ensure not too big)
        y_prob_list = []
        for bx, _ in generator:
            y_prob_list.append(predict_with_tta(model, bx, steps=CONFIG.TTA_STEPS))
            if len(y_prob_list) * generator.batch_size >= generator.samples:
                break
        y_pred_probs = np.vstack(y_prob_list)
    else:
        y_pred_probs = model.predict(generator, verbose=1)

    y_pred = np.argmax(y_pred_probs, axis=1)
    y_true = generator.classes

    # Proper class-name ordering by index
    idx_to_class = {v: k for k, v in class_indices.items()}
    class_names = [idx_to_class[i] for i in range(len(idx_to_class))]

    # Classification report
    print("\nClassification Report:")
    print("-" * 70)
    report = classification_report(y_true, y_pred, target_names=class_names, digits=4)
    print(report)

    # Save report
    report_path = os.path.join(CONFIG.MODEL_DIR, f'{split_name.lower()}_classification_report.txt')
    with open(report_path, 'w') as f:
        f.write(report)
    print(f"✓ Report saved to {report_path}")

    # Confusion matrix
    cm = confusion_matrix(y_true, y_pred, labels=list(range(len(class_names))))
    plt.figure(figsize=(max(12, len(class_names) * 0.6), max(10, len(class_names) * 0.5)))
    sns.heatmap(
        cm, annot=True, fmt='d', cmap='Blues',
        xticklabels=class_names, yticklabels=class_names,
        cbar_kws={'label': 'Count'}
    )
    plt.title(f'Confusion Matrix — {split_name}', fontsize=16, fontweight='bold')
    plt.ylabel('True Label', fontsize=12)
    plt.xlabel('Predicted Label', fontsize=12)
    plt.xticks(rotation=45, ha='right')
    plt.yticks(rotation=0)
    plt.tight_layout()
    cm_path = os.path.join(CONFIG.MODEL_DIR, f'{split_name.lower()}_confusion_matrix.png')
    plt.savefig(cm_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"✓ Confusion matrix saved to {cm_path}")

    # Accuracy
    accuracy = float(np.mean(y_pred == y_true))
    print(f"✓ {split_name} Accuracy: {accuracy:.4f} ({accuracy*100:.2f}%)")

    # Unknown/Uncertain count
    max_probs = np.max(y_pred_probs, axis=1)
    uncertain_mask = max_probs < CONFIG.CONFIDENCE_THRESHOLD
    uncertain_count = int(np.sum(uncertain_mask))
    print(f"✓ Predictions below threshold ({CONFIG.CONFIDENCE_THRESHOLD}): {uncertain_count}/{len(y_true)}")
    print(f"  These would be returned as 'Unknown/Uncertain' in production.\n")

    return accuracy

# =============================================================================
# TRAINING HISTORY PLOT
# =============================================================================

def plot_training_history(history1, history2):
    acc = history1.history['accuracy'] + history2.history['accuracy']
    val_acc = history1.history['val_accuracy'] + history2.history['val_accuracy']
    loss = history1.history['loss'] + history2.history['loss']
    val_loss = history1.history['val_loss'] + history2.history['val_loss']

    phase1_epochs = len(history1.history['accuracy'])
    epochs_range = range(len(acc))

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6))

    ax1.plot(epochs_range, acc, label='Training', linewidth=2)
    ax1.plot(epochs_range, val_acc, label='Validation', linewidth=2)
    ax1.axvline(x=phase1_epochs, linestyle='--', label='Fine-tuning starts', linewidth=2)
    ax1.set_title('Model Accuracy', fontsize=14, fontweight='bold')
    ax1.set_xlabel('Epoch'); ax1.set_ylabel('Accuracy'); ax1.legend(loc='lower right'); ax1.grid(True, alpha=0.3)

    ax2.plot(epochs_range, loss, label='Training', linewidth=2)
    ax2.plot(epochs_range, val_loss, label='Validation', linewidth=2)
    ax2.axvline(x=phase1_epochs, linestyle='--', label='Fine-tuning starts', linewidth=2)
    ax2.set_title('Model Loss', fontsize=14, fontweight='bold')
    ax2.set_xlabel('Epoch'); ax2.set_ylabel('Loss'); ax2.legend(loc='upper right'); ax2.grid(True, alpha=0.3)

    plt.tight_layout()
    out_path = os.path.join(CONFIG.MODEL_DIR, 'training_history.png')
    plt.savefig(out_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"✓ Training history saved to {out_path}")

# =============================================================================
# MAIN
# =============================================================================

def main(args):
    print("\n" + "="*70)
    print("AI SKIN DISEASE DETECTION - PRODUCTION TRAINING")
    print(f"Python {sys.version.split()[0]} | TensorFlow {tf.__version__}")
    print("="*70)

    # Seeds
    np.random.seed(42)
    tf.random.set_seed(42)

    # Dirs
    Path(CONFIG.MODEL_DIR).mkdir(parents=True, exist_ok=True)
    Path(CONFIG.LOGS_DIR).mkdir(parents=True, exist_ok=True)

    # GPU
    configure_gpu()

    # Dataset analysis
    analyze_dataset(CONFIG.DATASET_PATH)

    # Generators
    train_gen, val_gen, test_gen, class_indices = get_data_generators(
        CONFIG.DATASET_PATH, CONFIG.VALIDATION_SPLIT, CONFIG.AUGMENTATION_STRENGTH
    )

    # Class weights
    class_weights = compute_class_weights_from_generator(train_gen)

    # Model
    model, base_model = create_model(train_gen.num_classes)

    # Config print
    print("\n" + "="*70)
    print("TRAINING CONFIGURATION")
    print("="*70)
    print(f"  Image Size: {CONFIG.IMG_SIZE}x{CONFIG.IMG_SIZE}")
    print(f"  Batch Size: {CONFIG.BATCH_SIZE}")
    print(f"  Phase 1 Epochs: {CONFIG.EPOCHS_PHASE1}")
    print(f"  Phase 2 Epochs: {CONFIG.EPOCHS_PHASE2}")
    print(f"  Initial LR: {CONFIG.LR_INITIAL}")
    print(f"  Fine-tune LR: {CONFIG.LR_FINETUNE}")
    print(f"  Augmentation: {CONFIG.AUGMENTATION_STRENGTH}")
    print(f"  Confidence Threshold: {CONFIG.CONFIDENCE_THRESHOLD}")
    print(f"  Use TTA: {CONFIG.USE_TTA} (steps={CONFIG.TTA_STEPS})")
    print("="*70 + "\n")

    # Train
    start_time = datetime.now()
    print(f"🚀 Training started at {start_time.strftime('%Y-%m-%d %H:%M:%S')}")

    try:
        history1 = train_phase1(model, train_gen, val_gen, class_weights)
        history2 = train_phase2(model, base_model, train_gen, val_gen, class_weights)

        # Save final model (.keras) + SavedModel
        final_keras = os.path.join(CONFIG.MODEL_DIR, 'model_final.keras')
        model.save(final_keras)
        print(f"\n✓ Final Keras model saved: {final_keras}")
        savedmodel_dir = os.path.join(CONFIG.MODEL_DIR, 'savedmodel')
        model.export(savedmodel_dir) if hasattr(model, "export") else model.save(savedmodel_dir, save_format='tf')
        print(f"✓ SavedModel exported to: {savedmodel_dir}")

        # Plots
        plot_training_history(history1, history2)

        # Evaluate on validation (with TTA if requested)
        val_acc = evaluate_model(model, val_gen, class_indices, split_name="Validation", use_tta=CONFIG.USE_TTA)

        # Evaluate on test if available
        test_acc = None
        if test_gen is not None:
            test_acc = evaluate_model(model, test_gen, class_indices, split_name="Test", use_tta=CONFIG.USE_TTA)

        end_time = datetime.now()
        duration = end_time - start_time
        print("\n" + "="*70)
        print("✅ TRAINING COMPLETED SUCCESSFULLY!")
        print("="*70)
        print(f"  Started:  {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"  Finished: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"  Duration: {duration}")
        print(f"  Final Val Accuracy: {val_acc:.4f} ({val_acc*100:.2f}%)")
        if test_acc is not None:
            print(f"  Final Test Accuracy: {test_acc:.4f} ({test_acc*100:.2f}%)")
        print(f"\n  Model (.keras): {final_keras}")
        print(f"  SavedModel: {savedmodel_dir}")
        print(f"  Class Indices: {CONFIG.MODEL_DIR}class_indices.json")
        print(f"  Confusion Matrices: {CONFIG.MODEL_DIR}[validation_confusion_matrix.png, test_confusion_matrix.png*]")
        print(f"  Training Plot: {CONFIG.MODEL_DIR}training_history.png")
        print("="*70 + "\n")

        if val_acc >= 0.95:
            print("🎉 TARGET ACHIEVED: Validation accuracy ≥ 95%!")
        else:
            print("⚠ Target not reached. Consider more data/augmentation/epochs or alternative backbones (e.g., EfficientNetV2).")

    except KeyboardInterrupt:
        print("\n⚠ Training interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Training failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Train a skin disease classifier.")
    parser.add_argument('--dataset', type=str, default=CONFIG.DATASET_PATH,
                        help="Path to dataset directory containing class subfolders. Optional 'test/' folder for hold-out test.")
    parser.add_argument('--img-size', type=int, default=CONFIG.IMG_SIZE)
    parser.add_argument('--batch-size', type=int, default=CONFIG.BATCH_SIZE)
    parser.add_argument('--aug', type=str, default=CONFIG.AUGMENTATION_STRENGTH, choices=['low','medium','high'])
    parser.add_argument('--tta', action='store_true', default=CONFIG.USE_TTA, help="Enable Test-Time Augmentation for evaluation.")
    parser.add_argument('--tta-steps', type=int, default=CONFIG.TTA_STEPS)
    parser.add_argument('--conf-thr', type=float, default=CONFIG.CONFIDENCE_THRESHOLD, help="Unknown/Uncertain confidence threshold.")
    args = parser.parse_args()

    # Allow overriding config via CLI without changing class definition
    CONFIG.DATASET_PATH = args.dataset
    CONFIG.IMG_SIZE = args.img_size
    CONFIG.BATCH_SIZE = args.batch_size
    CONFIG.AUGMENTATION_STRENGTH = args.aug
    CONFIG.USE_TTA = args.tta
    CONFIG.TTA_STEPS = args.tta_steps
    CONFIG.CONFIDENCE_THRESHOLD = args.conf_thr

    main(args)