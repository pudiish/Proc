// ✅ Define quiz questions
const quizQuestions = [
    { question: "What is the capital of France?", options: ["Berlin", "Madrid", "Paris", "Lisbon"], answer: 2 },
    { question: "What is 2 + 2?", options: ["3", "4", "5", "6"], answer: 1 },
    { question: "Which programming language is used for web development?", options: ["Python", "JavaScript", "C++", "Java"], answer: 1 },
    { question: "What is the capital of Japan?", options: ["Seoul", "Tokyo", "Beijing", "Bangkok"], answer: 1 },
    { question: "Which planet is known as the Red Planet?", options: ["Earth", "Mars", "Jupiter", "Saturn"], answer: 1 }
];

// ✅ Global variables
let currentQuestionIndex = 0;
let correctAnswers = 0;
let quizPaused = false;
let quizStarted = false;
let warningCount = 0;
let timeLeft = 30;
let noFaceDetectedDuration = 0;
let malpracticeWarningCount = 0;
const maxNoFaceDuration = 60; // 1 min wait before ending quiz
const maxMalpracticeWarnings = 2; // Reduced to 2 warnings before ending quiz
let timer;
let startTime;
let faceDetectionModel;
let objectDetectionModel;
let environmentChecked = false;
const username = localStorage.getItem("username") || "Guest"; // Retrieve logged-in user
let cameraMonitoringInterval;

const userSelections = Array(quizQuestions.length).fill(null);
const answeredQuestions = Array(quizQuestions.length).fill(false);
let remainingTimes = Array(quizQuestions.length).fill(30);
let expiredTimes = Array(quizQuestions.length).fill(false);

// Objects to detect for malpractice (will check against COCO dataset classes)
const suspiciousObjects = ['cell phone', 'laptop', 'tv', 'remote', 'book', 'keyboard'];

// ✅ HTML Elements
const quizContainer = document.getElementById("quiz-container");
const questionContainer = document.getElementById("question");
const optionsContainer = document.getElementById("options");
const scoreContainer = document.getElementById("score-container");
const scoreText = document.getElementById("score");
const notificationBox = document.getElementById("notification-box");
const progress = document.getElementById("progress");
const timeLeftContainer = document.getElementById("time-left");
const webcamElement = document.getElementById("webcam");
const startWebcamButton = document.getElementById("start-webcam");
const backButton = document.getElementById("back-btn");
const nextButton = document.getElementById("next-btn");
const startTestContainer = document.getElementById("start-test-container");
const statusMessage = document.getElementById("status-message");
const setupContainer = document.getElementById("setup-container");

// ✅ Initialize quiz when page loads
document.addEventListener("DOMContentLoaded", function() {
    console.log("✅ DOM fully loaded and parsed");
    setupContainer.classList.remove("hidden");
    startTestContainer.classList.add("hidden");
    quizContainer.classList.add("hidden");
    updateStatusMessage("Please enable your camera to begin");
});

function updateStatusMessage(message, isSuccess = false) {
    if (statusMessage) {
        statusMessage.textContent = message;
        statusMessage.className = isSuccess ? "status-success" : "status-message";
        console.log(`📢 Status: ${message}`);
    }
}

function resetTimer() {
    clearInterval(timer);
    timeLeft = remainingTimes[currentQuestionIndex] || 30;
    updateTimeLeft();

    timer = setInterval(() => {
        if (quizPaused) return;

        timeLeft--;
        updateTimeLeft();

        if (timeLeft === 0) {
            clearInterval(timer);
            expiredTimes[currentQuestionIndex] = true;
            remainingTimes[currentQuestionIndex] = 0;
            
            // Mark the question as answered when time expires
            answeredQuestions[currentQuestionIndex] = true;
            
            // Enable next button when time expires
            nextButton.disabled = false;
            
            showNotification("Time's up for this question!");
        }
    }, 1000);
}

function updateProgress(index) {
    const progressPercentage = ((index + 1) / quizQuestions.length) * 100;
    progress.style.width = `${progressPercentage}%`;
}

function updateNavigationButtons() {
    // Previous button enabled only if not on first question
    backButton.disabled = currentQuestionIndex === 0;
    
    // Next button enabled if current question is answered or time expired
    nextButton.disabled = !(answeredQuestions[currentQuestionIndex] || expiredTimes[currentQuestionIndex]);
    
    console.log(`✅ Navigation buttons updated: Back=${!backButton.disabled}, Next=${!nextButton.disabled}`);
}

function restartQuiz() {
    console.log("🔄 Restarting quiz...");
    userSelections.fill(null);
    answeredQuestions.fill(false);
    expiredTimes.fill(false);
    remainingTimes.fill(30);
    currentQuestionIndex = 0;
    correctAnswers = 0;
    scoreContainer.classList.add("hidden");
    quizContainer.classList.remove("hidden");
    loadQuestion(currentQuestionIndex);
    resetTimer();
}

// ✅ Start Webcam & Face Detection
async function startWebcam() {
    try {
        updateStatusMessage("Starting webcam...");
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        webcamElement.srcObject = stream;
        webcamElement.classList.remove("hidden");
        startWebcamButton.classList.add("hidden");
        console.log("✅ Webcam started successfully!");
        
        // Log camera start event
        logCameraActivity("Camera Started");
        
        updateStatusMessage("Loading detection models...");
        await loadDetectionModels();
        updateStatusMessage("Performing environment check...");
        monitorWebcam();
        
        // Start regular camera monitoring logs (every 10 seconds)
        startCameraMonitoring();
    } catch (err) {
        console.error("🚨 Webcam error:", err);
        updateStatusMessage(`Error: ${err.message}. Please try again.`);
        alert(`Webcam error: ${err.message}`);
    }
}

// Start regular camera activity logging
function startCameraMonitoring() {
    // Log camera activity every 10 seconds
    cameraMonitoringInterval = setInterval(() => {
        if (webcamElement && webcamElement.srcObject) {
            logCameraActivity("Camera Active");
        }
    }, 10000); // Every 10 seconds
}

// ✅ Load Face and Object Detection Models
async function loadDetectionModels() {
    try {
        console.log("⏳ Loading detection models...");
        
        // Load face detection model
        faceDetectionModel = await blazeface.load();
        console.log("✅ Face detection model loaded successfully!");
        
        // Load object detection model (using COCO-SSD)
        objectDetectionModel = await cocoSsd.load();
        console.log("✅ Object detection model loaded successfully!");
        
    } catch (err) {
        console.error("🚨 Error loading detection models:", err);
        updateStatusMessage("Failed to load detection models. Please refresh the page.");
        alert("Failed to load detection models.");
    }
}

// ✅ Monitor Webcam for Faces and Objects
async function monitorWebcam() {
    if (!faceDetectionModel || !objectDetectionModel || !webcamElement) return;
    
    console.log("🔍 Starting detection...");

    async function detectFacesAndObjects() {
        if (webcamElement.readyState !== 4) {
            requestAnimationFrame(detectFacesAndObjects);
            return;
        }
        
        try {
            // Detect faces
            const facePredictions = await faceDetectionModel.estimateFaces(webcamElement, false);
            
            // Detect objects
            const objectPredictions = await objectDetectionModel.detect(webcamElement);
            
            // Check for suspicious objects
            const detectedSuspiciousObjects = objectPredictions.filter(prediction => 
                suspiciousObjects.includes(prediction.class) && 
                prediction.score > 0.70 // Confidence threshold
            );
            
            if (detectedSuspiciousObjects.length > 0) {
                // Malpractice detected!
                handleMalpracticeDetected(detectedSuspiciousObjects);
            } else if (facePredictions.length === 0) {
                handleNoFaceDetected();
            } else if (facePredictions.length > 1) {
                warningCount++;
                showNotification(`Multiple faces detected! Warning ${warningCount}/3`);
                
                // Log multiple faces detection
                logCameraActivity("Multiple Faces Detected", {
                    faceCount: facePredictions.length
                });
                
                if (warningCount >= 3) {
                    pauseQuiz("multiple faces");
                }
            } else {
                // Single face detected, no suspicious objects
                warningCount = 0;
                malpracticeWarningCount = 0; // Reset malpractice warnings
                noFaceDetectedDuration = 0; // Reset no-face counter
                
                // Only proceed if quiz hasn't started yet
                if (!quizStarted && !environmentChecked) {
                    environmentChecked = true;
                    updateStatusMessage("Environment check successful! ✓", true);
                    startTestContainer.classList.remove("hidden");
                    
                    // Log successful environment check
                    logCameraActivity("Environment Check Passed");
                } else if (quizStarted && quizPaused) {
                    resumeQuiz();
                }
            }
        } catch (err) {
            console.error("🚨 Detection error:", err);
        }

        requestAnimationFrame(detectFacesAndObjects);
    }

    detectFacesAndObjects();
}

// ✅ Handle malpractice detection
function handleMalpracticeDetected(detectedObjects) {
    malpracticeWarningCount++;
    
    const objectNames = detectedObjects.map(obj => obj.class).join(', ');
    console.log(`⚠️ MALPRACTICE DETECTED: ${objectNames} detected. Warning ${malpracticeWarningCount}/${maxMalpracticeWarnings}`);
    
    // Pause quiz immediately on malpractice detection
    pauseQuiz("malpractice");
    
    showNotification(`⚠️ MALPRACTICE: ${objectNames} detected! Warning ${malpracticeWarningCount}/${maxMalpracticeWarnings}`);
    
    // Log the malpractice incident to both quiz logs and camera logs
    logActivity("Malpractice Detected", { 
        objects: objectNames,
        warningCount: malpracticeWarningCount
    });
    
    logCameraActivity("Malpractice Detected", {
        objects: objectNames,
        confidence: detectedObjects.map(obj => obj.score),
        warningCount: malpracticeWarningCount
    });
    
    if (malpracticeWarningCount >= maxMalpracticeWarnings) {
        alert(`⚠️ MALPRACTICE WARNING: ${objectNames} detected multiple times. Quiz will now end.`);
        terminateQuizDueToMalpractice(objectNames);
    } else {
        alert(`⚠️ MALPRACTICE WARNING: ${objectNames} detected. Please remove these objects. Warning ${malpracticeWarningCount}/${maxMalpracticeWarnings}`);
    }
}

// ✅ Terminate quiz due to malpractice
function terminateQuizDueToMalpractice(reason) {
    clearInterval(timer);
    
    // Take a screenshot as evidence (this is just conceptual - actual implementation would depend on browser capabilities)
    // In a real implementation, you might want to use Canvas to capture the webcam frame
    
    // Log quiz termination due to malpractice
    logActivity("Quiz Terminated", { reason: reason });
    
    // Log camera evidence
    logCameraActivity("Quiz Terminated (Malpractice)", { 
        reason: reason,
        questionIndex: currentQuestionIndex,
        totalQuestionsAnswered: answeredQuestions.filter(item => item).length
    });
    
    // Show termination message
    quizContainer.classList.add("hidden");
    scoreContainer.classList.remove("hidden");
    scoreText.textContent = `Quiz terminated due to detected malpractice: ${reason}`;
    
    console.log(`❌ Quiz terminated due to malpractice: ${reason}`);
    
    // Stop camera monitoring interval
    clearInterval(cameraMonitoringInterval);
}

// ✅ Handle if no face is detected
function handleNoFaceDetected() {
    if (environmentChecked && !quizStarted) {
        updateStatusMessage("No face detected. Please position yourself in front of the camera.");
        startTestContainer.classList.add("hidden");
        environmentChecked = false;
    } else if (quizStarted) {
        noFaceDetectedDuration++;
        console.log(`⚠️ No face detected for ${noFaceDetectedDuration} seconds.`);

        if (noFaceDetectedDuration === 1) {
            pauseQuiz("no face");
            showNotification("⚠️ No face detected! Quiz paused.");
            
            // Log no face detection
            logCameraActivity("No Face Detected", {
                duration: noFaceDetectedDuration
            });
            
            alert("⚠️ No face detected! Quiz paused. You have 1 minute to return.");
        }

        if (noFaceDetectedDuration >= maxNoFaceDuration) {
            alert("⏳ No face detected for too long. Quiz will now end.");
            terminateQuizDueToMalpractice("No face detected for extended period");
        }
    }
}

// ✅ Show notification messages
function showNotification(message) {
    notificationBox.textContent = message;
    notificationBox.classList.remove("hidden");
    notificationBox.classList.add("visible");

    setTimeout(() => {
        notificationBox.classList.remove("visible");
        setTimeout(() => {
            notificationBox.classList.add("hidden");
        }, 300);
    }, 3000);
}

// ✅ Pause quiz for various reasons
function pauseQuiz(reason = "unknown") {
    quizPaused = true;
    clearInterval(timer);
    console.log(`🚨 Quiz paused due to: ${reason}`);
    
    // Log quiz pause event
    logActivity("Quiz Paused", { reason: reason });
    
    if (reason === "malpractice") {
        showNotification("🚨 Quiz paused due to suspected malpractice. Please remove any electronic devices.");
    } else if (reason === "no face") {
        showNotification("🚨 Quiz paused. No face detected.");
    } else if (reason === "multiple faces") {
        showNotification("🚨 Quiz paused. Multiple faces detected.");
    } else {
        showNotification("🚨 Quiz paused. Please ensure proper test conditions.");
    }
}

// ✅ Resume quiz
function resumeQuiz() {
    if (quizPaused) {
        quizPaused = false;
        resetTimer();
        console.log("✅ Quiz resumed");
        showNotification("✅ Environment clear! Resuming quiz.");
        
        // Log quiz resume event
        logActivity("Quiz Resumed");
        logCameraActivity("Quiz Resumed", {
            resumedAt: currentQuestionIndex
        });
    }
}

// ✅ Start the quiz
function startQuiz() {
    if (!quizStarted && environmentChecked) {
        quizStarted = true;
        setupContainer.classList.add("hidden");
        startTestContainer.classList.add("hidden");
        quizContainer.classList.remove("hidden");
        loadQuestion(currentQuestionIndex);
        resetTimer();
        logActivity("Started Quiz");
        logCameraActivity("Quiz Started");
        console.log("🏁 Quiz started");
    } else if (!environmentChecked) {
        showNotification("Please wait for environment check to complete");
        updateStatusMessage("Environment check in progress...");
    }
}

// ✅ Load a question
function loadQuestion(index) {
    if (index >= quizQuestions.length) {
        finishQuiz();
        return;
    }

    console.log(`📝 Loading question ${index + 1}/${quizQuestions.length}`);
    const question = quizQuestions[index];
    questionContainer.textContent = question.question;
    optionsContainer.innerHTML = "";

    question.options.forEach((option, i) => {
        const optionElement = document.createElement("div");
        optionElement.classList.add("option");
        
        // Highlight previously selected option
        if (userSelections[index] === i) {
            optionElement.classList.add("selected");
        }
        
        optionElement.textContent = option;
        optionElement.onclick = () => handleOptionClick(i);
        optionsContainer.appendChild(optionElement);
    });

    updateProgress(index);
    updateNavigationButtons();
    startTime = Date.now();
}

// ✅ Handle answer selection
function handleOptionClick(optionIndex) {
    console.log(`👆 Option ${optionIndex} selected for question ${currentQuestionIndex + 1}`);
    
    // Store user selection
    userSelections[currentQuestionIndex] = optionIndex;
    
    // Mark as answered
    answeredQuestions[currentQuestionIndex] = true;
    
    // Save remaining time
    remainingTimes[currentQuestionIndex] = timeLeft;
    
    // Highlight selected option
    const options = optionsContainer.querySelectorAll('.option');
    options.forEach((option, index) => {
        if (index === optionIndex) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
    
    const timeTaken = (Date.now() - startTime) / 1000;
    logActivity("Answered Question", {
        optionIndex,
        timeTaken,
        correctAnswer: quizQuestions[currentQuestionIndex].answer
    });
    
    // Enable next button after answering
    nextButton.disabled = false;
}

// ✅ Go to previous question
function goBack() {
    if (currentQuestionIndex > 0) {
        clearInterval(timer);
        // Save remaining time for current question
        remainingTimes[currentQuestionIndex] = timeLeft;
        
        currentQuestionIndex--;
        loadQuestion(currentQuestionIndex);
        resetTimer();
        console.log(`⬅️ Navigated to previous question: ${currentQuestionIndex + 1}`);
    }
}

// ✅ Load next question or finish quiz
function loadNextQuestion() {
    if (currentQuestionIndex < quizQuestions.length - 1) {
        clearInterval(timer);
        // Save remaining time for current question
        remainingTimes[currentQuestionIndex] = timeLeft;
        
        currentQuestionIndex++;
        loadQuestion(currentQuestionIndex);
        resetTimer();
        console.log(`➡️ Navigated to next question: ${currentQuestionIndex + 1}`);
    } else {
        finishQuiz();
    }
}

function updateTimeLeft() {
    timeLeftContainer.textContent = `${timeLeft} s`;
}

// ✅ Finish quiz & show results
function finishQuiz() {
    clearInterval(timer);
    
    // Calculate score
    correctAnswers = 0;
    for (let i = 0; i < quizQuestions.length; i++) {
        if (userSelections[i] === quizQuestions[i].answer) {
            correctAnswers++;
        }
    }
    
    quizContainer.classList.add("hidden");
    scoreContainer.classList.remove("hidden");
    scoreText.textContent = `You scored ${correctAnswers} out of ${quizQuestions.length}`;
    
    logActivity("Completed Quiz", {
        score: correctAnswers,
        totalQuestions: quizQuestions.length
    });
    
    logCameraActivity("Quiz Completed", {
        score: correctAnswers,
        totalQuestions: quizQuestions.length
    });
    
    console.log(`🏁 Quiz completed. Score: ${correctAnswers}/${quizQuestions.length}`);
    
    // Stop camera monitoring interval
    clearInterval(cameraMonitoringInterval);
}

// ✅ Log quiz activities in the database
async function logActivity(activity, data = null) {
    try {
        console.log(`📝 Logging quiz activity: ${activity}`);
        await fetch("http://localhost:5001/quiz/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                username, 
                activity, 
                questionIndex: currentQuestionIndex,
                data,
                timestamp: new Date().toISOString()
            }),
        });
    } catch (error) {
        console.error("❌ Failed to log quiz activity:", error);
    }
}

// ✅ Log camera activities in the database - FIXED VERSION
async function logCameraActivity(activity, data = null) {
    try {
        console.log(`📸 Logging camera activity: ${activity}`);
        
        // Add error handling and retry logic
        const response = await fetch("http://localhost:5001/camera/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                username, 
                activity,
                questionIndex: quizStarted ? currentQuestionIndex : null,
                data,
                timestamp: new Date().toISOString()
            }),
        });
        
        if (!response.ok) {
            console.warn(`⚠️ Camera log request failed with status: ${response.status}`);
            // Optional: implement retry logic here
        }
    } catch (error) {
        console.error("❌ Failed to log camera activity:", error);
        // Store failed logs locally if needed
        const failedLog = {
            username,
            activity,
            questionIndex: quizStarted ? currentQuestionIndex : null,
            data,
            timestamp: new Date().toISOString(),
            failed: true
        };
        
        // Optionally store in localStorage for later retry
        const failedLogs = JSON.parse(localStorage.getItem('failedCameraLogs') || '[]');
        failedLogs.push(failedLog);
        localStorage.setItem('failedCameraLogs', JSON.stringify(failedLogs));
    }
}

// Clean up resources when page unloads
window.addEventListener('beforeunload', () => {
    clearInterval(cameraMonitoringInterval);
    clearInterval(timer);
    
    // Log session end
    logCameraActivity("Session Ended");
    logActivity("Session Ended");
});

// ✅ Debugging Logs on Page Load
console.log("✅ Quiz script loaded with malpractice detection and termination!");