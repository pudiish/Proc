import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import cors from "cors";
import { v4 as uuidv4 } from "uuid"; // You'll need to install this package

const app = express();
app.use(bodyParser.json());
app.use(cors());

// JWT Secret - should be in environment variables in production
const JWT_SECRET = "your_secret_key";

// MongoDB Connection
mongoose
  .connect("mongodb://127.0.0.1:27017/quizApp")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
const User = mongoose.model("User", UserSchema);

// Session Schema - New
const SessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: String,
  isActive: { type: Boolean, default: true },
  userAgent: String,
  ipAddress: String,
  startTime: { type: Date, default: Date.now },
  endTime: Date,
  lastActivity: { type: Date, default: Date.now }
});
const Session = mongoose.model("Session", SessionSchema);

// Quiz Logs Schema
const QuizLogSchema = new mongoose.Schema({
  username: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sessionId: String,
  activity: String,
  questionIndex: Number,
  data: Object,
  timestamp: { type: Date, default: Date.now },
});
const QuizLog = mongoose.model("QuizLog", QuizLogSchema);

// Camera Logs Schema
const CameraLogSchema = new mongoose.Schema({
  username: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sessionId: String,
  activity: String,
  questionIndex: Number,
  data: Object,
  timestamp: { type: Date, default: Date.now },
});
const CameraLog = mongoose.model("CameraLog", CameraLogSchema);

// Malpractice Evidence Schema
const MalpracticeEvidenceSchema = new mongoose.Schema({
  username: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sessionId: String,
  quizId: String,
  evidenceType: String,
  evidenceData: {},
  detectedObjects: [String],
  confidenceScores: [Number],
  timestamp: { type: Date, default: Date.now },
});
const MalpracticeEvidence = mongoose.model("MalpracticeEvidence", MalpracticeEvidenceSchema);

// In-memory storage for logs (as a backup or for quick access)
const quizLogsMemory = [];
const cameraLogsMemory = [];
const activeSessions = new Map(); // Track active sessions

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: "❌ Access denied. Token required." });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "❌ Invalid or expired token." });
    
    req.user = user;
    next();
  });
};

// Update last activity for a session
const updateLastActivity = async (sessionId) => {
  if (!sessionId) return;
  
  try {
    await Session.updateOne(
      { sessionId, isActive: true },
      { $set: { lastActivity: new Date() } }
    );
  } catch (err) {
    console.error("Error updating session activity:", err);
  }
};

// User Registration
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "❌ Username already exists." });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    
    // Log the registration (even though user isn't logged in yet)
    const registrationLog = new QuizLog({
      username,
      userId: user._id,
      activity: "User Registered",
      data: {
        timestamp: new Date(),
        ipAddress: req.ip
      }
    });
    await registrationLog.save();
    
    res.status(201).json({ message: "✅ User registered successfully!" });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "❌ Registration failed. Please try again." });
  }
});

// User Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  
  try {
    console.log(`🔍 Login attempt for username: ${username}`);

    // Find user in database
    const user = await User.findOne({ username });
    if (!user) {
      console.warn(`❌ Login failed: User ${username} not found.`);
      return res.status(400).json({ error: "❌ Invalid username or password." });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.warn(`❌ Login failed: Incorrect password for user ${username}`);
      return res.status(400).json({ error: "❌ Invalid username or password." });
    }

    // Generate session ID
    const sessionId = uuidv4();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username, sessionId }, 
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Verify token structure
    if (!token || token.length < 20) {
      console.error("🚨 Token generation failed!", token);
      return res.status(500).json({ error: "❌ Failed to generate authentication token." });
    }

    console.log(`✅ Token generated for ${username}: ${token.substring(0, 10)}...`);

    // Create session in database
    const session = new Session({
      sessionId,
      userId: user._id,
      username: user.username,
      isActive: true,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
      startTime: new Date()
    });
    await session.save();

    console.log(`✅ Session created: ${sessionId} for user ${username}`);

    // Store active session in memory
    activeSessions.set(sessionId, { userId: user._id, username, startTime: new Date() });

    // Log login activity
    const loginLog = new QuizLog({
      username: user.username,
      userId: user._id,
      sessionId,
      activity: "User Login",
      data: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        timestamp: new Date()
      }
    });
    await loginLog.save();

    console.log(`📜 Login log saved for user: ${username}`);

    // Send token & session info in response
    res.status(200).json({
      message: "✅ Login successful!",
      token,
      sessionId,
      userId: user._id
    });

  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ error: "❌ Something went wrong." });
  }
});


// Verify Token Endpoint
app.post("/verify-token", authenticateToken, async (req, res) => {
  try {
    // Check if session is still active
    const session = await Session.findOne({ 
      sessionId: req.user.sessionId,
      isActive: true
    });
    
    if (!session) {
      return res.status(200).json({ valid: false });
    }
    
    // Update last activity time
    await updateLastActivity(req.user.sessionId);
    
    res.status(200).json({ valid: true, username: req.user.username });
  } catch (err) {
    console.error("Token verification error:", err);
    res.status(500).json({ valid: false, error: "❌ Verification failed." });
  }
});

// Logout Endpoint
app.post("/logout", authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.user;
    
    // Close the session
    await Session.updateOne(
      { sessionId },
      { 
        $set: { 
          isActive: false,
          endTime: new Date()
        } 
      }
    );
    
    // Remove from active sessions map
    activeSessions.delete(sessionId);
    
    // Log logout
    const logoutLog = new QuizLog({
      username: req.user.username,
      userId: req.user.id,
      sessionId,
      activity: "User Logout",
      data: {
        timestamp: new Date()
      }
    });
    await logoutLog.save();
    
    res.status(200).json({ message: "✅ Logged out successfully!" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "❌ Logout failed." });
  }
});

// Log Quiz Activities
app.post("/quiz/log", async (req, res) => {
  try {
    const logData = req.body;
    console.log('Quiz log received:', logData);
    
    // Get authentication info if available
    let userId = null;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
        
        // Update session last activity
        await updateLastActivity(decoded.sessionId);
        
        // Add sessionId to log data if not present
        if (!logData.sessionId) {
          logData.sessionId = decoded.sessionId;
        }
      } catch (err) {
        console.warn("Invalid token in log request:", err.message);
      }
    }
    
    // Add userId to log data if available
    if (userId) {
      logData.userId = userId;
    }
    
    // Store in memory for quick access
    quizLogsMemory.push(logData);
    
    // Create a QuizLog entry with the data provided
    const log = new QuizLog(logData);
    await log.save();
    
    // Special handling for quiz termination
    if (logData.activity === "Quiz Terminated") {
      console.log("🚨 Quiz terminated for user:", logData.username);
    }
    
    res.status(200).json({ success: true, message: "✅ Quiz log saved successfully!" });
  } catch (err) {
    console.error("Error saving quiz log:", err);
    res.status(500).json({ error: "❌ Failed to save quiz log." });
  }
});

// Log Camera Activities
app.post("/camera/log", authenticateToken, async (req, res) => {
  try {
    const logData = req.body;
    console.log('Camera log received:', logData);
    
    // Add authentication info
    logData.userId = req.user.id;
    logData.sessionId = req.user.sessionId;
    
    // Update session last activity
    await updateLastActivity(req.user.sessionId);
    
    // Store in memory for quick access
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
          userId: req.user.id,
          sessionId: req.user.sessionId,
          evidenceType: "object-detection-log",
          evidenceData: logData.evidenceData,
          detectedObjects: logData.data?.objects || [],
          confidenceScores: logData.data?.confidence || [],
          timestamp: logData.timestamp || new Date()
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

// Get quiz logs for a specific user by session
app.get("/user/quiz-logs/:sessionId", authenticateToken, async (req, res) => {
  try {
    // User can only see their own logs
    if (req.user.sessionId !== req.params.sessionId) {
      return res.status(403).json({ error: "❌ Access denied." });
    }
    
    const logs = await QuizLog.find({ sessionId: req.params.sessionId }).sort({ timestamp: -1 });
    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({ error: "❌ Failed to retrieve logs." });
  }
});

// Admin Endpoints (should have admin authentication middleware in production)
app.get("/admin/camera-logs/:username", async (req, res) => {
  try {
    const logs = await CameraLog.find({ username: req.params.username }).sort({ timestamp: -1 });
    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({ error: "❌ Failed to retrieve camera logs." });
  }
});

app.get("/admin/quiz-logs/:username", async (req, res) => {
  try {
    const logs = await QuizLog.find({ username: req.params.username }).sort({ timestamp: -1 });
    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({ error: "❌ Failed to retrieve quiz logs." });
  }
});

app.get("/admin/session-logs/:sessionId", async (req, res) => {
  try {
    const session = await Session.findOne({ sessionId: req.params.sessionId });
    if (!session) {
      return res.status(404).json({ error: "❌ Session not found." });
    }
    
    const quizLogs = await QuizLog.find({ sessionId: req.params.sessionId }).sort({ timestamp: 1 });
    const cameraLogs = await CameraLog.find({ sessionId: req.params.sessionId }).sort({ timestamp: 1 });
    
    res.status(200).json({
      session,
      quizLogs,
      cameraLogs
    });
  } catch (err) {
    res.status(500).json({ error: "❌ Failed to retrieve session logs." });
  }
});

app.get("/admin/active-sessions", async (req, res) => {
  try {
    const activeSessions = await Session.find({ isActive: true }).sort({ startTime: -1 });
    res.status(200).json(activeSessions);
  } catch (err) {
    res.status(500).json({ error: "❌ Failed to retrieve active sessions." });
  }
});

app.get("/admin/malpractice-incidents", async (req, res) => {
  try {
    const incidents = await CameraLog.find({ activity: "Malpractice Detected" }).sort({ timestamp: -1 });
    res.status(200).json(incidents);
  } catch (err) {
    res.status(500).json({ error: "❌ Failed to retrieve malpractice incidents." });
  }
});

// API Health Check Endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP", timestamp: new Date() });
});

const PORT = 5001;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));