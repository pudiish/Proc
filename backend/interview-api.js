import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const PORT = 5003;

// Enhanced CORS configuration
const corsOptions = {
  origin: ['http://localhost', 'http://127.0.0.1'], // Add your frontend origins here
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight for all routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
const MONGODB_URI = 'mongodb://localhost:27017/interviewDB';
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'uploads/interviews');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + extension);
    }
});

const upload = multer({ storage });

// Interview Schema and Model
const interviewSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    position: {
        type: String,
        required: true
    },
    interviewType: {
        type: String,
        required: true,
        enum: ['technical', 'behavioral', 'hr', 'coding']
    },
    difficulty: {
        type: String,
        required: true,
        enum: ['beginner', 'intermediate', 'advanced']
    },
    duration: {
        type: Number,
        required: true
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: {
        type: Date
    },
    completed: {
        type: Boolean,
        default: false
    },
    questions: [{
        question: String,
        answer: String,
        score: Number,
        feedback: String,
        strengths: [String],
        weaknesses: [String],
        duration: Number
    }],
    warnings: [{
        message: String,
        type: String,
        severity: String,
        time: Date
    }],
    warningCount: {
        type: Number,
        default: 0
    },
    totalScore: {
        type: Number,
        default: 0
    },
    feedback: {
        type: String
    },
    recordingPath: {
        type: String
    },
    deviceInfo: {
        browser: String,
        os: String,
        resolution: String
    }
});

const Interview = mongoose.model('Interview', interviewSchema);

// Add middleware to set headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});

// Routes
app.get('/api/questions', async (req, res) => {
    try {
        const questionBanks = {
            technical: {
                beginner: [
                    "Explain the difference between == and === in JavaScript.",
                    "What is the DOM and how do you interact with it?",
                    "Describe the CSS box model.",
                    "What is the difference between let, const, and var in JavaScript?",
                    "Explain what a responsive design is."
                ],
                intermediate: [
                    "What are closures in JavaScript and how do they work?",
                    "Explain how prototypal inheritance works in JavaScript.",
                    "Describe the differences between synchronous and asynchronous code in JavaScript.",
                    "What are Promises and how do they help with asynchronous operations?",
                    "Explain the concept of REST APIs and their principles."
                ],
                advanced: [
                    "Implement a function to find the longest palindromic substring in a string.",
                    "Create an LRU (Least Recently Used) cache with O(1) time complexity for both get and put operations.",
                    "Write an algorithm to solve the N-Queens problem.",
                    "Implement a function to serialize and deserialize a binary tree.",
                    "Create an algorithm to find the shortest path in a weighted graph."
                ]
            },
            behavioral: {
                beginner: [
                    "Tell me about a time when you worked effectively under pressure.",
                    "How do you handle meeting tight deadlines?",
                    "Describe a situation where you had to work as part of a team.",
                    "How do you prioritize your work?",
                    "Tell me about a time when you had to learn something quickly."
                ],
                intermediate: [
                    "Describe a situation where you had to deal with a difficult coworker or client.",
                    "Tell me about a time when you had to lead a project.",
                    "How have you handled disagreements with team members?",
                    "Describe a time when you had to adapt to a significant change at work.",
                    "Tell me about a time when you failed at something and what you learned from it."
                ],
                advanced: [
                    "Describe a situation where you had to make an unpopular decision.",
                    "Tell me about a time when you had to handle multiple competing priorities.",
                    "How have you dealt with stakeholders with conflicting requirements?",
                    "Describe a time when you went above and beyond what was expected of you.",
                    "Tell me about a time when you had to handle a crisis situation."
                ]
            },
            hr: {
                beginner: [
                    "Why are you interested in this position?",
                    "What do you know about our company?",
                    "What is your expected salary range?",
                    "How did you hear about this position?",
                    "What is your ideal work environment?"
                ],
                intermediate: [
                    "Why should we hire you for this position?",
                    "What are your career goals and how does this position align with them?",
                    "Describe your ideal manager and management style.",
                    "What motivates you in your work?",
                    "How do you stay updated with industry trends?"
                ],
                advanced: [
                    "What value can you bring to our company that other candidates might not?",
                    "How do you maintain work-life balance?",
                    "Tell me about a time when you went above and beyond in your role.",
                    "What questions do you have for me about the company or role?",
                    "How do you define success in your career?"
                ]
            },
            coding: {
                beginner: [
                    "Write a function to check if a string is a palindrome.",
                    "Create a function that finds the maximum number in an array.",
                    "Write code to reverse a string without using built-in reverse functions.",
                    "Create a function that counts the occurrence of each character in a string.",
                    "Write a function to check if two strings are anagrams."
                ],
                intermediate: [
                    "Implement a function to find the first non-repeating character in a string.",
                    "Write code to detect if a linked list has a cycle.",
                    "Implement a queue using two stacks.",
                    "Create a function that finds all pairs in an array that sum to a specific target.",
                    "Write a function to validate a binary search tree."
                ],
                advanced: [
                    "Implement a function to find the longest palindromic substring in a string.",
                    "Create an LRU (Least Recently Used) cache with O(1) time complexity for both get and put operations.",
                    "Write an algorithm to solve the N-Queens problem.",
                    "Implement a function to serialize and deserialize a binary tree.",
                    "Create an algorithm to find the shortest path in a weighted graph."
                ]
            }
        };
        
        res.json({ success: true, questionBanks });
    } catch (error) {
        console.error('Error fetching question banks:', error);
        res.status(500).json({ success: false, message: 'Error fetching question banks' });
    }
});

app.post('/api/interviews/start', async (req, res) => {
    try {
        const { userId, position, interviewType, difficulty, duration, deviceInfo } = req.body;
        
        if (!userId || !position || !interviewType || !difficulty || !duration) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        
        const interview = new Interview({
            userId,
            position,
            interviewType,
            difficulty,
            duration,
            startTime: new Date(),
            questions: [],
            deviceInfo
        });
        
        await interview.save();
        
        res.json({ 
            success: true, 
            message: 'Interview session started', 
            interviewId: interview._id 
        });
    } catch (error) {
        console.error('Error starting interview:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error starting interview',
            error: error.message 
        });
    }
});

app.post('/api/interviews/:interviewId/question', async (req, res) => {
    try {
        const { interviewId } = req.params;
        const { question, answer, duration } = req.body;
        
        if (!question || !answer) {
            return res.status(400).json({ success: false, message: 'Missing question or answer' });
        }
        
        const interview = await Interview.findById(interviewId);
        if (!interview) {
            return res.status(404).json({ success: false, message: 'Interview not found' });
        }
        
        // Analyze answer (simulated)
        const analysis = await analyzeAnswer(question, answer);
        
        interview.questions.push({
            question,
            answer,
            score: analysis.score,
            feedback: analysis.feedback,
            strengths: analysis.strengths,
            weaknesses: analysis.weaknesses,
            duration: duration || 0
        });
        
        await interview.save();
        
        res.json({
            success: true,
            message: 'Answer recorded',
            questionFeedback: analysis
        });
    } catch (error) {
        console.error('Error recording answer:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error recording answer',
            error: error.message 
        });
    }
});

app.post('/api/interviews/:interviewId/warning', async (req, res) => {
    try {
        const { interviewId } = req.params;
        const { message, type, severity } = req.body;
        
        if (!message) {
            return res.status(400).json({ success: false, message: 'Warning message is required' });
        }
        
        const interview = await Interview.findById(interviewId);
        if (!interview) {
            return res.status(404).json({ success: false, message: 'Interview not found' });
        }
        
        interview.warnings.push({
            message,
            type: type || 'general',
            severity: severity || 'medium',
            time: new Date()
        });
        
        interview.warningCount += 1;
        
        await interview.save();
        
        res.json({
            success: true,
            message: 'Warning recorded',
            warningCount: interview.warningCount
        });
    } catch (error) {
        console.error('Error recording warning:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error recording warning',
            error: error.message 
        });
    }
});

app.post('/api/interviews/:interviewId/end', async (req, res) => {
    try {
        const { interviewId } = req.params;
        const { recordingPath } = req.body;

        const interview = await Interview.findById(interviewId);
        if (!interview) {
            return res.status(404).json({ success: false, message: 'Interview not found' });
        }

        interview.completed = true;
        interview.endTime = new Date();
        interview.recordingPath = recordingPath;

        // Calculate scores and generate feedback
        const analysis = await generateFinalFeedback(interview);
        interview.totalScore = analysis.totalScore;
        interview.feedback = analysis.overallFeedback;

        await interview.save();

        res.json({
            success: true,
            message: 'Interview ended successfully',
            interview: {
                id: interview._id,
                totalScore: interview.totalScore,
                warningCount: interview.warningCount,
                feedback: interview.feedback,
                duration: Math.round((interview.endTime - interview.startTime) / 60000),
                questions: interview.questions
            }
        });
    } catch (error) {
        console.error('Error ending interview:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error ending interview',
            error: error.message 
        });
    }
});

app.post('/api/interviews/:interviewId/upload', upload.single('recording'), async (req, res) => {
    try {
        const { interviewId } = req.params;
        
        const interview = await Interview.findById(interviewId);
        if (!interview) {
            return res.status(404).json({ success: false, message: 'Interview not found' });
        }

        interview.recordingPath = req.file.path;
        await interview.save();

        res.json({
            success: true,
            message: 'Recording uploaded successfully',
            filePath: req.file.path
        });
    } catch (error) {
        console.error('Error uploading recording:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error uploading recording',
            error: error.message 
        });
    }
});

app.get('/api/interviews/:interviewId', async (req, res) => {
    try {
        const { interviewId } = req.params;
        
        const interview = await Interview.findById(interviewId);
        if (!interview) {
            return res.status(404).json({ success: false, message: 'Interview not found' });
        }

        res.json({
            success: true,
            interview
        });
    } catch (error) {
        console.error('Error fetching interview:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching interview',
            error: error.message 
        });
    }
});

// Helper functions
async function analyzeAnswer(question, answer) {
    // Simulate AI analysis with a delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const score = Math.floor(Math.random() * 36) + 60; // Random score between 60-95
    const strengths = [
        "Clear and concise explanation",
        "Demonstrated practical knowledge",
        "Provided relevant examples",
        "Structured answer logically"
    ].sort(() => 0.5 - Math.random()).slice(0, 2);
    
    const weaknesses = [
        "Could provide more specific examples",
        "Answer could be more concise",
        "Technical terminology could be more precise"
    ].sort(() => 0.5 - Math.random()).slice(0, 2);
    
    return { 
        score, 
        strengths, 
        weaknesses,
        feedback: `Your answer scored ${score}/100. ${strengths.join(' ')} ${weaknesses.join(' ')}`
    };
}

async function generateFinalFeedback(interview) {
    const totalScore = interview.questions.reduce((sum, q) => sum + (q.score || 0), 0) / interview.questions.length;
    
    let overallFeedback = '';
    if (totalScore >= 90) {
        overallFeedback = 'Excellent performance! You demonstrated strong knowledge and communication skills.';
    } else if (totalScore >= 75) {
        overallFeedback = 'Good performance with some areas for improvement.';
    } else if (totalScore >= 60) {
        overallFeedback = 'Fair performance. Needs more depth in technical knowledge.';
    } else {
        overallFeedback = 'Needs significant improvement in both knowledge and communication.';
    }
    
    if (interview.warningCount > 0) {
        overallFeedback += ` You received ${interview.warningCount} warnings during the interview.`;
    }
    
    return { totalScore, overallFeedback };
}

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});