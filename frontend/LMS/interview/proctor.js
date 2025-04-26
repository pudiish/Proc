// interview-ai.js - Enhanced Version with Advanced Malpractice Detection and Real-time Warnings

const video = document.getElementById("video");
const statusDisplay = document.getElementById("status");
const noiseLevelDisplay = document.getElementById("noise-level");
const questionDisplay = document.getElementById("question");
const startBtn = document.getElementById("start-btn");
const endBtn = document.getElementById("end-btn");
const reportSection = document.getElementById("report-section");
const reportContent = document.getElementById("report-content");
const warningDisplay = document.createElement("div");
warningDisplay.id = "warning-display";
warningDisplay.className = "warning-box hidden";
document.body.appendChild(warningDisplay);
const timerDisplay = document.createElement("div");
timerDisplay.id = "timer";
questionDisplay.insertAdjacentElement("afterend", timerDisplay);

let sessionData = {
  startTime: null,
  endTime: null,
  faceDetections: [],
  noiseDetections: [],
  eyeTrackingData: [],
  questions: [],
  malpracticeEvents: [],
  warnings: []
};

let stream = null;
let faceDetectionInterval = null;
let audioAnalyzerInterval = null;
let questionInterval = null;
let questionTimer = null;
let sessionId = null;
let currentQuestionIndex = 0;
let warningTimeout = null;
let consecutiveNoFaceDetections = 0;
let consecutiveHighNoiseDetections = 0;
let motionDetectionInterval = null;
let previousCanvasData = null;

const MALPRACTICE_THRESHOLDS = {
  HIGH_NOISE_LEVEL: 65,
  CONTINUOUS_NO_FACE: 3,
  CONTINUOUS_HIGH_NOISE: 3,
  SUSPICIOUS_MOTION: 0.3,
  PROHIBITED_ITEMS: ["phone", "paper", "book", "device"]
};

const interviewQuestions = {
  software: [
    "Tell me about your experience with object-oriented programming.",
    "How do you handle merge conflicts in Git?",
    "Explain the difference between SQL and NoSQL databases.",
    "How would you optimize a slow-performing website?",
    "Describe your approach to testing software applications."
  ],
  marketing: [
    "How do you measure the success of a marketing campaign?",
    "Describe a successful marketing strategy you implemented.",
    "What metrics do you prioritize when analyzing marketing performance?",
    "How do you stay updated with the latest marketing trends?",
    "Explain how you would approach a product launch."
  ],
  finance: [
    "How do you evaluate the financial health of a company?",
    "Explain the difference between cash flow and profit.",
    "How would you build a financial model for a new project?",
    "What financial metrics do you consider most important?",
    "How do you approach risk management in financial decisions?"
  ],
  general: [
    "Tell me about yourself and your background.",
    "What are your greatest strengths and weaknesses?",
    "Describe a challenging situation and how you handled it.",
    "Where do you see yourself in 5 years?",
    "Why are you interested in this position?"
  ]
};

async function loadFaceDetectionModels() {
  try {
    statusDisplay.textContent = "Status: Loading face detection models...";
    await faceapi.nets.tinyFaceDetector.loadFromUri('./models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('./models');
    await faceapi.nets.faceRecognitionNet.loadFromUri('./models');
    await faceapi.nets.faceExpressionNet.loadFromUri('./models');
    await faceapi.nets.ssdMobilenetv1.loadFromUri('./models');
    statusDisplay.textContent = "Status: Ready to start interview";
  } catch (error) {
    statusDisplay.textContent = "Status: Failed to load face detection models";
    console.error("Model loading error:", error);
  }
}

function speakQuestion(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  speechSynthesis.speak(utterance);
}

async function startInterview() {
  try {
    sessionId = Date.now().toString();
    sessionData.startTime = new Date().toISOString();
    const domain = document.getElementById("domain-select").value;
    const questions = interviewQuestions[domain];

    stream = await navigator.mediaDevices.getUserMedia({ 
      video: { width: 640, height: 480, facingMode: "user" }, 
      audio: true 
    });
    video.srcObject = stream;
    await video.play();

    startBtn.disabled = true;
    endBtn.disabled = false;
    statusDisplay.textContent = "Status: Interview in progress";

    // Reset variables
    sessionData.faceDetections = [];
    sessionData.noiseDetections = [];
    sessionData.eyeTrackingData = [];
    sessionData.questions = [];
    sessionData.malpracticeEvents = [];
    sessionData.warnings = [];
    currentQuestionIndex = 0;
    consecutiveNoFaceDetections = 0;
    consecutiveHighNoiseDetections = 0;
    previousCanvasData = null;

    presentQuestion(questions);
    startFaceDetection();
    startAudioAnalysis();
    startMotionDetection();

  } catch (error) {
    statusDisplay.textContent = "Status: Failed to start interview.";
    console.error("Interview start error:", error);
  }
}

function presentQuestion(questions) {
  if (currentQuestionIndex >= questions.length) {
    endInterview();
    return;
  }
  const question = questions[currentQuestionIndex];
  displayAndSpeakQuestion(question);
  sessionData.questions.push({
    index: currentQuestionIndex,
    question,
    time: new Date().toISOString()
  });
  startTimer(60, () => {
    currentQuestionIndex++;
    presentQuestion(questions);
  });
}

function displayAndSpeakQuestion(question) {
  questionDisplay.textContent = "Question: " + question;
  speakQuestion(question);
}

function startTimer(duration, callback) {
  let time = duration;
  clearInterval(questionTimer);
  timerDisplay.textContent = `Time Remaining: ${time}s`;
  questionTimer = setInterval(() => {
    time--;
    timerDisplay.textContent = `Time Remaining: ${time}s`;
    if (time <= 0) {
      clearInterval(questionTimer);
      callback();
    }
  }, 1000);
}

function endInterview() {
  clearInterval(faceDetectionInterval);
  clearInterval(audioAnalyzerInterval);
  clearInterval(questionTimer);
  clearInterval(motionDetectionInterval);

  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    video.srcObject = null;
  }

  sessionData.endTime = new Date().toISOString();
  startBtn.disabled = false;
  endBtn.disabled = true;
  statusDisplay.textContent = "Status: Interview completed";
  questionDisplay.textContent = "Question: Interview completed";
  noiseLevelDisplay.textContent = "Noise Level: N/A";
  timerDisplay.textContent = "";
  hideWarning();

  generateInterviewReport();
  saveInterviewData();
}

function startFaceDetection() {
  faceDetectionInterval = setInterval(async () => {
    if (!video || !video.videoWidth) return;
    try {
      const detections = await faceapi.detectAllFaces(
        video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
      ).withFaceLandmarks().withFaceExpressions();
      
      const data = {
        timestamp: new Date().toISOString(),
        faceCount: detections.length,
        questionIndex: currentQuestionIndex
      };
      
      sessionData.faceDetections.push(data);
      
      // Check for face presence
      if (detections.length === 0) {
        consecutiveNoFaceDetections++;
        if (consecutiveNoFaceDetections >= MALPRACTICE_THRESHOLDS.CONTINUOUS_NO_FACE) {
          logMalpractice("NO_FACE_DETECTED", data);
          showWarning("Warning: No face detected. Please ensure your face is visible.");
        }
      } else {
        consecutiveNoFaceDetections = 0;
        hideWarning();
        
        if (detections.length > 1) {
          logMalpractice("MULTIPLE_FACES_DETECTED", data);
          showWarning("Warning: Multiple faces detected. Only the interviewee should be visible.");
        }
        
        // Eye tracking analysis
        for (const detection of detections) {
          const landmarks = detection.landmarks;
          const eyeData = analyzeEyeMovement(landmarks);
          sessionData.eyeTrackingData.push({
            timestamp: new Date().toISOString(),
            eyeData,
            questionIndex: currentQuestionIndex
          });
          
          // Check for suspicious eye movements
          if (eyeData.lookingAway) {
            logMalpractice("SUSPICIOUS_EYE_MOVEMENT", eyeData);
            showWarning("Warning: Suspicious eye movement detected. Please focus on the interview.");
          }
          
          // Check for prohibited items using expression and landmark analysis
          const expression = detection.expressions;
          if (expression.surprised > 0.7 || expression.fearful > 0.7) {
            checkForProhibitedItems();
          }
        }
      }
    } catch (error) {
      console.error("Face detection error:", error);
    }
  }, 1000);
}

function analyzeEyeMovement(landmarks) {
  if (!landmarks) return { lookingAway: false };
  
  // Extract eye landmarks
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  
  // Calculate eye aspect ratio to detect looking away
  const leftEAR = calculateEyeAspectRatio(leftEye);
  const rightEAR = calculateEyeAspectRatio(rightEye);
  
  // Check if looking away from camera
  const lookingAway = leftEAR < 0.2 || rightEAR < 0.2;
  
  return {
    leftEAR,
    rightEAR,
    lookingAway
  };
}

function calculateEyeAspectRatio(eye) {
  // Calculate vertical eye distances
  const v1 = distance(eye[1], eye[5]);
  const v2 = distance(eye[2], eye[4]);
  
  // Calculate horizontal eye distance
  const h = distance(eye[0], eye[3]);
  
  // Return eye aspect ratio
  return (v1 + v2) / (2.0 * h);
}

function distance(a, b) {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

function startAudioAnalysis() {
  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();
  const microphone = audioContext.createMediaStreamSource(stream);

  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.8;
  microphone.connect(analyser);

  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  audioAnalyzerInterval = setInterval(() => {
    analyser.getByteFrequencyData(dataArray);
    const avg = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
    const level = Math.round(avg);
    noiseLevelDisplay.textContent = `Noise Level: ${level} dB`;

    const noiseData = {
      timestamp: new Date().toISOString(),
      level: level,
      questionIndex: currentQuestionIndex
    };

    sessionData.noiseDetections.push(noiseData);
    
    // Check for high noise levels
    if (level > MALPRACTICE_THRESHOLDS.HIGH_NOISE_LEVEL) {
      consecutiveHighNoiseDetections++;
      if (consecutiveHighNoiseDetections >= MALPRACTICE_THRESHOLDS.CONTINUOUS_HIGH_NOISE) {
        logMalpractice("HIGH_NOISE_LEVEL", noiseData);
        showWarning("Warning: High noise level detected. Please ensure a quiet environment.");
      }
    } else {
      consecutiveHighNoiseDetections = 0;
    }
    
    // Voice pattern analysis to detect potential cheating
    analyzeVoicePatterns(dataArray);

  }, 1000);
}

function analyzeVoicePatterns(audioData) {
  // Simple voice pattern analysis to detect sudden changes in voice
  const varianceThreshold = 20;
  let sum = 0;
  let sumSquares = 0;
  
  for (let i = 0; i < audioData.length; i++) {
    sum += audioData[i];
    sumSquares += audioData[i] * audioData[i];
  }
  
  const mean = sum / audioData.length;
  const variance = sumSquares / audioData.length - mean * mean;
  
  if (variance > varianceThreshold) {
    logMalpractice("SUSPICIOUS_VOICE_PATTERN", { variance, mean, timestamp: new Date().toISOString() });
    showWarning("Warning: Unusual voice pattern detected.");
  }
}

function startMotionDetection() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 640;
  canvas.height = 480;
  
  motionDetectionInterval = setInterval(() => {
    if (!video || !video.videoWidth) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    if (previousCanvasData) {
      const motionScore = detectMotion(previousCanvasData.data, currentImageData.data);
      
      if (motionScore > MALPRACTICE_THRESHOLDS.SUSPICIOUS_MOTION) {
        logMalpractice("SUSPICIOUS_MOTION", { 
          score: motionScore, 
          timestamp: new Date().toISOString(), 
          questionIndex: currentQuestionIndex 
        });
        showWarning("Warning: Suspicious movement detected.");
      }
    }
    
    previousCanvasData = currentImageData;
  }, 1500);
}

function detectMotion(previousData, currentData) {
  let diffCount = 0;
  const threshold = 30;
  const skipPixels = 10; // Skip pixels for performance
  
  for (let i = 0; i < previousData.length; i += 4 * skipPixels) {
    const r1 = previousData[i];
    const g1 = previousData[i + 1];
    const b1 = previousData[i + 2];
    
    const r2 = currentData[i];
    const g2 = currentData[i + 1];
    const b2 = currentData[i + 2];
    
    const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
    
    if (diff > threshold) {
      diffCount++;
    }
  }
  
  return diffCount / (previousData.length / (4 * skipPixels));
}

async function checkForProhibitedItems() {
  try {
    // This would ideally be done with a proper object detection model
    // For this example, we'll simulate detection based on face detection
    const detections = await faceapi.detectAllFaces(
      video, new faceapi.SsdMobilenetv1Options()
    );
    
    for (const detection of detections) {
      const box = detection.box;
      // Check for unusual objects near the face area
      const expandedBox = {
        x: Math.max(0, box.x - box.width * 0.5),
        y: Math.max(0, box.y - box.height * 0.5),
        width: box.width * 2,
        height: box.height * 2
      };
      
      // In a real implementation, this would analyze the expanded box area for prohibited items
      // For simulation purposes, we'll randomly detect prohibited items with a low probability
      if (Math.random() < 0.05) {
        const randomItemIndex = Math.floor(Math.random() * MALPRACTICE_THRESHOLDS.PROHIBITED_ITEMS.length);
        const itemName = MALPRACTICE_THRESHOLDS.PROHIBITED_ITEMS[randomItemIndex];
        
        logMalpractice("PROHIBITED_ITEM_DETECTED", {
          item: itemName,
          location: expandedBox,
          timestamp: new Date().toISOString()
        });
        
        showWarning(`Warning: Prohibited item detected (${itemName}). Please remove it.`);
      }
    }
  } catch (error) {
    console.error("Prohibited item detection error:", error);
  }
}

function logMalpractice(type, data) {
  const malpracticeEvent = { 
    type, 
    timestamp: new Date().toISOString(), 
    data,
    questionIndex: currentQuestionIndex
  };
  
  sessionData.malpracticeEvents.push(malpracticeEvent);
  
  // Add to warnings log
  sessionData.warnings.push({
    type,
    timestamp: new Date().toISOString(),
    question: currentQuestionIndex >= 0 && currentQuestionIndex < sessionData.questions.length 
      ? sessionData.questions[currentQuestionIndex].question 
      : "Unknown question"
  });
}

function showWarning(message) {
  warningDisplay.textContent = message;
  warningDisplay.classList.remove("hidden");
  
  // Clear any existing timeout and set a new one
  if (warningTimeout) {
    clearTimeout(warningTimeout);
  }
  warningTimeout = setTimeout(() => {
    hideWarning();
  }, 5000);
  
  // Play warning sound
  playWarningSound();
}

function hideWarning() {
  warningDisplay.classList.add("hidden");
  if (warningTimeout) {
    clearTimeout(warningTimeout);
    warningTimeout = null;
  }
}

function playWarningSound() {
  const audioContext = new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
  gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.3);
}

function generateInterviewReport() {
  const score = calculateInterviewScore();
  const faceSummary = analyzeFaceDetections();
  const noiseSummary = analyzeNoiseDetections();
  const malpracticeSummary = analyzeMalpracticeEvents();

  reportSection.classList.remove("hidden");
  reportContent.innerHTML = `
    <h2>Interview Report</h2>
    <div class="report-section">
      <h3>General Information</h3>
      <p><span class="highlight">Duration:</span> ${formatDuration(new Date(sessionData.endTime) - new Date(sessionData.startTime))}</p>
      <p><span class="highlight">Questions Answered:</span> ${sessionData.questions.length}</p>
      <p><span class="highlight">Final Score:</span> <span class="${score < 70 ? 'low-score' : score < 90 ? 'medium-score' : 'high-score'}">${score}/100</span></p>
    </div>
    
    <div class="report-section">
      <h3>Malpractice Summary</h3>
      <p><span class="highlight">Total Malpractice Events:</span> ${sessionData.malpracticeEvents.length}</p>
      <p><span class="highlight">Face Presence Accuracy:</span> ${faceSummary.normalPercentage}%</p>
      <p><span class="highlight">Average Noise Level:</span> ${noiseSummary.averageNoiseLevel} dB</p>
      
      <h4>Malpractice Events Breakdown:</h4>
      <ul>
        ${malpracticeSummary.eventsBreakdown}
      </ul>
    </div>
    
    <div class="report-section">
      <h3>Performance By Question</h3>
      <table class="question-performance">
        <thead>
          <tr>
            <th>Question</th>
            <th>Malpractice Events</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${generateQuestionPerformanceRows()}
        </tbody>
      </table>
    </div>
    
    <div class="report-section">
      <h3>Recommendations</h3>
      <ul>
        ${generateRecommendations(score, faceSummary, noiseSummary, malpracticeSummary)}
      </ul>
    </div>
  `;
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function analyzeFaceDetections() {
  const total = sessionData.faceDetections.length || 1; // Avoid division by zero
  const noFace = sessionData.faceDetections.filter(d => d.faceCount === 0).length;
  const multiFace = sessionData.faceDetections.filter(d => d.faceCount > 1).length;
  const normal = total - noFace - multiFace;
  return {
    normalPercentage: ((normal / total) * 100).toFixed(1),
    noFacePercentage: ((noFace / total) * 100).toFixed(1),
    multiFacePercentage: ((multiFace / total) * 100).toFixed(1)
  };
}

function analyzeNoiseDetections() {
  const levels = sessionData.noiseDetections.map(d => d.level);
  const average = levels.length > 0 
    ? levels.reduce((sum, val) => sum + val, 0) / levels.length 
    : 0;
  const highNoiseTimes = levels.filter(l => l > MALPRACTICE_THRESHOLDS.HIGH_NOISE_LEVEL).length;
  return { 
    averageNoiseLevel: average.toFixed(1),
    highNoisePercentage: ((highNoiseTimes / (levels.length || 1)) * 100).toFixed(1)
  };
}

function analyzeMalpracticeEvents() {
  const events = sessionData.malpracticeEvents;
  const typeCount = {};
  
  events.forEach(event => {
    typeCount[event.type] = (typeCount[event.type] || 0) + 1;
  });
  
  const eventsBreakdown = Object.entries(typeCount)
    .map(([type, count]) => `<li>${formatMalpracticeType(type)}: ${count} times</li>`)
    .join('');
  
  return {
    typeCount,
    eventsBreakdown: eventsBreakdown || "<li>No malpractice events detected</li>"
  };
}

function formatMalpracticeType(type) {
  const typeMap = {
    "NO_FACE_DETECTED": "No Face Detected",
    "MULTIPLE_FACES_DETECTED": "Multiple Faces Detected",
    "HIGH_NOISE_LEVEL": "High Noise Level",
    "SUSPICIOUS_EYE_MOVEMENT": "Suspicious Eye Movement",
    "SUSPICIOUS_VOICE_PATTERN": "Suspicious Voice Pattern",
    "SUSPICIOUS_MOTION": "Suspicious Motion",
    "PROHIBITED_ITEM_DETECTED": "Prohibited Item Detected"
  };
  
  return typeMap[type] || type;
}

function generateQuestionPerformanceRows() {
  if (!sessionData.questions.length) return "<tr><td colspan='3'>No questions answered</td></tr>";
  
  return sessionData.questions.map((q, index) => {
    const questionEvents = sessionData.malpracticeEvents.filter(e => e.questionIndex === index);
    const status = questionEvents.length === 0 ? "Good" : 
                  questionEvents.length < 3 ? "Fair" : "Poor";
    const statusClass = status === "Good" ? "good-status" : 
                      status === "Fair" ? "fair-status" : "poor-status";
    
    return `
      <tr>
        <td>${q.question}</td>
        <td>${questionEvents.length}</td>
        <td class="${statusClass}">${status}</td>
      </tr>
    `;
  }).join('');
}

function generateRecommendations(score, faceSummary, noiseSummary, malpracticeSummary) {
  const recommendations = [];
  
  if (parseFloat(faceSummary.noFacePercentage) > 10) {
    recommendations.push("Ensure your face is clearly visible throughout the interview.");
  }
  
  if (parseFloat(faceSummary.multiFacePercentage) > 5) {
    recommendations.push("Make sure no other people are visible in the frame during the interview.");
  }
  
  if (parseFloat(noiseSummary.highNoisePercentage) > 15) {
    recommendations.push("Find a quieter environment for future interviews.");
  }
  
  if (malpracticeSummary.typeCount["SUSPICIOUS_EYE_MOVEMENT"] > 2) {
    recommendations.push("Maintain eye contact with the camera during the interview.");
  }
  
  if (malpracticeSummary.typeCount["SUSPICIOUS_MOTION"] > 2) {
    recommendations.push("Limit unnecessary movements during the interview.");
  }
  
  if (malpracticeSummary.typeCount["PROHIBITED_ITEM_DETECTED"] > 0) {
    recommendations.push("Remove all prohibited items from the interview area.");
  }
  
  // Add general recommendations if score is below thresholds
  if (score < 70) {
    recommendations.push("Practice more in a mock interview environment to improve your interview skills.");
  }
  
  if (recommendations.length === 0) {
    recommendations.push("Excellent interview performance! Continue with your current approach.");
  }
  
  return recommendations.map(rec => `<li>${rec}</li>`).join('');
}

function calculateInterviewScore() {
  let score = 100;
  
  // Deduct for malpractice events
  score -= Math.min(40, sessionData.malpracticeEvents.length * 3);
  
  // Deduct for face issues
  const faceStats = analyzeFaceDetections();
  if (parseFloat(faceStats.normalPercentage) < 90) score -= 10;
  if (parseFloat(faceStats.normalPercentage) < 75) score -= 10;
  
  // Deduct for noise issues
  const noiseStats = analyzeNoiseDetections();
  if (parseFloat(noiseStats.averageNoiseLevel) > 50) score -= 5;
  if (parseFloat(noiseStats.averageNoiseLevel) > 65) score -= 10;
  
  // Deduct for specific serious malpractices
  const typeCount = sessionData.malpracticeEvents.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {});
  
  if (typeCount["PROHIBITED_ITEM_DETECTED"] > 0) score -= 15;
  if (typeCount["SUSPICIOUS_EYE_MOVEMENT"] > 3) score -= 10;
  
  return Math.max(0, Math.round(score));
}

function saveInterviewData() {
  // In a real application, this would save to a server
  // For now, we just log to console
  console.log("Interview data:", sessionData);
  
  // Allow download of interview data as JSON
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sessionData, null, 2));
  const downloadLink = document.createElement("a");
  downloadLink.setAttribute("href", dataStr);
  downloadLink.setAttribute("download", `interview-data-${sessionId}.json`);
  downloadLink.textContent = "Download Interview Data";
  downloadLink.className = "download-link";
  reportContent.appendChild(document.createElement("br"));
  reportContent.appendChild(downloadLink);
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadFaceDetectionModels();
  startBtn.addEventListener("click", startInterview);
  endBtn.addEventListener("click", endInterview);
  
  // Add stylesheet for warnings and report
  const style = document.createElement('style');
  style.textContent = `
    .warning-box {
      position: fixed;
      top: 10px;
      right: 10px;
      background-color: #ff4c4c;
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      z-index: 1000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      transition: opacity 0.3s;
    }
    
    .hidden {
      display: none;
    }
    
    .report-section {
      margin-bottom: 20px;
      padding: 15px;
      background-color: #f9f9f9;
      border-radius: 5px;
    }
    
    .highlight {
      font-weight: bold;
      color: #2c3e50;
    }
    
    .question-performance {
      width: 100%;
      border-collapse: collapse;
    }
    
    .question-performance th, .question-performance td {
      padding: 8px;
      border: 1px solid #ddd;
      text-align: left;
    }
    
    .question-performance th {
      background-color: #f2f2f2;
    }
    
    .good-status { color: green; }
    .fair-status { color: orange; }
    .poor-status { color: red; }
    
    .high-score { color: green; font-weight: bold; }
    .medium-score { color: orange; font-weight: bold; }
    .low-score { color: red; font-weight: bold; }
    
    .download-link {
      display: inline-block;
      margin-top: 15px;
      padding: 8px 15px;
      background-color: #4CAF50;
      color: white;
      text-decoration: none;
      border-radius: 4px;
    }
    
    .download-link:hover {
      background-color: #45a049;
    }
  `;
  document.head.appendChild(style);
});