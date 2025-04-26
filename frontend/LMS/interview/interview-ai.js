
// // interview-ai.js

// // Reusing and extending from existing logic
// // Initialize global variables
// const video = document.getElementById("video");
// const statusDisplay = document.getElementById("status");
// const noiseLevelDisplay = document.getElementById("noise-level");
// const questionDisplay = document.getElementById("question");
// const startBtn = document.getElementById("start-btn");
// const endBtn = document.getElementById("end-btn");
// const reportSection = document.getElementById("report-section");
// const reportContent = document.getElementById("report-content");

// let sessionData = {
//   startTime: null,
//   endTime: null,
//   faceDetections: [],
//   noiseDetections: [],
//   questions: [],
//   malpracticeEvents: []
// };

// let stream = null;
// let faceDetectionInterval = null;
// let audioAnalyzerInterval = null;
// let questionInterval = null;
// let sessionId = null;
// let currentQuestionIndex = 0;

// const interviewQuestions = {
//   "software": [
//     "Tell me about your experience with object-oriented programming.",
//     "How do you handle merge conflicts in Git?",
//     "Explain the difference between SQL and NoSQL databases.",
//     "How would you optimize a slow-performing website?",
//     "Describe your approach to testing software applications."
//   ],
//   "marketing": [
//     "How do you measure the success of a marketing campaign?",
//     "Describe a successful marketing strategy you implemented.",
//     "What metrics do you prioritize when analyzing marketing performance?",
//     "How do you stay updated with the latest marketing trends?",
//     "Explain how you would approach a product launch."
//   ],
//   "finance": [
//     "How do you evaluate the financial health of a company?",
//     "Explain the difference between cash flow and profit.",
//     "How would you build a financial model for a new project?",
//     "What financial metrics do you consider most important?",
//     "How do you approach risk management in financial decisions?"
//   ],
//   "general": [
//     "Tell me about yourself and your background.",
//     "What are your greatest strengths and weaknesses?",
//     "Describe a challenging situation and how you handled it.",
//     "Where do you see yourself in 5 years?",
//     "Why are you interested in this position?"
//   ]
// };

// async function loadFaceDetectionModels() {
//   try {
//     statusDisplay.textContent = "Status: Loading face detection models...";
//     await faceapi.nets.tinyFaceDetector.loadFromUri('./models');
//     statusDisplay.textContent = "Status: Ready to start interview";
//   } catch (error) {
//     statusDisplay.textContent = "Status: Failed to load face detection models";
//   }
// }

// function speakQuestion(text) {
//   const utterance = new SpeechSynthesisUtterance(text);
//   utterance.lang = "en-US";
//   speechSynthesis.speak(utterance);
// }

// async function startInterview() {
//   try {
//     sessionId = Date.now().toString();
//     sessionData.startTime = new Date().toISOString();
//     const domain = document.getElementById("domain-select").value;
//     const questions = interviewQuestions[domain];

//     stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//     video.srcObject = stream;
//     await video.play();

//     startBtn.disabled = true;
//     endBtn.disabled = false;
//     statusDisplay.textContent = "Status: Interview in progress";

//     currentQuestionIndex = 0;
//     displayAndSpeakQuestion(questions[currentQuestionIndex]);
//     sessionData.questions.push({
//       index: currentQuestionIndex,
//       question: questions[currentQuestionIndex],
//       time: new Date().toISOString()
//     });

//     startFaceDetection();
//     startAudioAnalysis();
//     startQuestionRotation(questions);

//   } catch (error) {
//     statusDisplay.textContent = "Status: Failed to start interview.";
//   }
// }

// function displayAndSpeakQuestion(question) {
//   questionDisplay.textContent = "Question: " + question;
//   speakQuestion(question);
// }

// function startQuestionRotation(questions) {
//   questionInterval = setInterval(() => {
//     currentQuestionIndex = (currentQuestionIndex + 1) % questions.length;
//     const question = questions[currentQuestionIndex];
//     displayAndSpeakQuestion(question);

//     sessionData.questions.push({
//       index: currentQuestionIndex,
//       question: question,
//       time: new Date().toISOString()
//     });
//   }, 60000);
// }

// function endInterview() {
//   if (faceDetectionInterval) clearInterval(faceDetectionInterval);
//   if (audioAnalyzerInterval) clearInterval(audioAnalyzerInterval);
//   if (questionInterval) clearInterval(questionInterval);

//   if (stream) {
//     stream.getTracks().forEach(track => track.stop());
//     video.srcObject = null;
//   }

//   sessionData.endTime = new Date().toISOString();
//   startBtn.disabled = false;
//   endBtn.disabled = true;
//   statusDisplay.textContent = "Status: Interview completed";
//   questionDisplay.textContent = "Question: Interview completed";
//   noiseLevelDisplay.textContent = "Noise Level: N/A";

//   generateInterviewReport();
// }

// function startFaceDetection() {
//   faceDetectionInterval = setInterval(async () => {
//     if (!video || !video.videoWidth) return;

//     try {
//       const detections = await faceapi.detectAllFaces(
//         video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
//       );

//       const data = {
//         timestamp: new Date().toISOString(),
//         faceCount: detections.length,
//         questionIndex: currentQuestionIndex
//       };

//       sessionData.faceDetections.push(data);

//       if (detections.length === 0) logMalpractice("NO_FACE_DETECTED", data);
//       else if (detections.length > 1) logMalpractice("MULTIPLE_FACES_DETECTED", data);

//     } catch (error) {
//       console.error("Face detection error:", error);
//     }
//   }, 2000);
// }

// function startAudioAnalysis() {
//   const audioContext = new AudioContext();
//   const analyser = audioContext.createAnalyser();
//   const microphone = audioContext.createMediaStreamSource(stream);

//   analyser.fftSize = 1024;
//   analyser.smoothingTimeConstant = 0.8;
//   microphone.connect(analyser);

//   const dataArray = new Uint8Array(analyser.frequencyBinCount);

//   audioAnalyzerInterval = setInterval(() => {
//     analyser.getByteFrequencyData(dataArray);
//     const avg = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
//     const level = Math.round(avg);
//     noiseLevelDisplay.textContent = `Noise Level: ${level} dB`;

//     const noiseData = {
//       timestamp: new Date().toISOString(),
//       level: level,
//       questionIndex: currentQuestionIndex
//     };

//     sessionData.noiseDetections.push(noiseData);
//     if (level > 70) logMalpractice("HIGH_NOISE_LEVEL", noiseData);

//   }, 1000);
// }

// function logMalpractice(type, data) {
//   sessionData.malpracticeEvents.push({ type, timestamp: new Date().toISOString(), data });
// }

// function generateInterviewReport() {
//   const score = calculateInterviewScore();
//   const faceSummary = analyzeFaceDetections();
//   const noiseSummary = analyzeNoiseDetections();

//   reportSection.classList.remove("hidden");
//   reportContent.innerHTML = `
//     <p><span class="highlight">Duration:</span> ${(new Date(sessionData.endTime) - new Date(sessionData.startTime)) / 1000} seconds</p>
//     <p><span class="highlight">Questions Answered:</span> ${sessionData.questions.length}</p>
//     <p><span class="highlight">Malpractice Events:</span> ${sessionData.malpracticeEvents.length}</p>
//     <p><span class="highlight">Final Score:</span> ${score}/100</p>
//     <p><span class="highlight">Face Presence Accuracy:</span> ${faceSummary.normalPercentage}%</p>
//     <p><span class="highlight">Average Noise Level:</span> ${noiseSummary.averageNoiseLevel} dB</p>
//   `;
// }

// function analyzeFaceDetections() {
//   const total = sessionData.faceDetections.length;
//   const noFace = sessionData.faceDetections.filter(d => d.faceCount === 0).length;
//   const multiFace = sessionData.faceDetections.filter(d => d.faceCount > 1).length;
//   const normal = total - noFace - multiFace;

//   return {
//     normalPercentage: ((normal / total) * 100).toFixed(1)
//   };
// }

// function analyzeNoiseDetections() {
//   const levels = sessionData.noiseDetections.map(d => d.level);
//   const average = levels.reduce((sum, val) => sum + val, 0) / levels.length;
//   return { averageNoiseLevel: average.toFixed(1) };
// }

// function calculateInterviewScore() {
//   let score = 100;
//   score -= sessionData.malpracticeEvents.length * 5;
//   const faceStats = analyzeFaceDetections();
//   if (faceStats.normalPercentage < 90) score -= 10;
//   const noiseStats = analyzeNoiseDetections();
//   if (noiseStats.averageNoiseLevel > 60) score -= 5;
//   return Math.max(0, Math.round(score));
// }

// document.addEventListener("DOMContentLoaded", async () => {
//   await loadFaceDetectionModels();
//   startBtn.addEventListener("click", startInterview);
//   endBtn.addEventListener("click", endInterview);
// });




// Initialize global variables
const video = document.getElementById("video");
const statusDisplay = document.getElementById("status");
const noiseLevelDisplay = document.getElementById("noise-level");
const questionDisplay = document.getElementById("question");
const startBtn = document.getElementById("start-btn");
const endBtn = document.getElementById("end-btn");
const reportSection = document.getElementById("report-section");
const reportContent = document.getElementById("report-content");
const warningDisplay = document.getElementById("warning-display"); // New element for warnings

let sessionData = {
  startTime: null,
  endTime: null,
  faceDetections: [],
  noiseDetections: [],
  questions: [],
  malpracticeEvents: []
};

let stream = null;
let faceDetectionInterval = null;
let audioAnalyzerInterval = null;
let questionInterval = null;
let sessionId = null;
let currentQuestionIndex = 0;
let lastWarningTimestamp = {};

const interviewQuestions = {
  // same as before...
};

async function loadFaceDetectionModels() {
  try {
    statusDisplay.textContent = "Status: Loading face detection models...";
    await faceapi.nets.tinyFaceDetector.loadFromUri('./models');
    statusDisplay.textContent = "Status: Ready to start interview";
  } catch (error) {
    statusDisplay.textContent = "Status: Failed to load face detection models";
  }
}

function showWarning(message, type) {
  const now = Date.now();
  if (lastWarningTimestamp[type] && now - lastWarningTimestamp[type] < 5000) return;

  lastWarningTimestamp[type] = now;
  warningDisplay.innerHTML = `<div class="alert">${message}</div>`;
  warningDisplay.classList.remove("hidden");

  setTimeout(() => {
    warningDisplay.classList.add("hidden");
    warningDisplay.innerHTML = "";
  }, 4000);
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

    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    video.srcObject = stream;
    await video.play();

    startBtn.disabled = true;
    endBtn.disabled = false;
    statusDisplay.textContent = "Status: Interview in progress";

    currentQuestionIndex = 0;
    displayAndSpeakQuestion(questions[currentQuestionIndex]);
    sessionData.questions.push({
      index: currentQuestionIndex,
      question: questions[currentQuestionIndex],
      time: new Date().toISOString()
    });

    startFaceDetection();
    startAudioAnalysis();
    startQuestionRotation(questions);

  } catch (error) {
    statusDisplay.textContent = "Status: Failed to start interview.";
  }
}

function displayAndSpeakQuestion(question) {
  questionDisplay.textContent = "Question: " + question;
  speakQuestion(question);
}

function startQuestionRotation(questions) {
  questionInterval = setInterval(() => {
    currentQuestionIndex = (currentQuestionIndex + 1) % questions.length;
    const question = questions[currentQuestionIndex];
    displayAndSpeakQuestion(question);

    sessionData.questions.push({
      index: currentQuestionIndex,
      question: question,
      time: new Date().toISOString()
    });
  }, 60000);
}

function endInterview() {
  clearInterval(faceDetectionInterval);
  clearInterval(audioAnalyzerInterval);
  clearInterval(questionInterval);

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

  generateInterviewReport();
}

function startFaceDetection() {
  faceDetectionInterval = setInterval(async () => {
    if (!video || !video.videoWidth) return;

    try {
      const detections = await faceapi.detectAllFaces(
        video, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 })
      );

      const data = {
        timestamp: new Date().toISOString(),
        faceCount: detections.length,
        questionIndex: currentQuestionIndex
      };

      sessionData.faceDetections.push(data);

      if (detections.length === 0) {
        logMalpractice("NO_FACE_DETECTED", data);
        showWarning("⚠️ No face detected. Please stay visible on screen.", "no_face");
      } else if (detections.length > 1) {
        logMalpractice("MULTIPLE_FACES_DETECTED", data);
        showWarning("⚠️ Multiple faces detected. Ensure you're alone.", "multi_face");
      }

    } catch (error) {
      console.error("Face detection error:", error);
    }
  }, 1500);
}

function startAudioAnalysis() {
  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();
  const microphone = audioContext.createMediaStreamSource(stream);

  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.7;
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
    if (level > 65) {
      logMalpractice("HIGH_NOISE_LEVEL", noiseData);
      showWarning("⚠️ High background noise. Please find a quieter environment.", "high_noise");
    }

  }, 1000);
}

function logMalpractice(type, data) {
  sessionData.malpracticeEvents.push({ type, timestamp: new Date().toISOString(), data });
}

function generateInterviewReport() {
  const score = calculateInterviewScore();
  const faceSummary = analyzeFaceDetections();
  const noiseSummary = analyzeNoiseDetections();

  reportSection.classList.remove("hidden");
  reportContent.innerHTML = `
    <p><span class="highlight">Duration:</span> ${(new Date(sessionData.endTime) - new Date(sessionData.startTime)) / 1000} seconds</p>
    <p><span class="highlight">Questions Answered:</span> ${sessionData.questions.length}</p>
    <p><span class="highlight">Malpractice Events:</span> ${sessionData.malpracticeEvents.length}</p>
    <p><span class="highlight">Final Score:</span> ${score}/100</p>
    <p><span class="highlight">Face Presence Accuracy:</span> ${faceSummary.normalPercentage}%</p>
    <p><span class="highlight">Average Noise Level:</span> ${noiseSummary.averageNoiseLevel} dB</p>
  `;
}

function analyzeFaceDetections() {
  const total = sessionData.faceDetections.length;
  const noFace = sessionData.faceDetections.filter(d => d.faceCount === 0).length;
  const multiFace = sessionData.faceDetections.filter(d => d.faceCount > 1).length;
  const normal = total - noFace - multiFace;

  return {
    normalPercentage: ((normal / total) * 100).toFixed(1)
  };
}

function analyzeNoiseDetections() {
  const levels = sessionData.noiseDetections.map(d => d.level);
  const average = levels.reduce((sum, val) => sum + val, 0) / levels.length;
  return { averageNoiseLevel: average.toFixed(1) };
}

function calculateInterviewScore() {
  let score = 100;
  score -= sessionData.malpracticeEvents.length * 5;
  const faceStats = analyzeFaceDetections();
  if (faceStats.normalPercentage < 90) score -= 10;
  const noiseStats = analyzeNoiseDetections();
  if (noiseStats.averageNoiseLevel > 60) score -= 5;
  return Math.max(0, Math.round(score));
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadFaceDetectionModels();
  startBtn.addEventListener("click", startInterview);
  endBtn.addEventListener("click", endInterview);
});
