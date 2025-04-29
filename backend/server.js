import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Debug: Log environment variables to verify
console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? 'Loaded' : 'Not loaded');
console.log('GOOGLE_API_KEY (partial):', process.env.GOOGLE_API_KEY ? `${process.env.GOOGLE_API_KEY.slice(0, 8)}...` : 'Not set');
console.log('PORT:', process.env.PORT || 5001);

// Dynamically import chatbotRoutes after dotenv.config()
const { default: chatbotRoutes } = await import('./routes/chatbot.js');

const app = express();

// Middleware
app.use(cors({ 
  origin: ['http://localhost:8080', 'http://127.0.0.1:5500']
}));
app.use(express.json());

// Configuration
const JWT_SECRET = "your_secret_key_keep_it_safe";

// MongoDB Connection
mongoose.connect("mongodb://127.0.0.1:27017/lms")
.then(() => console.log("✅ Connected to MongoDB"))
.catch(err => {
  console.error("❌ MongoDB connection error:", err);
  process.exit(1);
});


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

// Schemas
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'instructor', 'admin'], default: 'student' },
  profile: {
    fullName: String,
    email: String,
    avatar: String,
    bio: String,
    skills: [String]
  },
  enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  completedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  createdAt: { type: Date, default: Date.now }
});

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

const CourseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, required: true },
  image: { type: String, required: true },
  duration: { type: String, required: true },
  objectives: { type: [String], required: true },
  requirements: { type: [String], required: true },
  curriculum: [{
    title: { type: String, required: true },
    lectures: [{
      title: { type: String, required: true },
      duration: { type: String, required: true },
      type: { type: String, required: true }
    }]
  }],
  instructor: {
    name: { type: String, required: true },
    bio: { type: String, required: true },
    image: { type: String, required: true }
  },
  reviews: {
    average: { type: Number, required: true },
    count: { type: Number, required: true },
    items: [{
      userName: { type: String, required: true },
      userImage: { type: String, required: true },
      date: { type: String, required: true },
      rating: { type: Number, required: true },
      content: { type: String, required: true }
    }]
  },
  createdAt: { type: Date, default: Date.now }
});

const InterviewSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: String,
  domain: String,
  startTime: { type: Date, default: Date.now },
  endTime: Date,
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

// Models
const User = mongoose.model('User', UserSchema);
const Session = mongoose.model('Session', SessionSchema);
const Course = mongoose.model('Course', CourseSchema);
const InterviewSession = mongoose.model('InterviewSession', InterviewSessionSchema);

// Question Bank
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

// Helper functions
const extractKeywords = (text) => {
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
};

const analyzeSentiment = (text) => {
  const positiveWords = ['good', 'great', 'excellent', 'positive', 'happy'];
  const negativeWords = ['bad', 'poor', 'negative', 'unhappy', 'worst'];
  
  const words = text.toLowerCase().split(/\s+/);
  let score = 0;
  
  words.forEach(word => {
    if (positiveWords.includes(word)) score += 1;
    if (negativeWords.includes(word)) score -= 1;
  });
  
  return Math.max(-1, Math.min(1, score / 5));
};

const calculateOverallAnalysis = (session) => {
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
};

const average = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

const calculateTimeManagement = (session) => {
  const times = session.questions
    .filter(q => q.endTime)
    .map((q, i) => {
      const prevEnd = i > 0 ? session.questions[i-1].endTime : session.startTime;
      return (q.endTime - prevEnd) / 1000;
    });
  
  const avgTime = average(times);
  const variance = Math.sqrt(average(times.map(t => Math.pow(t - avgTime, 2))));
  return Math.max(1, 10 - variance / 5);
};

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

// Routes
app.use('/api/chatbot', chatbotRoutes);

// User Authentication
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "❌ Username already exists." });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: "✅ User registered successfully!" });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "❌ Registration failed. Please try again." });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: "❌ Invalid username or password." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "❌ Invalid username or password." });
    }

    const sessionId = uuidv4();
    const token = jwt.sign(
      { id: user._id, username, sessionId }, 
      JWT_SECRET,
      { expiresIn: '24h' }
    );

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

    res.status(200).json({
      message: "✅ Login successful!",
      token,
      sessionId,
      userId: user._id,
      username: user.username,
      role: user.role
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ error: "❌ Something went wrong." });
  }
});

// Logout Endpoint
app.post("/logout", authenticateToken, async (req, res) => {
  try {
    await Session.updateOne(
      { sessionId: req.user.sessionId, isActive: true },
      { $set: { isActive: false, endTime: new Date() } }
    );
    res.status(200).json({ message: "✅ Logout successful" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "❌ Logout failed" });
  }
});

// Interview Endpoints
app.post("/interview/start", authenticateToken, async (req, res) => {
  try {
    const { domain } = req.body;
    if (!QUESTION_BANK[domain]) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid domain selected" 
      });
    }

    const sessionId = uuidv4();
    const questions = [...QUESTION_BANK[domain]]
      .sort(() => 0.5 - Math.random())
      .slice(0, 5);

    const session = new InterviewSession({
      sessionId,
      userId: req.user.id,
      username: req.user.username,
      domain,
      questions: questions.map(q => ({ question: q })),
      startTime: new Date()
    });
    
    await session.save();

    res.status(200).json({
      success: true,
      sessionId,
      firstQuestion: questions[0],
      totalQuestions: questions.length
    });
  } catch (err) {
    console.error("Error starting interview:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to start interview session",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

app.post("/interview/answer", authenticateToken, async (req, res) => {
  try {
    const { sessionId, questionIndex, answer } = req.body;
    const session = await InterviewSession.findOne({ sessionId, userId: req.user.id });
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    
    if (questionIndex >= session.questions.length) {
      return res.status(400).json({ error: "Invalid question index" });
    }
    
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
        fluency: Math.min(10, Math.floor(wordCount / 10))
      }
    };
    
    await session.save();
    
    if (questionIndex < session.questions.length - 1) {
      res.status(200).json({
        success: true,
        nextQuestion: session.questions[questionIndex + 1].question,
        nextIndex: questionIndex + 1
      });
    } else {
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

app.get("/interview/results/:sessionId", authenticateToken, async (req, res) => {
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

// Course Endpoints
app.post("/courses", async (req, res) => {
  try {
    const courseData = req.body;
    const newCourse = new Course(courseData);
    await newCourse.save();
    res.status(201).json({ message: "✅ Course added!", courseId: newCourse._id });
  } catch (err) {
    console.error("❌ Error adding course:", err);
    res.status(500).json({ error: "❌ Failed to add course." });
  }
});

app.get("/courses", async (req, res) => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: "❌ Failed to retrieve courses." });
  }
});

app.get("/courses/:id", async (req, res) => {
  try {
    const courseId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ error: "Invalid course ID" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    res.json(course);
  } catch (err) {
    console.error("Error fetching course:", err);
    res.status(500).json({ error: "❌ Failed to retrieve course." });
  }
});

// Error handling middleware for JSON parsing errors
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    console.error('JSON parsing error:', err.message);
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});










// import express from "express";
// import mongoose from "mongoose";
// import bcrypt from "bcrypt";
// import jwt from "jsonwebtoken";
// import bodyParser from "body-parser";
// import cors from "cors";
// import { v4 as uuidv4 } from "uuid";

// const app = express();

// // Middleware
// app.use(bodyParser.json({ limit: '50mb' }));
// app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
// app.use(cors());

// // Configuration
// const JWT_SECRET = "your_secret_key_keep_it_safe";
// const PORT = 5001;

// // MongoDB Connection
// mongoose.connect("mongodb://127.0.0.1:27017/lms", {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// })
// .then(() => console.log("✅ Connected to MongoDB"))
// .catch(err => {
//   console.error("❌ MongoDB connection error:", err);
//   process.exit(1);
// });

// // Authentication Middleware
// const authenticateToken = (req, res, next) => {
//   const authHeader = req.headers['authorization'];
//   const token = authHeader && authHeader.split(' ')[1];
  
//   if (!token) return res.status(401).json({ error: "❌ Access denied. Token required." });
  
//   jwt.verify(token, JWT_SECRET, (err, user) => {
//     if (err) return res.status(403).json({ error: "❌ Invalid or expired token." });
//     req.user = user;
//     next();
//   });
// };

// // Schemas
// const UserSchema = new mongoose.Schema({
//   username: { type: String, required: true, unique: true },
//   password: { type: String, required: true },
//   role: { type: String, enum: ['student', 'instructor', 'admin'], default: 'student' },
//   profile: {
//     fullName: String,
//     email: String,
//     avatar: String,
//     bio: String,
//     skills: [String]
//   },
//   enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
//   completedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
//   createdAt: { type: Date, default: Date.now }
// });

// const SessionSchema = new mongoose.Schema({
//   sessionId: { type: String, required: true, unique: true },
//   userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//   username: String,
//   isActive: { type: Boolean, default: true },
//   userAgent: String,
//   ipAddress: String,
//   startTime: { type: Date, default: Date.now },
//   endTime: Date,
//   lastActivity: { type: Date, default: Date.now }
// });

// const CourseSchema = new mongoose.Schema({
//   title: { type: String, required: true },
//   description: { type: String, required: true },
//   content: { type: String, required: true },
//   category: { type: String, required: true },
//   image: { type: String, required: true },
//   duration: { type: String, required: true },
//   objectives: { type: [String], required: true },
//   requirements: { type: [String], required: true },
//   curriculum: [{
//     title: { type: String, required: true },
//     lectures: [{
//       title: { type: String, required: true },
//       duration: { type: String, required: true },
//       type: { type: String, required: true }
//     }]
//   }],
//   instructor: {
//     name: { type: String, required: true },
//     bio: { type: String, required: true },
//     image: { type: String, required: true }
//   },
//   reviews: {
//     average: { type: Number, required: true },
//     count: { type: Number, required: true },
//     items: [{
//       userName: { type: String, required: true },
//       userImage: { type: String, required: true },
//       date: { type: String, required: true },
//       rating: { type: Number, required: true },
//       content: { type: String, required: true }
//     }]
//   },
//   createdAt: { type: Date, default: Date.now }
// });

// const InterviewSessionSchema = new mongoose.Schema({
//   sessionId: { type: String, required: true, unique: true },
//   userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//   username: String,
//   domain: String,
//   startTime: { type: Date, default: Date.now },
//   endTime: Date,
//   questions: [{
//     question: String,
//     answer: String,
//     startTime: Date,
//     endTime: Date,
//     analysis: {
//       sentiment: Number,
//       keywords: [String],
//       wordCount: Number,
//       fluency: Number
//     }
//   }],
//   overallAnalysis: {
//     communication: Number,
//     technical: Number,
//     confidence: Number,
//     timeManagement: Number
//   },
//   malpracticeFlags: [{
//     type: String,
//     timestamp: Date,
//     evidence: String
//   }],
//   recordingUrl: String,
//   isCompleted: { type: Boolean, default: false }
// });

// // Models
// const User = mongoose.model('User', UserSchema);
// const Session = mongoose.model('Session', SessionSchema);
// const Course = mongoose.model('Course', CourseSchema);
// const InterviewSession = mongoose.model('InterviewSession', InterviewSessionSchema);

// // Question Bank
// const QUESTION_BANK = {
//   "dsa": [
//     "Explain the time complexity of quicksort.",
//     "How would you implement a hash table from scratch?",
//     "What are the differences between BFS and DFS?",
//     "Explain the concept of dynamic programming with an example."
//   ],
//   "backend": [
//     "Explain RESTful API design principles.",
//     "How would you handle database migrations in a production environment?",
//     "What are the advantages of using microservices architecture?",
//     "Explain JWT authentication flow."
//   ],
//   "frontend": [
//     "Explain the virtual DOM in React.",
//     "What are the differences between CSS Grid and Flexbox?",
//     "How would you optimize a web application's performance?",
//     "Explain the component lifecycle in React."
//   ],
//   "fullstack": [
//     "How would you design a scalable web application architecture?",
//     "Explain the challenges of maintaining state between frontend and backend.",
//     "What strategies would you use for API versioning?",
//     "How would you implement real-time features in a web application?"
//   ]
// };

// // Helper functions
// const extractKeywords = (text) => {
//   const commonWords = new Set(['the', 'and', 'is', 'of', 'in', 'to', 'a', 'that', 'it']);
//   const words = text.toLowerCase().split(/\s+/);
//   const freq = {};
  
//   words.forEach(word => {
//     if (!commonWords.has(word) && word.length > 3) {
//       freq[word] = (freq[word] || 0) + 1;
//     }
//   });
  
//   return Object.entries(freq)
//     .sort((a, b) => b[1] - a[1])
//     .slice(0, 5)
//     .map(([word]) => word);
// };

// const analyzeSentiment = (text) => {
//   const positiveWords = ['good', 'great', 'excellent', 'positive', 'happy'];
//   const negativeWords = ['bad', 'poor', 'negative', 'unhappy', 'worst'];
  
//   const words = text.toLowerCase().split(/\s+/);
//   let score = 0;
  
//   words.forEach(word => {
//     if (positiveWords.includes(word)) score += 1;
//     if (negativeWords.includes(word)) score -= 1;
//   });
  
//   return Math.max(-1, Math.min(1, score / 5));
// };

// const calculateOverallAnalysis = (session) => {
//   const techScores = session.questions.map(q => 
//     q.analysis.keywords.length * 2 + q.analysis.wordCount / 10
//   );
//   const commScores = session.questions.map(q => 
//     q.analysis.fluency + (q.analysis.sentiment + 1) * 5
//   );
  
//   return {
//     communication: average(commScores),
//     technical: average(techScores),
//     confidence: average(session.questions.map(q => q.analysis.sentiment * 5 + 5)),
//     timeManagement: calculateTimeManagement(session)
//   };
// };

// const average = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

// const calculateTimeManagement = (session) => {
//   const times = session.questions
//     .filter(q => q.endTime)
//     .map((q, i) => {
//       const prevEnd = i > 0 ? session.questions[i-1].endTime : session.startTime;
//       return (q.endTime - prevEnd) / 1000;
//     });
  
//   const avgTime = average(times);
//   const variance = Math.sqrt(average(times.map(t => Math.pow(t - avgTime, 2))));
//   return Math.max(1, 10 - variance / 5);
// };

// const updateLastActivity = async (sessionId) => {
//   if (!sessionId) return;
//   try {
//     await Session.updateOne(
//       { sessionId, isActive: true },
//       { $set: { lastActivity: new Date() } }
//     );
//   } catch (err) {
//     console.error("Error updating session activity:", err);
//   }
// };

// // Routes

// // User Authentication
// app.post("/register", async (req, res) => {
//   try {
//     const { username, password } = req.body;
//     const existingUser = await User.findOne({ username });
//     if (existingUser) {
//       return res.status(400).json({ error: "❌ Username already exists." });
//     }
    
//     const hashedPassword = await bcrypt.hash(password, 10);
//     const user = new User({ username, password: hashedPassword });
//     await user.save();
//     res.status(201).json({ message: "✅ User registered successfully!" });
//   } catch (err) {
//     console.error("Registration error:", err);
//     res.status(500).json({ error: "❌ Registration failed. Please try again." });
//   }
// });

// app.post("/login", async (req, res) => {
//   try {
//     const { username, password } = req.body;
//     const user = await User.findOne({ username });
//     if (!user) {
//       return res.status(400).json({ error: "❌ Invalid username or password." });
//     }

//     const isPasswordValid = await bcrypt.compare(password, user.password);
//     if (!isPasswordValid) {
//       return res.status(400).json({ error: "❌ Invalid username or password." });
//     }

//     const sessionId = uuidv4();
//     const token = jwt.sign(
//       { id: user._id, username, sessionId }, 
//       JWT_SECRET,
//       { expiresIn: '24h' }
//     );

//     const session = new Session({
//       sessionId,
//       userId: user._id,
//       username: user.username,
//       isActive: true,
//       userAgent: req.headers['user-agent'],
//       ipAddress: req.ip,
//       startTime: new Date()
//     });
//     await session.save();

//     res.status(200).json({
//       message: "✅ Login successful!",
//       token,
//       sessionId,
//       userId: user._id,
//       username: user.username,
//       role: user.role
//     });
//   } catch (err) {
//     console.error("❌ Login error:", err);
//     res.status(500).json({ error: "❌ Something went wrong." });
//   }
// });

// // Interview Endpoints
// app.post("/interview/start", authenticateToken, async (req, res) => {
//   try {
//     const { domain } = req.body;
//     if (!QUESTION_BANK[domain]) {
//       return res.status(400).json({ 
//         success: false,
//         error: "Invalid domain selected" 
//       });
//     }

//     const sessionId = uuidv4();
//     const questions = [...QUESTION_BANK[domain]]
//       .sort(() => 0.5 - Math.random())
//       .slice(0, 5);

//     const session = new InterviewSession({
//       sessionId,
//       userId: req.user.id,
//       username: req.user.username,
//       domain,
//       questions: questions.map(q => ({ question: q })),
//       startTime: new Date()
//     });
    
//     await session.save();

//     res.status(200).json({
//       success: true,
//       sessionId,
//       firstQuestion: questions[0],
//       totalQuestions: questions.length
//     });
//   } catch (err) {
//     console.error("Error starting interview:", err);
//     res.status(500).json({ 
//       success: false,
//       error: "Failed to start interview session",
//       details: process.env.NODE_ENV === 'development' ? err.message : undefined
//     });
//   }
// });

// app.post("/interview/answer", authenticateToken, async (req, res) => {
//   try {
//     const { sessionId, questionIndex, answer } = req.body;
//     const session = await InterviewSession.findOne({ sessionId, userId: req.user.id });
//     if (!session) {
//       return res.status(404).json({ error: "Session not found" });
//     }
    
//     if (questionIndex >= session.questions.length) {
//       return res.status(400).json({ error: "Invalid question index" });
//     }
    
//     const wordCount = answer.split(/\s+/).length;
//     const keywords = extractKeywords(answer);
//     const sentiment = analyzeSentiment(answer);
    
//     session.questions[questionIndex] = {
//       ...session.questions[questionIndex],
//       answer,
//       endTime: new Date(),
//       analysis: {
//         sentiment,
//         keywords,
//         wordCount,
//         fluency: Math.min(10, Math.floor(wordCount / 10))
//       }
//     };
    
//     await session.save();
    
//     if (questionIndex < session.questions.length - 1) {
//       res.status(200).json({
//         success: true,
//         nextQuestion: session.questions[questionIndex + 1].question,
//         nextIndex: questionIndex + 1
//       });
//     } else {
//       const overallAnalysis = calculateOverallAnalysis(session);
//       session.overallAnalysis = overallAnalysis;
//       session.isCompleted = true;
//       session.endTime = new Date();
//       await session.save();
      
//       res.status(200).json({
//         success: true,
//         completed: true,
//         analysis: overallAnalysis
//       });
//     }
//   } catch (err) {
//     console.error("Error submitting answer:", err);
//     res.status(500).json({ error: "Failed to submit answer" });
//   }
// });

// app.get("/interview/results/:sessionId", authenticateToken, async (req, res) => {
//   try {
//     const session = await InterviewSession.findOne({ 
//       sessionId: req.params.sessionId,
//       userId: req.user.id 
//     });
    
//     if (!session) {
//       return res.status(404).json({ error: "Session not found" });
//     }
    
//     if (!session.isCompleted) {
//       return res.status(400).json({ error: "Interview not completed yet" });
//     }
    
//     res.status(200).json({
//       success: true,
//       results: {
//         domain: session.domain,
//         startTime: session.startTime,
//         endTime: session.endTime,
//         duration: (session.endTime - session.startTime) / 60000,
//         questions: session.questions,
//         overallAnalysis: session.overallAnalysis,
//         malpracticeFlags: session.malpracticeFlags
//       }
//     });
//   } catch (err) {
//     console.error("Error getting results:", err);
//     res.status(500).json({ error: "Failed to get results" });
//   }
// });

// // Course Endpoints
// app.post("/courses", async (req, res) => {
//   try {
//     const courseData = req.body;
//     const newCourse = new Course(courseData);
//     await newCourse.save();
//     res.status(201).json({ message: "✅ Course added!", courseId: newCourse._id });
//   } catch (err) {
//     console.error("❌ Error adding course:", err);
//     res.status(500).json({ error: "❌ Failed to add course." });
//   }
// });

// app.get("/courses", async (req, res) => {
//   try {
//     const courses = await Course.find();
//     res.json(courses);
//   } catch (err) {
//     res.status(500).json({ error: "❌ Failed to retrieve courses." });
//   }
// });

// app.get("/courses/:id", async (req, res) => {
//   try {
//     const courseId = req.params.id;
//     if (!mongoose.Types.ObjectId.isValid(courseId)) {
//       return res.status(400).json({ error: "Invalid course ID" });
//     }

//     const course = await Course.findById(courseId);
//     if (!course) {
//       return res.status(404).json({ error: "Course not found" });
//     }
//     res.json(course);
//   } catch (err) {
//     console.error("Error fetching course:", err);
//     res.status(500).json({ error: "❌ Failed to retrieve course." });
//   }
// });

// // Start Server
// app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));


