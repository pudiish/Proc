// Import required modules
import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

// Get current file directory (equivalent to __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for audio/video uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/interviews');
        // Create directory if it doesn't exist
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + extension);
    }
});

const upload = multer({ storage: storage });

// Define Interview schema
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
        enum: ['behavioral', 'technical', 'both']
    },
    difficulty: {
        type: String,
        required: true,
        enum: ['easy', 'medium', 'hard']
    },
    duration: {
        type: Number,  // in minutes
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
        duration: Number  // time spent on this question in seconds
    }],
    warnings: [{
        message: String,
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
    }
});

// Create Interview model
const Interview = mongoose.model('Interview', interviewSchema);

const interviewRouter = express.Router();

// API endpoint to get question banks
interviewRouter.get('/questions', async (req, res) => {
    try {
        // This could be fetched from DB in a production environment
        // For now, returning static question banks
        const questionBanks = {
            technical: {
                easy: [
                    "Explain the difference between == and === in JavaScript.",
                    "What is the DOM and how do you interact with it?",
                    "Describe the CSS box model.",
                    "What is the difference between let, const, and var in JavaScript?",
                    "Explain what a responsive design is."
                ],
                medium: [
                    "What are closures in JavaScript and how do they work?",
                    "Explain how prototypal inheritance works in JavaScript.",
                    "Describe the differences between synchronous and asynchronous code in JavaScript.",
                    "What are Promises and how do they help with asynchronous operations?",
                    "Explain the concept of REST APIs and their principles."
                ],
                hard: [
                    "Implement a function to find the longest palindromic substring in a string.",
                    "Create an LRU (Least Recently Used) cache with O(1) time complexity for both get and put operations.",
                    "Write an algorithm to solve the N-Queens problem.",
                    "Implement a function to serialize and deserialize a binary tree.",
                    "Create an algorithm to find the shortest path in a weighted graph."
                ]
            },
            behavioral: {
                easy: [
                    "Tell me about a time when you worked effectively under pressure.",
                    "How do you handle meeting tight deadlines?",
                    "Describe a situation where you had to work as part of a team.",
                    "How do you prioritize your work?",
                    "Tell me about a time when you had to learn something quickly."
                ],
                medium: [
                    "Describe a situation where you had to deal with a difficult coworker or client.",
                    "Tell me about a time when you had to lead a project.",
                    "How have you handled disagreements with team members?",
                    "Describe a time when you had to adapt to a significant change at work.",
                    "Tell me about a time when you failed at something and what you learned from it."
                ],
                hard: [
                    "Describe a situation where you had to make an unpopular decision.",
                    "Tell me about a time when you had to handle multiple competing priorities.",
                    "How have you dealt with stakeholders with conflicting requirements?",
                    "Describe a time when you went above and beyond what was expected of you.",
                    "Tell me about a time when you had to handle a crisis situation."
                ]
            },
            both: {
                easy: [
                    "What programming languages are you most comfortable with and why?",
                    "How do you approach learning new technologies?",
                    "Describe your approach to problem-solving.",
                    "How do you ensure your code is maintainable?",
                    "Tell me about a project you're particularly proud of."
                ],
                medium: [
                    "Describe how you would design a simple web application from scratch.",
                    "How do you handle code reviews and feedback?",
                    "Tell me about a time when you had to optimize code performance.",
                    "How do you approach debugging complex issues?",
                    "Describe a situation where you had to make technical trade-offs."
                ],
                hard: [
                    "How would you design a scalable system that handles millions of users?",
                    "Describe a complex technical challenge you've faced and how you solved it.",
                    "How do you approach refactoring a large legacy codebase?",
                    "Tell me about a time when you had to make a difficult architectural decision.",
                    "How would you design a distributed system with high availability requirements?"
                ]
            }
        };
        
        res.json({ success: true, questionBanks });
    } catch (error) {
        console.error('Error fetching question banks:', error);
        res.status(500).json({ success: false, message: 'Error fetching question banks' });
    }
});

// Start a new interview session
interviewRouter.post('/start', async (req, res) => {
    try {
        const { userId, position, interviewType, difficulty, duration } = req.body;
        
        if (!userId || !position || !interviewType || !difficulty || !duration) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        
        // Create new interview record
        const interview = new Interview({
            userId,
            position,
            interviewType,
            difficulty,
            duration,
            startTime: new Date(),
            questions: []
        });
        
        // Save to database
        await interview.save();
        
        res.json({ 
            success: true, 
            message: 'Interview session started', 
            interviewId: interview._id 
        });
    } catch (error) {
        console.error('Error starting interview:', error);
        res.status(500).json({ success: false, message: 'Error starting interview' });
    }
});

// Add a question response
interviewRouter.post('/:interviewId/question', async (req, res) => {
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
        
        // Analyze answer using Puter API (simulated for now)
        // In production, you would call the AI service here
        const score = Math.floor(Math.random() * 36) + 60; // Random score between 60-95
        
        // Generate mock feedback
        const strengths = [
            "Good understanding of the concept",
            "Clear and concise explanation",
            "Provided relevant examples",
            "Structured answer logically",
            "Demonstrated practical knowledge"
        ];
        
        const weaknesses = [
            "Could provide more specific examples",
            "Answer could be more concise",
            "Consider addressing edge cases",
            "Technical terminology could be more precise",
            "Could have elaborated more on the implementation details"
        ];
        
        // Select random strengths and weaknesses
        const strengthCount = Math.floor(Math.random() * 2) + 1;
        const weaknessCount = Math.floor(Math.random() * 2) + 1;
        
        const selectedStrengths = [];
        const selectedWeaknesses = [];
        
        for (let i = 0; i < strengthCount; i++) {
            const index = Math.floor(Math.random() * strengths.length);
            selectedStrengths.push(strengths[index]);
            strengths.splice(index, 1);
        }
        
        for (let i = 0; i < weaknessCount; i++) {
            const index = Math.floor(Math.random() * weaknesses.length);
            selectedWeaknesses.push(weaknesses[index]);
            weaknesses.splice(index, 1);
        }
        
        // Add question to interview
        interview.questions.push({
            question,
            answer,
            score,
            strengths: selectedStrengths,
            weaknesses: selectedWeaknesses,
            duration: duration || 0
        });
        
        await interview.save();
        
        res.json({
            success: true,
            message: 'Answer recorded',
            questionFeedback: {
                score,
                strengths: selectedStrengths,
                weaknesses: selectedWeaknesses
            }
        });
    } catch (error) {
        console.error('Error recording answer:', error);
        res.status(500).json({ success: false, message: 'Error recording answer' });
    }
});

// Add a warning
interviewRouter.post('/:interviewId/warning', async (req, res) => {
    try {
        const { interviewId } = req.params;
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ success: false, message: 'Warning message is required' });
        }
        
        const interview = await Interview.findById(interviewId);
        if (!interview) {
            return res.status(404).json({ success: false, message: 'Interview not found' });
        }
        
        // Add warning
        interview.warnings.push({
            message,
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
        res.status(500).json({ success: false, message: 'Error recording warning' });
    }
});

// End interview session
interviewRouter.post('/:interviewId/end', async (req, res) => {
    try {
        const { interviewId } = req.params;

        const interview = await Interview.findById(interviewId);
        if (!interview) {
            return res.status(404).json({ success: false, message: 'Interview not found' });
        }

        // Mark the interview as completed
        interview.completed = true;
        interview.endTime = new Date();

        // Calculate total score
        interview.totalScore = interview.questions.reduce((sum, q) => sum + (q.score || 0), 0);

        await interview.save();

        res.json({
            success: true,
            message: 'Interview ended successfully',
            totalScore: interview.totalScore
        });
    } catch (error) {
        console.error('Error ending interview:', error);
        res.status(500).json({ success: false, message: 'Error ending interview' });
    }
});

// Get interview report
interviewRouter.get('/:interviewId', async (req, res) => {
    try {
        const { interviewId } = req.params;
        
        const interview = await Interview.findById(interviewId);
        if (!interview) {
            return res.status(404).json({ success: false, message: 'Interview not found' });
        }
        
        res.json({
            success: true,
            interview: {
                id: interview._id,
                position: interview.position,
                interviewType: interview.interviewType,
                difficulty: interview.difficulty,
                startTime: interview.startTime,
                endTime: interview.endTime,
                duration: interview.endTime ? Math.round((interview.endTime - interview.startTime) / 60000) : null,
                completed: interview.completed,
                totalScore: interview.totalScore,
                warningCount: interview.warningCount,
                feedback: interview.feedback,
                questions: interview.questions,
                warnings: interview.warnings
            }
        });
    } catch (error) {
        console.error('Error fetching interview:', error);
        res.status(500).json({ success: false, message: 'Error fetching interview' });
    }
});

// Get all interviews for a user
interviewRouter.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const interviews = await Interview.find({ userId }).sort({ startTime: -1 });
        
        res.json({
            success: true,
            interviews: interviews.map(interview => ({
                id: interview._id,
                position: interview.position,
                interviewType: interview.interviewType,
                difficulty: interview.difficulty,
                startTime: interview.startTime,
                endTime: interview.endTime,
                completed: interview.completed,
                totalScore: interview.totalScore,
                warningCount: interview.warningCount
            }))
        });
    } catch (error) {
        console.error('Error fetching user interviews:', error);
        res.status(500).json({ success: false, message: 'Error fetching user interviews' });
    }
});

// Upload interview recording
interviewRouter.post('/:interviewId/upload', upload.single('recording'), async (req, res) => {
    try {
        const { interviewId } = req.params;
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        
        const interview = await Interview.findById(interviewId);
        if (!interview) {
            return res.status(404).json({ success: false, message: 'Interview not found' });
        }
        
        // Update interview with recording path
        interview.recordingPath = req.file.path;
        await interview.save();
        
        res.json({
            success: true,
            message: 'Recording uploaded successfully',
            path: req.file.path
        });
    } catch (error) {
        console.error('Error uploading recording:', error);
        res.status(500).json({ success: false, message: 'Error uploading recording' });
    }
});

// AI feedback using Puter API (would connect to your chosen AI service)
interviewRouter.post('/analyze', async (req, res) => {
    try {
        const { answer, question } = req.body;
        
        if (!answer || !question) {
            return res.status(400).json({ success: false, message: 'Answer and question are required' });
        }
        
        // In a real implementation, you would call the Puter API here
        // For now, return mock analysis
        
        // Mock delay to simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Random score between 60-95
        const score = Math.floor(Math.random() * 36) + 60;
        
        const strengths = [
            "Good understanding of the concept",
            "Clear and concise explanation",
            "Provided relevant examples",
            "Structured answer logically",
            "Demonstrated practical knowledge"
        ];
        
        const weaknesses = [
            "Could provide more specific examples",
            "Answer could be more concise",
            "Consider addressing edge cases",
            "Technical terminology could be more precise",
            "Could have elaborated more on the implementation details"
        ];
        
        // Select random strengths and weaknesses
        const strengthCount = Math.floor(Math.random() * 2) + 1;
        const weaknessCount = Math.floor(Math.random() * 2) + 1;
        
        const selectedStrengths = [];
        const selectedWeaknesses = [];
        
        for (let i = 0; i < strengthCount; i++) {
            const index = Math.floor(Math.random() * strengths.length);
            selectedStrengths.push(strengths[index]);
            strengths.splice(index, 1);
        }
        
        for (let i = 0; i < weaknessCount; i++) {
            const index = Math.floor(Math.random() * weaknesses.length);
            selectedWeaknesses.push(weaknesses[index]);
            weaknesses.splice(index, 1);
        }
        
        res.json({
            success: true,
            analysis: {
                score,
                strengths: selectedStrengths,
                weaknesses: selectedWeaknesses
            }
        });
    } catch (error) {
        console.error('Error analyzing answer:', error);
        res.status(500).json({ success: false, message: 'Error analyzing answer' });
    }
});

export default interviewRouter;