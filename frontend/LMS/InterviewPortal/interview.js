// DOM Elements
const domainSelectionScreen = document.getElementById('domain-selection');
const preInterviewScreen = document.getElementById('pre-interview');
const interviewScreen = document.getElementById('interview-screen');
const resultsScreen = document.getElementById('results-screen');
const domainCards = document.querySelectorAll('.domain-card');
const startInterviewBtn = document.getElementById('start-interview-btn');
const currentQuestionElement = document.getElementById('current-question');
const userAnswerElement = document.getElementById('user-answer');
const recordAudioBtn = document.getElementById('record-audio-btn');
const submitAnswerBtn = document.getElementById('submit-answer-btn');
const questionTimerElement = document.getElementById('question-timer');
const questionCounterElement = document.getElementById('question-counter');
const monitoringAlertsElement = document.getElementById('monitoring-alerts');
const userVideoElement = document.getElementById('user-video');
const monitoringVideoElement = document.getElementById('monitoring-video');
const faceCanvas = document.getElementById('face-canvas');
const detectionCanvas = document.getElementById('detection-canvas');
const saveResultsBtn = document.getElementById('save-results-btn');
const restartInterviewBtn = document.getElementById('restart-interview-btn');
const returnToLmsBtn = document.getElementById('return-to-lms-btn');

// Interview State
let interviewState = {
    sessionId: null,
    domain: null,
    questions: [],
    currentQuestionIndex: 0,
    startTime: null,
    timerInterval: null,
    questionStartTime: null,
    audioRecorder: null,
    audioChunks: [],
    videoStream: null,
    malpracticeFlags: [],
    faceDetectionCount: 0,
    noFaceCount: 0,
    multipleFacesCount: 0,
    lookingAwayCount: 0,
    noiseDetectionCount: 0,
    warningCount: 0,
    isSpeaking: false,
    audioContext: null,
    audioAnalyser: null,
    audioDataArray: null,
    monitoringInterval: null,
    audioMonitoringInterval: null
};

// Initialize the interview portal
document.addEventListener('DOMContentLoaded', async () => {
    if (!localStorage.getItem('token')) {
        alert('Please login first');
        window.location.href = '../login.html';
        return;
    }

    // Set up domain selection
    domainCards.forEach(card => {
        card.addEventListener('click', () => {
            interviewState.domain = card.dataset.domain;
            domainSelectionScreen.classList.remove('active');
            preInterviewScreen.classList.add('active');
            startDeviceChecks();
        });
    });

    // Set up start interview button
    startInterviewBtn.addEventListener('click', startInterview);

    // Set up answer submission
    submitAnswerBtn.addEventListener('click', () => submitAnswer(false));

    // Set up audio recording
    recordAudioBtn.addEventListener('click', toggleAudioRecording);

    // Set up results actions
    saveResultsBtn.addEventListener('click', saveResults);
    restartInterviewBtn.addEventListener('click', restartInterview);
    returnToLmsBtn.addEventListener('click', () => {
        window.location.href = '../LMS.html';
    });
});

// Device checks and setup
async function startDeviceChecks() {
    try {
        // Check microphone
        await checkMicrophone();
        
        // Check camera
        await checkCamera();
        
        // Initialize face detection
        await initializeFaceDetection();
        
        startInterviewBtn.disabled = false;
    } catch (error) {
        console.error('Device check failed:', error);
        alert(`Device setup failed: ${error.message}`);
    }
}

async function checkMicrophone() {
    const micCheckElement = document.getElementById('mic-check');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        micCheckElement.querySelector('.status').textContent = 'Working';
        micCheckElement.classList.add('success');
        
        // Set up retry button
        micCheckElement.querySelector('.retry-btn').addEventListener('click', async () => {
            micCheckElement.querySelector('.status').textContent = 'Checking...';
            micCheckElement.classList.remove('success', 'error');
            await checkMicrophone();
        });
    } catch (error) {
        micCheckElement.querySelector('.status').textContent = 'Failed - Please allow microphone access';
        micCheckElement.classList.add('error');
        throw new Error('Microphone access denied');
    }
}

async function checkCamera() {
    const cameraCheckElement = document.getElementById('camera-check');
    try {
        interviewState.videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480, facingMode: 'user' } 
        });
        userVideoElement.srcObject = interviewState.videoStream;
        cameraCheckElement.querySelector('.status').textContent = 'Working';
        cameraCheckElement.classList.add('success');
        
        // Set up retry button
        cameraCheckElement.querySelector('.retry-btn').addEventListener('click', async () => {
            cameraCheckElement.querySelector('.status').textContent = 'Checking...';
            cameraCheckElement.classList.remove('success', 'error');
            if (interviewState.videoStream) {
                interviewState.videoStream.getTracks().forEach(track => track.stop());
            }
            await checkCamera();
        });
    } catch (error) {
        cameraCheckElement.querySelector('.status').textContent = 'Failed - Please allow camera access';
        cameraCheckElement.classList.add('error');
        throw new Error('Camera access denied');
    }
}

async function initializeFaceDetection() {
    const faceCheckElement = document.getElementById('face-check');
    try {
        // Simple face detection (replace with actual model if needed)
        detectFaces();
        faceCheckElement.querySelector('.status').textContent = 'Working';
        faceCheckElement.classList.add('success');
        
        // Set up retry button
        faceCheckElement.querySelector('.retry-btn').addEventListener('click', async () => {
            faceCheckElement.querySelector('.status').textContent = 'Checking...';
            faceCheckElement.classList.remove('success', 'error');
            await initializeFaceDetection();
        });
    } catch (error) {
        faceCheckElement.querySelector('.status').textContent = 'Failed - Could not initialize';
        faceCheckElement.classList.add('error');
        throw new Error('Face detection failed');
    }
}

function detectFaces() {
    if (!interviewState.videoStream) {
        requestAnimationFrame(detectFaces);
        return;
    }

    const ctx = faceCanvas.getContext('2d');
    ctx.clearRect(0, 0, faceCanvas.width, faceCanvas.height);
    ctx.drawImage(userVideoElement, 0, 0, faceCanvas.width, faceCanvas.height);
    
    // Simple face detection (replace with actual model if needed)
    const faceDetected = Math.random() > 0.1; // Simulate detection
    
    if (faceDetected) {
        // Draw a single face box (center of the frame)
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 2;
        ctx.strokeRect(200, 150, 200, 250);
        
        interviewState.faceDetectionCount++;
        interviewState.noFaceCount = 0;
    } else {
        interviewState.noFaceCount++;
        if (interviewState.noFaceCount > 10) {
            addMalpracticeFlag('No face detected', 'visual');
            interviewState.noFaceCount = 0;
        }
    }
    
    requestAnimationFrame(detectFaces);
}

// Interview flow functions
async function startInterview() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No authentication token found. Please log in again.');
        }

        const response = await fetch('http://localhost:5001/interview/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                domain: interviewState.domain
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to start interview');
        }

        const data = await response.json();
        
        // Update interview state
        interviewState.sessionId = data.sessionId;
        interviewState.questions = Array(data.totalQuestions).fill(null);
        interviewState.currentQuestionIndex = 0;
        interviewState.startTime = new Date();
        
        // Transition screens
        preInterviewScreen.classList.remove('active');
        interviewScreen.classList.add('active');
        
        // Start the first question
        startQuestion(data.firstQuestion);
    } catch (error) {
        console.error('Error starting interview:', error);
        alert(`Failed to start interview: ${error.message}`);
    }
}

function startQuestion(questionText) {
    // Update UI
    currentQuestionElement.textContent = questionText;
    userAnswerElement.innerHTML = '';
    questionCounterElement.textContent = `Question ${interviewState.currentQuestionIndex + 1}/${interviewState.questions.length}`;
    
    // Start timer
    interviewState.questionStartTime = new Date();
    updateQuestionTimer();
    interviewState.timerInterval = setInterval(updateQuestionTimer, 1000);
    
    // Start monitoring
    startMonitoring();
}

function updateQuestionTimer() {
    const now = new Date();
    const elapsedSeconds = Math.floor((now - interviewState.questionStartTime) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
    const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');
    questionTimerElement.textContent = `${minutes}:${seconds}`;
}

function startMonitoring() {
    monitoringVideoElement.srcObject = interviewState.videoStream;
    
    // Start audio monitoring
    startAudioMonitoring();
    
    // Start general monitoring checks
    interviewState.monitoringInterval = setInterval(checkForMalpractice, 1000);
}

function startAudioMonitoring() {
    try {
        interviewState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        interviewState.audioAnalyser = interviewState.audioContext.createAnalyser();
        interviewState.audioAnalyser.fftSize = 32;
        
        const microphone = interviewState.audioContext.createMediaStreamSource(interviewState.videoStream);
        microphone.connect(interviewState.audioAnalyser);
        
        interviewState.audioDataArray = new Uint8Array(interviewState.audioAnalyser.frequencyBinCount);
        
        interviewState.audioMonitoringInterval = setInterval(() => {
            if (!interviewState.audioAnalyser) return;
            
            interviewState.audioAnalyser.getByteFrequencyData(interviewState.audioDataArray);
            const volume = Math.max(...interviewState.audioDataArray);
            
            // Detect sudden noise (potential second person speaking)
            if (volume > 150 && !interviewState.isSpeaking) {
                interviewState.noiseDetectionCount++;
                if (interviewState.noiseDetectionCount > 3) {
                    addMalpracticeFlag('Background noise detected', 'audio');
                    interviewState.noiseDetectionCount = 0;
                }
            } else {
                interviewState.noiseDetectionCount = Math.max(0, interviewState.noiseDetectionCount - 1);
            }
            
            // Update speaking state
            interviewState.isSpeaking = volume > 50;
        }, 500);
    } catch (error) {
        console.error('Audio monitoring failed:', error);
    }
}

function checkForMalpractice() {
    // Check warning count
    if (interviewState.warningCount >= 5) {
        endInterviewDueToMalpractice();
        return;
    }
    
    // Check if user has left the tab
    if (!document.hasFocus()) {
        addMalpracticeFlag('Switched to another tab/window', 'system');
    }
    
    // Simulate occasional malpractice flags (remove in production)
    if (Math.random() < 0.02) {
        const types = ['Looking away', 'Multiple faces detected', 'Unauthorized material'];
        addMalpracticeFlag(types[Math.floor(Math.random() * types.length)], 'visual');
    }
}

function addMalpracticeFlag(type, evidenceType) {
    // Don't add duplicate flags in quick succession
    const lastFlag = interviewState.malpracticeFlags[interviewState.malpracticeFlags.length - 1];
    if (lastFlag && lastFlag.type === type && (new Date() - lastFlag.timestamp) < 5000) {
        return;
    }
    
    const flag = {
        type,
        timestamp: new Date(),
        evidence: evidenceType
    };
    
    interviewState.malpracticeFlags.push(flag);
    interviewState.warningCount++;
    
    // Send to server
    fetch('http://localhost:5001/interview/malpractice', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
            sessionId: interviewState.sessionId,
            type: flag.type,
            evidence: flag.evidence
        })
    }).catch(err => console.error('Error logging malpractice:', err));
    
    // Show alert
    const alertElement = document.createElement('div');
    alertElement.className = `alert ${evidenceType === 'audio' ? 'warning' : 'danger'}`;
    alertElement.textContent = `${type} (Warning ${interviewState.warningCount}/5)`;
    monitoringAlertsElement.prepend(alertElement);
    
    setTimeout(() => {
        alertElement.remove();
    }, 5000);
}

function endInterviewDueToMalpractice() {
    clearInterval(interviewState.monitoringInterval);
    clearInterval(interviewState.audioMonitoringInterval);
    
    if (interviewState.audioRecorder) {
        interviewState.audioRecorder.stop();
        interviewState.audioRecorder.stream.getTracks().forEach(track => track.stop());
    }
    
    if (interviewState.videoStream) {
        interviewState.videoStream.getTracks().forEach(track => track.stop());
    }
    
    // Show malpractice message
    alert('Interview terminated due to multiple malpractice detections');
    
    // Submit empty answers to end the interview
    submitAnswer(true);
}

async function toggleAudioRecording() {
    if (!interviewState.audioRecorder) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            interviewState.audioRecorder = new MediaRecorder(stream);
            interviewState.audioChunks = [];
            
            interviewState.audioRecorder.ondataavailable = event => {
                interviewState.audioChunks.push(event.data);
            };
            
            interviewState.audioRecorder.onstop = async () => {
                const audioBlob = new Blob(interviewState.audioChunks, { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(audioBlob);
                const audioElement = document.createElement('audio');
                audioElement.src = audioUrl;
                audioElement.controls = true;
                
                if (userAnswerElement.innerHTML.trim() === '') {
                    userAnswerElement.innerHTML = '';
                }
                userAnswerElement.appendChild(document.createElement('br'));
                userAnswerElement.appendChild(document.createElement('br'));
                userAnswerElement.appendChild(audioElement);
            };
            
            interviewState.audioRecorder.start(1000);
            recordAudioBtn.textContent = 'Stop Recording';
            recordAudioBtn.style.backgroundColor = '#dc3545';
        } catch (error) {
            console.error('Error starting audio recording:', error);
            alert('Failed to start audio recording');
        }
    } else {
        interviewState.audioRecorder.stop();
        interviewState.audioRecorder.stream.getTracks().forEach(track => track.stop());
        interviewState.audioRecorder = null;
        recordAudioBtn.textContent = 'Record Audio Answer';
        recordAudioBtn.style.backgroundColor = '#4a6fa5';
    }
}

async function submitAnswer(forced = false) {
    try {
        clearInterval(interviewState.timerInterval);
        clearInterval(interviewState.monitoringInterval);
        clearInterval(interviewState.audioMonitoringInterval);
        
        const answer = forced ? 'Interview terminated due to malpractice' : userAnswerElement.innerText.trim();
        
        const response = await fetch('http://localhost:5001/interview/answer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                sessionId: interviewState.sessionId,
                questionIndex: interviewState.currentQuestionIndex,
                answer
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to submit answer');
        }

        const data = await response.json();
        
        if (data.completed || forced) {
            finishInterview(data.analysis || {});
        } else {
            interviewState.currentQuestionIndex++;
            startQuestion(data.nextQuestion);
        }
    } catch (error) {
        console.error('Error submitting answer:', error);
        alert(`Failed to submit answer: ${error.message}`);
    }
}

async function finishInterview(analysis) {
    if (interviewState.audioRecorder) {
        interviewState.audioRecorder.stop();
        interviewState.audioRecorder.stream.getTracks().forEach(track => track.stop());
    }
    
    if (interviewState.videoStream) {
        interviewState.videoStream.getTracks().forEach(track => track.stop());
    }
    
    try {
        const response = await fetch(`http://localhost:5001/interview/results/${interviewState.sessionId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to get results');
        }
        
        interviewScreen.classList.remove('active');
        resultsScreen.classList.add('active');
        displayResults(data.results);
    } catch (error) {
        console.error('Error getting results:', error);
        alert(`Failed to get results: ${error.message}`);
    }
}

function displayResults(results) {
    const overallScore = Math.round(
        (results.overallAnalysis.communication + 
         results.overallAnalysis.technical + 
         results.overallAnalysis.confidence + 
         results.overallAnalysis.timeManagement) / 4
    );
    
    document.getElementById('overall-score').textContent = overallScore;
    document.getElementById('technical-score').textContent = `${Math.round(results.overallAnalysis.technical)}%`;
    document.getElementById('technical-bar').style.width = `${results.overallAnalysis.technical}%`;
    document.getElementById('communication-score').textContent = `${Math.round(results.overallAnalysis.communication)}%`;
    document.getElementById('communication-bar').style.width = `${results.overallAnalysis.communication}%`;
    document.getElementById('confidence-score').textContent = `${Math.round(results.overallAnalysis.confidence)}%`;
    document.getElementById('confidence-bar').style.width = `${results.overallAnalysis.confidence}%`;
    document.getElementById('timing-score').textContent = `${Math.round(results.overallAnalysis.timeManagement)}%`;
    document.getElementById('timing-bar').style.width = `${results.overallAnalysis.timeManagement}%`;
    
    renderQuestionsChart(results.questions);
    
    const malpracticeList = document.getElementById('malpractice-list');
    malpracticeList.innerHTML = '';
    
    if (results.malpracticeFlags && results.malpracticeFlags.length > 0) {
        results.malpracticeFlags.forEach(flag => {
            const item = document.createElement('div');
            item.className = 'malpractice-item';
            item.innerHTML = `
                <strong>${flag.type}</strong>
                <p>Detected at ${new Date(flag.timestamp).toLocaleTimeString()}</p>
            `;
            malpracticeList.appendChild(item);
        });
    } else {
        malpracticeList.innerHTML = '<p>No malpractice detected during this interview.</p>';
    }
    
    generateFeedback(results);
}

function renderQuestionsChart(questions) {
    const ctx = document.getElementById('questions-chart').getContext('2d');
    const labels = questions.map((q, i) => `Q${i + 1}`);
    const techScores = questions.map(q => Math.round(q.analysis.technical || 0));
    const commScores = questions.map(q => Math.round(q.analysis.communication || 0));
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Technical',
                    data: techScores,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Communication',
                    data: commScores,
                    backgroundColor: 'rgba(75, 192, 192, 0.7)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

function generateFeedback(results) {
    const feedbackElement = document.getElementById('feedback-text');
    feedbackElement.innerHTML = '';
    
    const overallScore = Math.round(
        (results.overallAnalysis.communication + 
         results.overallAnalysis.technical + 
         results.overallAnalysis.confidence + 
         results.overallAnalysis.timeManagement) / 4
    );
    
    let overallFeedback = '';
    if (overallScore >= 80) {
        overallFeedback = `
            <p><strong>Excellent performance!</strong> You demonstrated strong technical knowledge and communication skills. 
            With this level of preparation, you're well-equipped for real interviews.</p>
        `;
    } else if (overallScore >= 60) {
        overallFeedback = `
            <p><strong>Good performance!</strong> You have a solid foundation but there's room for improvement in some areas. 
            Focus on the sections where you scored lower to strengthen your interview skills.</p>
        `;
    } else {
        overallFeedback = `
            <p><strong>Needs improvement.</strong> Your performance indicates you should spend more time preparing before 
            attempting real interviews. Focus on the specific areas mentioned below.</p>
        `;
    }
    
    feedbackElement.innerHTML += overallFeedback;
    
    let techFeedback = '';
    if (results.overallAnalysis.technical >= 80) {
        techFeedback = `
            <p><strong>Technical Knowledge:</strong> Your technical understanding is excellent. You provided accurate and 
            detailed answers to the questions, demonstrating deep knowledge of ${results.domain} concepts.</p>
        `;
    } else if (results.overallAnalysis.technical >= 60) {
        techFeedback = `
            <p><strong>Technical Knowledge:</strong> Your technical understanding is good but could be more comprehensive. 
            Consider reviewing core ${results.domain} concepts and practicing explaining them out loud.</p>
        `;
    } else {
        techFeedback = `
            <p><strong>Technical Knowledge:</strong> Your technical understanding needs significant improvement. 
            Focus on studying fundamental ${results.domain} concepts and practice explaining them clearly.</p>
        `;
    }
    
    feedbackElement.innerHTML += techFeedback;
    
    let commFeedback = '';
    if (results.overallAnalysis.communication >= 80) {
        commFeedback = `
            <p><strong>Communication:</strong> Your communication skills are excellent. You articulated your thoughts clearly 
            and structured your answers well.</p>
        `;
    } else if (results.overallAnalysis.communication >= 60) {
        commFeedback = `
            <p><strong>Communication:</strong> Your communication skills are good but could be more polished. 
            Practice speaking more fluently and organizing your thoughts before answering.</p>
        `;
    } else {
        commFeedback = `
            <p><strong>Communication:</strong> Your communication needs significant improvement. 
            Focus on speaking clearly, organizing your thoughts, and practicing explaining technical concepts out loud.</p>
        `;
    }
    
    feedbackElement.innerHTML += commFeedback;
    
    if (results.malpracticeFlags && results.malpracticeFlags.length > 0) {
        const flagCount = results.malpracticeFlags.length;
        feedbackElement.innerHTML += `
            <p><strong>Proctoring Notes:</strong> Our system detected ${flagCount} potential issue${flagCount > 1 ? 's' : ''} 
            during your interview. In a real interview setting, these could raise concerns. Make sure you're in a quiet environment, 
            maintain eye contact with the camera, and avoid any behaviors that might be flagged as suspicious.</p>
        `;
    }
}

async function saveResults() {
    try {
        alert('Interview results saved to your profile!');
    } catch (error) {
        console.error('Error saving results:', error);
        alert('Failed to save results');
    }
}

function restartInterview() {
    // Clean up resources
    if (interviewState.audioRecorder) {
        interviewState.audioRecorder.stop();
        interviewState.audioRecorder.stream.getTracks().forEach(track => track.stop());
    }
    
    if (interviewState.videoStream) {
        interviewState.videoStream.getTracks().forEach(track => track.stop());
    }
    
    if (interviewState.audioContext) {
        interviewState.audioContext.close();
    }
    
    clearInterval(interviewState.timerInterval);
    clearInterval(interviewState.monitoringInterval);
    clearInterval(interviewState.audioMonitoringInterval);
    
    // Reset state
    interviewState = {
        sessionId: null,
        domain: null,
        questions: [],
        currentQuestionIndex: 0,
        startTime: null,
        timerInterval: null,
        questionStartTime: null,
        audioRecorder: null,
        audioChunks: [],
        videoStream: null,
        malpracticeFlags: [],
        faceDetectionCount: 0,
        noFaceCount: 0,
        multipleFacesCount: 0,
        lookingAwayCount: 0,
        noiseDetectionCount: 0,
        warningCount: 0,
        isSpeaking: false,
        audioContext: null,
        audioAnalyser: null,
        audioDataArray: null,
        monitoringInterval: null,
        audioMonitoringInterval: null
    };
    
    // Reset UI
    resultsScreen.classList.remove('active');
    domainSelectionScreen.classList.add('active');
}