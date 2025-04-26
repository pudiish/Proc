import express from "express";
import mongoose from "mongoose";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { ObjectId } from "mongodb";


import jwt from "jsonwebtoken";
const JWT_SECRET = "your_secret_key"; // Must match server.js

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



const router = express.Router();



// Interview Question Bank (can be expanded)
const QUESTION_BANK = {
  "dsa": [
    "Explain the time complexity of quicksort.",
    "How would you implement a hash table from scratch?",
    "What are the differences between BFS and DFS?",
    "Explain the concept of dynamic programming with an example."
  ],
  "backend": [
    "Explain RESTful API design principles.",
    "How would you handle database migrations in a production environment?",
    "What are the advantages of using microservices architecture?",
    "Explain JWT authentication flow."
  ],
  "frontend": [
    "Explain the virtual DOM in React.",
    "What are the differences between CSS Grid and Flexbox?",
    "How would you optimize a web application's performance?",
    "Explain the component lifecycle in React."
  ],
  "fullstack": [
    "How would you design a scalable web application architecture?",
    "Explain the challenges of maintaining state between frontend and backend.",
    "What strategies would you use for API versioning?",
    "How would you implement real-time features in a web application?"
  ]
};

// Interview Session Schema
const InterviewSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: String,
  domain: String,
  startTime: { type: Date, default: Date.now },
  endTime: Date,
  terminationReason: String,
  questions: [{
    question: String,
    answer: String,
    startTime: Date,
    endTime: Date,
    analysis: {
      sentiment: Number,
      keywords: [String],
      wordCount: Number,
      fluency: Number
    }
  }],
  overallAnalysis: {
    communication: Number,
    technical: Number,
    confidence: Number,
    timeManagement: Number
  },
  malpracticeFlags: [{
    type: String,
    timestamp: Date,
    evidence: String
  }],
  recordingUrl: String,
  isCompleted: { type: Boolean, default: false }
});
const InterviewSession = mongoose.model('InterviewSession', InterviewSessionSchema);

// Start a new interview session
router.post('/start', authenticateToken, async (req, res) => {
  try {
      console.log('Received interview start request:', req.body);
      console.log('From user:', req.user);
    
    const { domain } = req.body;
    console.log("Requested domain:", domain); // Debug log

    // Validate domain exists in question bank
    if (!QUESTION_BANK[domain]) {
      console.error("Invalid domain requested:", domain);
      return res.status(400).json({ 
        success: false,
        error: "Invalid domain selected" 
      });
    }

    const sessionId = uuidv4();
    const questions = [...QUESTION_BANK[domain]]
      .sort(() => 0.5 - Math.random())
      .slice(0, 5);

    console.log("Selected questions:", questions); // Debug log

    const session = new InterviewSession({
      sessionId,
      userId: req.user.id,
      username: req.user.username,
      domain,
      questions: questions.map(q => ({ question: q })),
      startTime: new Date()
    });

    console.log("Session to be saved:", session); // Debug log
    
    await session.save();
    console.log("Session saved successfully"); // Debug log

    res.status(200).json({
      success: true,
      sessionId,
      firstQuestion: questions[0],
      totalQuestions: questions.length
    });

  } catch (err) {
    console.error("Detailed error starting interview:", err); // More detailed error
    res.status(500).json({ 
      success: false,
      error: "Failed to start interview session",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});
// Submit answer for current question
router.post('/answer', authenticateToken, async (req, res) => {
  try {
    const { sessionId, questionIndex, answer } = req.body;
    
    const session = await InterviewSession.findOne({ sessionId, userId: req.user.id });
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    
    if (questionIndex >= session.questions.length) {
      return res.status(400).json({ error: "Invalid question index" });
    }
    
    // Simple analysis (in a real app, you'd use NLP APIs)
    const wordCount = answer.split(/\s+/).length;
    const keywords = extractKeywords(answer);
    const sentiment = analyzeSentiment(answer);
    
    session.questions[questionIndex] = {
      ...session.questions[questionIndex],
      answer,
      endTime: new Date(),
      analysis: {
        sentiment,
        keywords,
        wordCount,
        fluency: Math.min(10, Math.floor(wordCount / 10)) // Simple fluency metric
      }
    };
    
    await session.save();
    
    // Return next question or end session
    if (questionIndex < session.questions.length - 1) {
      res.status(200).json({
        success: true,
        nextQuestion: session.questions[questionIndex + 1].question,
        nextIndex: questionIndex + 1
      });
    } else {
      // Calculate overall scores
      const overallAnalysis = calculateOverallAnalysis(session);
      session.overallAnalysis = overallAnalysis;
      session.isCompleted = true;
      session.endTime = new Date();
      await session.save();
      
      res.status(200).json({
        success: true,
        completed: true,
        analysis: overallAnalysis
      });
    }
    
  } catch (err) {
    console.error("Error submitting answer:", err);
    res.status(500).json({ error: "Failed to submit answer" });
  }
});

// Log malpractice detection
router.post('/malpractice', authenticateToken, async (req, res) => {
  try {
    const { sessionId, type, evidence } = req.body;
    
    const session = await InterviewSession.findOne({ sessionId, userId: req.user.id });
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    
    session.malpracticeFlags.push({
      type,
      timestamp: new Date(),
      evidence
    });
    
    await session.save();
    
    res.status(200).json({ success: true });
    
  } catch (err) {
    console.error("Error logging malpractice:", err);
    res.status(500).json({ error: "Failed to log malpractice" });
  }
});

// Get interview results
router.get('/results/:sessionId', authenticateToken, async (req, res) => {
  try {
    const session = await InterviewSession.findOne({ 
      sessionId: req.params.sessionId,
      userId: req.user.id 
    });
    
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    
    if (!session.isCompleted) {
      return res.status(400).json({ error: "Interview not completed yet" });
    }
    
    res.status(200).json({
      success: true,
      results: {
        domain: session.domain,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: (session.endTime - session.startTime) / 60000,
        questions: session.questions,
        overallAnalysis: session.overallAnalysis,
        malpracticeFlags: session.malpracticeFlags
      }
    });
    
  } catch (err) {
    console.error("Error getting results:", err);
    res.status(500).json({ error: "Failed to get results" });
  }
});

// Helper functions
function extractKeywords(text) {
  // Simple implementation - in production use NLP APIs
  const commonWords = new Set(['the', 'and', 'is', 'of', 'in', 'to', 'a', 'that', 'it']);
  const words = text.toLowerCase().split(/\s+/);
  const freq = {};
  
  words.forEach(word => {
    if (!commonWords.has(word) && word.length > 3) {
      freq[word] = (freq[word] || 0) + 1;
    }
  });
  
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

function analyzeSentiment(text) {
  // Simple sentiment analysis - in production use NLP APIs
  const positiveWords = ['good', 'great', 'excellent', 'positive', 'happy'];
  const negativeWords = ['bad', 'poor', 'negative', 'unhappy', 'worst'];
  
  const words = text.toLowerCase().split(/\s+/);
  let score = 0;
  
  words.forEach(word => {
    if (positiveWords.includes(word)) score += 1;
    if (negativeWords.includes(word)) score -= 1;
  });
  
  return Math.max(-1, Math.min(1, score / 5));
}

function calculateOverallAnalysis(session) {
  const techScores = session.questions.map(q => 
    q.analysis.keywords.length * 2 + q.analysis.wordCount / 10
  );
  const commScores = session.questions.map(q => 
    q.analysis.fluency + (q.analysis.sentiment + 1) * 5
  );
  
  return {
    communication: average(commScores),
    technical: average(techScores),
    confidence: average(session.questions.map(q => q.analysis.sentiment * 5 + 5)),
    timeManagement: calculateTimeManagement(session)
  };
}

function average(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function calculateTimeManagement(session) {
  const times = session.questions
    .filter(q => q.endTime)
    .map((q, i) => {
      const prevEnd = i > 0 ? session.questions[i-1].endTime : session.startTime;
      return (q.endTime - prevEnd) / 1000; // in seconds
    });
  
  const avgTime = average(times);
  const variance = Math.sqrt(average(times.map(t => Math.pow(t - avgTime, 2))));
  
  // Score based on consistency (lower variance is better)
  return Math.max(1, 10 - variance / 5);
}

export default router;