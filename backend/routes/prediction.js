const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
dotenv.config();

const auth = require("../middleware/auth");
const Prediction = require("../models/Prediction");

const router = express.Router();

// ==========================
// MULTER CONFIG
// ==========================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const userDir = path.join("uploads", req.user.id);

        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }

        cb(null, userDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// ==========================
// POST: Predict Disease
// ==========================
router.post("/", auth, upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        // ✅ Create formData INSIDE route
        const formData = new FormData();
        formData.append("image", fs.createReadStream(req.file.path));

        // ✅ Call Flask API
        const response = await axios.post(
            `${process.env.ML_API_URL}/predict`,
            formData,
            {
                headers: formData.getHeaders()
            }
        );

        const result = response.data;

        // ==========================
        // LOAD ADVICE JSON
        // ==========================
        const advicePath = path.join(__dirname, "../../ml/model/disease_advice.json");

        let diseaseData = {
            advice: "Consult a dermatologist.",
            severity: "medium",
            urgency: "Consultation Recommended"
        };

        if (fs.existsSync(advicePath)) {
            const adviceJson = JSON.parse(fs.readFileSync(advicePath, "utf8"));

            if (adviceJson[result.prediction]) {
                diseaseData = adviceJson[result.prediction];
            }
        }

        // ==========================
        // SAVE TO DATABASE
        // ==========================
        const prediction = new Prediction({
            userId: req.user.id,
            diseaseName: result.prediction,
            confidence: result.confidence,
            advice: diseaseData.advice,
            severity: diseaseData.severity,
            urgency: diseaseData.urgency,
            imagePath: req.file.filename
        });

        await prediction.save();

        res.json(prediction);

    } catch (error) {
        console.error("Prediction Error:", error.message);

        res.status(500).json({
            error: "Prediction failed",
            details: error.message
        });
    }
});

// ==========================
// GET: History
// ==========================
router.get("/history", auth, async (req, res) => {
    try {
        const history = await Prediction
            .find({ userId: req.user.id })
            .sort({ createdAt: -1 });

        res.json(history);

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// ==========================
// GET: Single Prediction
// ==========================
router.get("/:id", auth, async (req, res) => {
    try {
        const prediction = await Prediction.findById(req.params.id);

        if (!prediction) {
            return res.status(404).json({ msg: "Prediction not found" });
        }

        if (prediction.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: "Not authorized" });
        }

        res.json(prediction);

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// ==========================
// DELETE: Prediction
// ==========================
router.delete("/:id", auth, async (req, res) => {
    try {
        const prediction = await Prediction.findById(req.params.id);

        if (!prediction) {
            return res.status(404).json({ msg: "Prediction not found" });
        }

        if (prediction.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: "User not authorized" });
        }

        // Delete image file
        try {
            const fullImagePath = path.join(
                __dirname,
                "../uploads",
                req.user.id,
                prediction.imagePath
            );

            if (fs.existsSync(fullImagePath)) {
                fs.unlinkSync(fullImagePath);
            }
        } catch (fileErr) {
            console.warn("File deletion failed:", fileErr.message);
        }

        await Prediction.findByIdAndDelete(req.params.id);

        res.json({ msg: "Prediction removed" });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;