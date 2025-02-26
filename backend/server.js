import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import cors from "cors";


const app = express();
app.use(bodyParser.json());
app.use(cors());

// MongoDB Connection
mongoose
  .connect("mongodb://127.0.0.1:27017/quizApp")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
const User = mongoose.model("User", UserSchema);

// ✅ Quiz Logs Schema
const QuizLogSchema = new mongoose.Schema({
  username: String,
  activity: String, // e.g., "Started Quiz", "Answered Question", "Completed Quiz", "Quiz Terminated"
  questionIndex: Number,
  data: Object, // Flexible data structure for various log types
  timestamp: { type: Date, default: Date.now },
});
const QuizLog = mongoose.model("QuizLog", QuizLogSchema);

// ✅ Camera Logs Schema - New Schema for Camera Activities
const CameraLogSchema = new mongoose.Schema({
  username: String,
  activity: String, // e.g., "Camera Started", "No Face Detected", "Multiple Faces", "Malpractice Detected"
  questionIndex: Number,
  data: Object, // Flexible data structure for various camera events
  timestamp: { type: Date, default: Date.now },
});
const CameraLog = mongoose.model("CameraLog", CameraLogSchema);

// ✅ Malpractice Evidence Schema - Optional for storing screenshots or additional evidence
const MalpracticeEvidenceSchema = new mongoose.Schema({
  username: String,
  quizId: String, // Could link to a specific quiz session
  evidenceType: String, // e.g., "screenshot", "object-detection-log"
  evidenceData: {}, // Could store base64 image or detection results
  detectedObjects: [String],
  confidenceScores: [Number],
  timestamp: { type: Date, default: Date.now },
});
const MalpracticeEvidence = mongoose.model("MalpracticeEvidence", MalpracticeEvidenceSchema);

// In-memory storage for logs (as a backup or for quick access)
const quizLogsMemory = [];
const cameraLogsMemory = [];

// ✅ User Registration
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: "✅ User registered successfully!" });
  } catch (err) {
    res.status(400).json({ error: "❌ User already exists or invalid data." });
  }
});

// ✅ User Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: "❌ Invalid username or password." });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(400).json({ error: "❌ Invalid username or password." });

    const token = jwt.sign({ id: user._id, username }, "your_secret_key");
    res.status(200).json({ message: "✅ Login successful!", token });
  } catch (err) {
    res.status(500).json({ error: "❌ Something went wrong." });
  }
});

// ✅ Log Quiz Activities
app.post("/quiz/log", async (req, res) => {
  try {
    // Store in memory for quick access
    const logData = req.body;
    console.log('Quiz log received:', logData);
    quizLogsMemory.push(logData);
    
    // Create a QuizLog entry with the data provided
    const log = new QuizLog(logData);
    await log.save();
    
    // Special handling for malpractice termination
    if (logData.activity === "Quiz Terminated") {
      console.log("🚨 Quiz terminated due to malpractice for user:", logData.username);
      
      // Could trigger additional actions here, like emailing an administrator
    }
    
    res.status(200).json({ success: true, message: "✅ Quiz log saved successfully!" });
  } catch (err) {
    console.error("Error saving quiz log:", err);
    res.status(500).json({ error: "❌ Failed to save quiz log." });
  }
});

// ✅ Log Camera Activities
app.post("/camera/log", async (req, res) => {
  try {
    // Store in memory for quick access
    const logData = req.body;
    console.log('Camera log received:', logData);
    cameraLogsMemory.push(logData);
    
    // Create a CameraLog entry with the data provided
    const log = new CameraLog(logData);
    await log.save();
    
    // Special handling for malpractice detection
    if (logData.activity === "Malpractice Detected") {
      console.log("🚨 Potential malpractice detected for user:", logData.username);
      
      // Save additional evidence if provided
      if (logData.evidenceData) {
        const evidence = new MalpracticeEvidence({
          username: logData.username,
          evidenceType: "object-detection-log",
          evidenceData: logData.evidenceData,
          detectedObjects: logData.data?.objects || [],
          confidenceScores: logData.data?.confidence || [],
          timestamp: logData.timestamp
        });
        await evidence.save();
      }
    }
    
    res.status(200).json({ success: true, message: "✅ Camera log saved successfully!" });
  } catch (err) {
    console.error("Error saving camera log:", err);
    res.status(500).json({ error: "❌ Failed to save camera log." });
  }
});

// ✅ Get camera logs for a specific user (admin endpoint)
app.get("/admin/camera-logs/:username", async (req, res) => {
  try {
    // This would typically be protected by authentication and authorization
    const logs = await CameraLog.find({ username: req.params.username }).sort({ timestamp: -1 });
    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({ error: "❌ Failed to retrieve camera logs." });
  }
});

// ✅ Get quiz logs for a specific user (admin endpoint)
app.get("/admin/quiz-logs/:username", async (req, res) => {
  try {
    // This would typically be protected by authentication and authorization
    const logs = await QuizLog.find({ username: req.params.username }).sort({ timestamp: -1 });
    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({ error: "❌ Failed to retrieve quiz logs." });
  }
});

// ✅ Get malpractice incidents (admin endpoint)
app.get("/admin/malpractice-incidents", async (req, res) => {
  try {
    // This would typically be protected by authentication and authorization
    const incidents = await CameraLog.find({ activity: "Malpractice Detected" }).sort({ timestamp: -1 });
    res.status(200).json(incidents);
  } catch (err) {
    res.status(500).json({ error: "❌ Failed to retrieve malpractice incidents." });
  }
});

// ✅ Endpoints to retrieve in-memory logs (for testing/debugging)
app.get("/logs/quiz", (req, res) => {
  res.status(200).json(quizLogsMemory);
});

app.get("/logs/camera", (req, res) => {
  res.status(200).json(cameraLogsMemory);
});

const PORT = 5001;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));