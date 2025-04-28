document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const setupSection = document.getElementById('interview-setup');
    const sessionSection = document.getElementById('interview-session');
    const resultsSection = document.getElementById('interview-results');
    
    // Setup Elements
    const startInterviewBtn = document.getElementById('start-interview');
    const checkCameraBtn = document.getElementById('check-camera');
    const checkMicrophoneBtn = document.getElementById('check-microphone');
    // const checkSpeakerBtn = document.getElementById('check-speaker');
  
  
    const previewContainer = document.getElementById('preview-container');
    const cameraPreview = document.getElementById('camera-preview');
    const audioVisualizer = document.getElementById('audio-visualizer');
    
    // Session Elements
    const userVideo = document.getElementById('user-video');
    const currentQuestionEl = document.getElementById('current-question');
    const timerBar = document.getElementById('timer-bar');
    const answerTimeRemaining = document.getElementById('answer-time-remaining');
    const remainingTimeEl = document.getElementById('remaining-time');
    const warningCountEl = document.getElementById('warning-count');
    const warningsList = document.getElementById('warnings-list');
    const muteToggleBtn = document.getElementById('mute-toggle');
    const cameraToggleBtn = document.getElementById('camera-toggle');
    const nextQuestionBtn = document.getElementById('next-question');
    const endInterviewBtn = document.getElementById('end-interview');
    
    // Modals
    const warningModal = document.getElementById('warning-modal');
    const warningMessage = document.getElementById('warning-message');
    const acknowledgeWarningBtn = document.getElementById('acknowledge-warning');
    const endConfirmationModal = document.getElementById('end-confirmation-modal');
    const confirmEndBtn = document.getElementById('confirm-end');
    const cancelEndBtn = document.getElementById('cancel-end');
    
    // Results Elements
    const finalScoreEl = document.getElementById('final-score');
    const questionsAnsweredEl = document.getElementById('questions-answered');
    const totalWarningsEl = document.getElementById('total-warnings');
    const interviewDurationEl = document.getElementById('interview-duration');
    const feedbackContentEl = document.getElementById('feedback-content');
    const questionBreakdownEl = document.getElementById('question-breakdown-content');
    const downloadReportBtn = document.getElementById('download-report');
    const newInterviewBtn = document.getElementById('new-interview');
    const returnDashboardBtn = document.getElementById('return-dashboard');
  
    // ==================== USER PROFILE AND LOGOUT FUNCTIONALITY ====================
  
    const usernameDisplay = document.getElementById('usernameDisplay');
    const logoutButton = document.getElementById('logoutButton');
  
    // Display the logged-in username
    const username = localStorage.getItem('username');
    if (username) {
        usernameDisplay.textContent = username;
    } else {
        // If no username is found, redirect to login page
        window.location.href = 'http://127.0.0.1:5500/frontend/index.html';
    }
  
    // Handle logout
    logoutButton.addEventListener('click', async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                // Call the logout API
                await fetch('http://localhost:5001/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
  
                // Clear local storage
                localStorage.removeItem('token');
                localStorage.removeItem('username');
  
                // Redirect to login page
                window.location.href = 'http://127.0.0.1:5500/frontend/index.html';
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
    });
    // App State
    let deviceCheckStatus = {
        camera: false,
        microphone: false,
        // speaker: false
    };
    
    let interviewState = {
        started: false,
        currentQuestionIndex: 0,
        totalQuestions: 0,
        questions: [],
        answers: [],
        warnings: [],
        warningCount: 0,
        startTime: null,
        endTime: null,
        interviewType: '',
        difficulty: '',
        position: '',
        totalScore: 0,
        questionScores: [],
        questionFeedback: [],
        remainingTime: 0,
        answerTimer: null,
        interviewTimer: null,
        isMuted: false,
        isCameraOff: false,
        stream: null,
        audioAnalyser: null,
        faceDetectionInterval: null,
        noiseDetectionInterval: null
    };
  
    // Mock question banks (to be replaced with API calls)
    const questionBanks = {
        technical: {
            beginner: [
                "Tell me about your experience with HTML, CSS, and JavaScript.",
                "What is the difference between var, let, and const in JavaScript?",
                "Explain the box model in CSS.",
                "What is the DOM and how do you interact with it?",
                "Describe the difference between == and === in JavaScript."
            ],
            intermediate: [
                "Explain the concept of closures in JavaScript.",
                "What are Promises and how do they work?",
                "Describe RESTful API design principles.",
                "What is the virtual DOM in React?",
                "Explain CSS specificity and how it works."
            ],
            advanced: [
                "Describe the event loop in JavaScript and how it relates to asynchronous programming.",
                "What are design patterns and can you explain a few you've used?",
                "How would you optimize frontend performance for a web application?",
                "Explain server-side rendering vs. client-side rendering.",
                "What are service workers and how do they enable PWAs?"
            ]
        },
        behavioral: {
            beginner: [
                "Tell me about yourself and your background.",
                "What are your strengths and weaknesses?",
                "Describe a time when you worked in a team.",
                "How do you handle stress and pressure?",
                "Where do you see yourself in 5 years?"
            ],
            intermediate: [
                "Describe a challenging project you worked on.",
                "Tell me about a time you had a conflict with a coworker.",
                "How do you prioritize tasks when you have multiple deadlines?",
                "Describe a time when you showed leadership skills.",
                "How do you handle feedback and criticism?"
            ],
            advanced: [
                "Tell me about a time you failed and what you learned from it.",
                "Describe a situation where you had to make a difficult decision with limited information.",
                "How have you handled a situation where you disagreed with your manager's decision?",
                "Tell me about a time you had to adapt to a significant change at work.",
                "Describe your approach to solving complex problems with multiple stakeholders."
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
  
      // Initialize functions
      function init() {
          // Setup event listeners
          checkCameraBtn.addEventListener('click', checkCamera);
          checkMicrophoneBtn.addEventListener('click', checkMicrophone);
          // checkSpeakerBtn.addEventListener('click', checkSpeaker);
          startInterviewBtn.addEventListener('click', startInterview);
          muteToggleBtn.addEventListener('click', toggleMute);
          cameraToggleBtn.addEventListener('click', toggleCamera);
          nextQuestionBtn.addEventListener('click', nextQuestion);
          endInterviewBtn.addEventListener('click', showEndConfirmation);
          acknowledgeWarningBtn.addEventListener('click', closeWarningModal);
          confirmEndBtn.addEventListener('click', endInterview);
          cancelEndBtn.addEventListener('click', closeEndConfirmationModal);
          downloadReportBtn.addEventListener('click', downloadReport);
          newInterviewBtn.addEventListener('click', resetInterview);
          returnDashboardBtn.addEventListener('click', returnToDashboard);
  
          // Check if all required APIs are available
          if (!navigator.mediaDevices || 
              !navigator.mediaDevices.getUserMedia ||
              !window.AudioContext) {
              showError("Your browser doesn't support required features for the AI interview. Please use a modern browser like Chrome, Firefox, or Edge.");
              return;
          }
      }
  
      // Device check functions
      async function checkCamera() {
          try {
              const cameraStatus = document.getElementById('camera-status');
              const statusIcon = cameraStatus.querySelector('.status-icon');
              
              // Request camera access
              const stream = await navigator.mediaDevices.getUserMedia({ video: true });
              
              // Show preview
              previewContainer.classList.remove('hidden');
              cameraPreview.srcObject = stream;
              
              // Update status
              statusIcon.textContent = '✅';
              statusIcon.classList.add('success');
              deviceCheckStatus.camera = true;
              
              // Update button
              checkCameraBtn.textContent = 'Camera Working';
              checkCameraBtn.disabled = true;
              
              // Enable start button if all checks pass
              updateStartButtonState();
              
              // Add stop track function for cleanup
              checkCameraBtn.stream = stream;
              
          } catch (error) {
              console.error('Camera check failed:', error);
              const cameraStatus = document.getElementById('camera-status');
              const statusIcon = cameraStatus.querySelector('.status-icon');
              statusIcon.textContent = '❌';
              statusIcon.classList.add('error');
              checkCameraBtn.textContent = 'Failed';
          }
      }
  
      async function checkMicrophone() {
          try {
              const micStatus = document.getElementById('microphone-status');
              const statusIcon = micStatus.querySelector('.status-icon');
              
              // Request microphone access
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              
              // Create audio context for visualization
              const audioContext = new (window.AudioContext || window.webkitAudioContext)();
              const analyser = audioContext.createAnalyser();
              const microphone = audioContext.createMediaStreamSource(stream);
              microphone.connect(analyser);
              
              analyser.fftSize = 256;
              const bufferLength = analyser.frequencyBinCount;
              const dataArray = new Uint8Array(bufferLength);
              
              // Create visualizer
              audioVisualizer.innerHTML = '';
              for (let i = 0; i < 20; i++) {
                  const bar = document.createElement('div');
                  bar.className = 'audio-bar';
                  bar.style.height = '0px';
                  audioVisualizer.appendChild(bar);
              }
              
              // Show visualizer
              previewContainer.classList.remove('hidden');
              
              // Visualize audio
              function visualize() {
                  requestAnimationFrame(visualize);
                  analyser.getByteFrequencyData(dataArray);
                  
                  const bars = audioVisualizer.querySelectorAll('.audio-bar');
                  const step = Math.floor(bufferLength / bars.length);
                  
                  for (let i = 0; i < bars.length; i++) {
                      const value = dataArray[i * step];
                      const height = value / 2;
                      bars[i].style.height = height + 'px';
                  }
              }
              
              visualize();
              
              // Update status
              statusIcon.textContent = '✅';
              statusIcon.classList.add('success');
              deviceCheckStatus.microphone = true;
              
              // Update button
              checkMicrophoneBtn.textContent = 'Microphone Working';
              checkMicrophoneBtn.disabled = true;
              
              // Store analyzer for later use
              checkMicrophoneBtn.analyser = analyser;
              checkMicrophoneBtn.stream = stream;
              
              // Enable start button if all checks pass
              updateStartButtonState();
              
          } catch (error) {
              console.error('Microphone check failed:', error);
              const micStatus = document.getElementById('microphone-status');
              const statusIcon = micStatus.querySelector('.status-icon');
              statusIcon.textContent = '❌';
              statusIcon.classList.add('error');
              checkMicrophoneBtn.textContent = 'Failed';
          }
      }
  
      // async function checkSpeaker() {
      //     try {
      //         const speakerStatus = document.getElementById('speaker-status');
      //         const statusIcon = speakerStatus.querySelector('.status-icon');
              
      //         // Play a test sound
      //         const audio = new Audio();
      //         audio.src = '../notification-sound.mp3'; // Using existing sound file from project
              
      //         // Play the sound
      //         await audio.play();
              
      //         // Ask user if they heard the sound
      //         setTimeout(() => {
      //             const heard = confirm('Did you hear the test sound?');
      //             if (heard) {
      //                 statusIcon.textContent = '✅';
      //                 statusIcon.classList.add('success');
      //                 deviceCheckStatus.speaker = true;
      //                 checkSpeakerBtn.textContent = 'Speaker Working';
      //                 checkSpeakerBtn.disabled = true;
                      
      //                 // Enable start button if all checks pass
      //                 updateStartButtonState();
      //             } else {
      //                 statusIcon.textContent = '❌';
      //                 statusIcon.classList.add('error');
      //                 checkSpeakerBtn.textContent = 'Failed';
      //             }
      //         }, 1000);
              
      //     } catch (error) {
      //         console.error('Speaker check failed:', error);
      //         const speakerStatus = document.getElementById('speaker-status');
      //         const statusIcon = speakerStatus.querySelector('.status-icon');
      //         statusIcon.textContent = '❌';
      //         statusIcon.classList.add('error');
      //         checkSpeakerBtn.textContent = 'Failed';
      //     }
      // }
  
      function updateStartButtonState() {
          // if (deviceCheckStatus.camera && deviceCheckStatus.microphone && deviceCheckStatus.speaker) {
            if (deviceCheckStatus.camera && deviceCheckStatus.microphone) {
              startInterviewBtn.disabled = false;
          }
      }
  
      // Interview control functions
      async function startInterview() {
          try {
              // Get interview settings
              const interviewType = document.getElementById('interview-type').value;
              const difficulty = document.getElementById('difficulty').value;
              const position = document.getElementById('position').value || 'General Position';
              const duration = parseInt(document.getElementById('duration').value);
              
              // Update interview state
              interviewState.interviewType = interviewType;
              interviewState.difficulty = difficulty;
              interviewState.position = position;
              interviewState.remainingTime = duration * 60; // Convert to seconds
              
              // Get questions from the selected bank
              interviewState.questions = questionBanks[interviewType][difficulty];
              interviewState.totalQuestions = interviewState.questions.length;
              
              // Access media devices
              const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
              interviewState.stream = stream;
              
              // Set up video
              userVideo.srcObject = stream;
              userVideo.muted = true; // Mute local video to prevent feedback
              
              // Set up audio analysis for noise detection
              const audioContext = new (window.AudioContext || window.webkitAudioContext)();
              const analyser = audioContext.createAnalyser();
              const microphone = audioContext.createMediaStreamSource(stream);
              microphone.connect(analyser);
              analyser.fftSize = 256;
              interviewState.audioAnalyser = analyser;
              
              // Update UI
              setupSection.classList.add('hidden');
              sessionSection.classList.remove('hidden');
              document.getElementById('interview-type-display').textContent = 
                  `${interviewType.charAt(0).toUpperCase() + interviewType.slice(1)} Interview - ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`;
              
              // Start the interview
              interviewState.started = true;
              interviewState.startTime = new Date();
              
              // Start the interview timer
              startInterviewTimer();
              
              // Set up face and noise detection
              startDetectors();
              
              // Load first question
              loadQuestion(0);
              
          } catch (error) {
              console.error('Failed to start interview:', error);
              showError('Failed to start the interview. Please check your device permissions and try again.');
          }
      }
  
      function startInterviewTimer() {
          remainingTimeEl.textContent = formatTime(interviewState.remainingTime);
          
          interviewState.interviewTimer = setInterval(() => {
              interviewState.remainingTime--;
              
              if (interviewState.remainingTime <= 0) {
                  clearInterval(interviewState.interviewTimer);
                  endInterview();
                  return;
              }
              
              remainingTimeEl.textContent = formatTime(interviewState.remainingTime);
              
              // Warning when 1 minute left
              if (interviewState.remainingTime === 60) {
                  showWarning('Time Warning', 'One minute remaining in the interview!');
              }
          }, 1000);
      }
  
      function startAnswerTimer() {
          let answerTime = 60; // 1 minute to answer
          answerTimeRemaining.textContent = `${answerTime}s`;
          timerBar.style.width = '100%';
          
          // Clear existing timer if any
          if (interviewState.answerTimer) {
              clearInterval(interviewState.answerTimer);
          }
          
          interviewState.answerTimer = setInterval(() => {
              answerTime--;
              
              if (answerTime <= 0) {
                  clearInterval(interviewState.answerTimer);
                  nextQuestion(); // Auto advance when time is up
                  return;
              }
              
              // Update timer display
              answerTimeRemaining.textContent = `${answerTime}s`;
              timerBar.style.width = `${(answerTime / 60) * 100}%`;
              
              // Change color as time runs out
              if (answerTime <= 10) {
                  timerBar.style.backgroundColor = 'var(--danger-color)';
              } else if (answerTime <= 30) {
                  timerBar.style.backgroundColor = 'var(--warning-color)';
              }
          }, 1000);
      }
  
      function loadQuestion(index) {
          if (index >= interviewState.totalQuestions) {
              // If we've gone through all questions, end the interview
              endInterview();
              return;
          }
          
          // Update current question
          interviewState.currentQuestionIndex = index;
          currentQuestionEl.textContent = interviewState.questions[index];
          
          // Reset and start the answer timer
          timerBar.style.backgroundColor = 'var(--primary-color)';
          startAnswerTimer();
          
          // Temporarily store placeholder for answer (would be replaced with actual speech recognition)
          interviewState.answers[index] = {
              question: interviewState.questions[index],
              answer: "",
              duration: 0,
              start: new Date()
          };
          
          // Voice the question using Speech Synthesis (Text-to-Speech)
          speakQuestion(interviewState.questions[index]);
      }
  
      function speakQuestion(question) {
          if ('speechSynthesis' in window) {
              // Cancel any ongoing speech
              window.speechSynthesis.cancel();
              
              const utterance = new SpeechSynthesisUtterance(question);
              utterance.rate = 1.0;
              utterance.pitch = 1.0;
              utterance.volume = 1.0;
              
              // Get available voices and select a suitable one
              let voices = window.speechSynthesis.getVoices();
              if (voices.length === 0) {
                  // If voices aren't loaded yet, wait and try again
                  window.speechSynthesis.onvoiceschanged = () => {
                      voices = window.speechSynthesis.getVoices();
                      // Prefer a female English voice if available
                      const preferredVoice = voices.find(voice => 
                          voice.lang.includes('en') && voice.name.includes('Female'));
                      if (preferredVoice) utterance.voice = preferredVoice;
                      window.speechSynthesis.speak(utterance);
                  };
              } else {
                  // Prefer a female English voice if available
                  const preferredVoice = voices.find(voice => 
                      voice.lang.includes('en') && voice.name.includes('Female'));
                  if (preferredVoice) utterance.voice = preferredVoice;
                  window.speechSynthesis.speak(utterance);
              }
          }
      }
  
      function nextQuestion() {
          // Finish recording current answer
          if (interviewState.answers[interviewState.currentQuestionIndex]) {
              interviewState.answers[interviewState.currentQuestionIndex].duration = 
                  (new Date() - interviewState.answers[interviewState.currentQuestionIndex].start) / 1000;
          }
          
          // Stop timer
          if (interviewState.answerTimer) {
              clearInterval(interviewState.answerTimer);
          }
          
          // Advance to next question
          loadQuestion(interviewState.currentQuestionIndex + 1);
      }
  
      function toggleMute() {
          if (!interviewState.stream) return;
          
          const audioTracks = interviewState.stream.getAudioTracks();
          if (audioTracks.length === 0) return;
          
          interviewState.isMuted = !interviewState.isMuted;
          
          audioTracks[0].enabled = !interviewState.isMuted;
          muteToggleBtn.textContent = interviewState.isMuted ? 'Unmute' : 'Mute';
          
          const micIndicator = document.getElementById('mic-indicator');
          if (interviewState.isMuted) {
              micIndicator.classList.remove('active');
              micIndicator.classList.add('muted');
          } else {
              micIndicator.classList.add('active');
              micIndicator.classList.remove('muted');
          }
      }
  
      function toggleCamera() {
          if (!interviewState.stream) return;
          
          const videoTracks = interviewState.stream.getVideoTracks();
          if (videoTracks.length === 0) return;
          
          interviewState.isCameraOff = !interviewState.isCameraOff;
          
          videoTracks[0].enabled = !interviewState.isCameraOff;
          cameraToggleBtn.textContent = interviewState.isCameraOff ? 'Turn on camera' : 'Turn off camera';
          
          const cameraIndicator = document.getElementById('camera-indicator');
          if (interviewState.isCameraOff) {
              cameraIndicator.classList.remove('active');
              cameraIndicator.classList.add('muted');
          } else {
              cameraIndicator.classList.add('active');
              cameraIndicator.classList.remove('muted');
          }
      }
  
      function startDetectors() {
          // Face detection (simulated)
          interviewState.faceDetectionInterval = setInterval(() => {
              if (interviewState.isCameraOff) return;
              
              // Simulate face detection (random check if face is visible)
              // In a real implementation, this would use a face detection library or API
              const randomCheck = Math.random();
              if (randomCheck > 0.95) {
                  addWarning('No face detected. Please ensure your face is visible.');
              }
          }, 5000);
          
          // Background noise detection (using audio analyser)
          interviewState.noiseDetectionInterval = setInterval(() => {
              if (interviewState.isMuted) return;
              
              const analyser = interviewState.audioAnalyser;
              if (!analyser) return;
              
              const bufferLength = analyser.frequencyBinCount;
              const dataArray = new Uint8Array(bufferLength);
              analyser.getByteFrequencyData(dataArray);
              
              // Calculate average amplitude
              const average = dataArray.reduce((acc, val) => acc + val, 0) / bufferLength;
              
              // Check if noise level is high (threshold can be adjusted)
              if (average > 150) {
                  addWarning('High background noise detected. Please find a quieter environment.');
              }
          }, 3000);
      }
  
      function stopDetectors() {
          if (interviewState.faceDetectionInterval) {
              clearInterval(interviewState.faceDetectionInterval);
          }
          
          if (interviewState.noiseDetectionInterval) {
              clearInterval(interviewState.noiseDetectionInterval);
          }
      }
  
      function addWarning(message) {
          // Add warning to state
          interviewState.warnings.push({
              message: message,
              time: new Date()
          });
          
          // Update warning count
          interviewState.warningCount++;
          warningCountEl.textContent = `${interviewState.warningCount}/5`;
          
          // Add to warning list
          const warningItem = document.createElement('li');
          warningItem.textContent = `${formatTime(interviewState.remainingTime)} - ${message}`;
          warningsList.appendChild(warningItem);
          
          // Show warning modal
          showWarning('Warning', message);
          
          // End interview if warning limit reached
          if (interviewState.warningCount >= 5) {
              endInterview();
          }
      }
  
      function showWarning(title, message) {
          document.getElementById('warning-title').textContent = title;
          warningMessage.textContent = message;
          warningModal.classList.add('active');
      }
  
      function closeWarningModal() {
          warningModal.classList.remove('active');
      }
  
      function showEndConfirmation() {
          endConfirmationModal.classList.add('active');
      }
  
      function closeEndConfirmationModal() {
          endConfirmationModal.classList.remove('active');
      }
  
      function endInterview() {
          // Stop timers and detectors
          if (interviewState.interviewTimer) {
              clearInterval(interviewState.interviewTimer);
          }
          
          if (interviewState.answerTimer) {
              clearInterval(interviewState.answerTimer);
          }
          
          stopDetectors();
          
          // Stop speech synthesis
          if ('speechSynthesis' in window) {
              window.speechSynthesis.cancel();
          }
          
          // Stop media streams
          if (interviewState.stream) {
              interviewState.stream.getTracks().forEach(track => track.stop());
          }
          
          // Close modals if open
          closeWarningModal();
          closeEndConfirmationModal();
          
          // Record end time
          interviewState.endTime = new Date();
          
          // Calculate interview statistics and scores
          calculateResults();
          
          // Show results section
          sessionSection.classList.add('hidden');
          resultsSection.classList.remove('hidden');
      }
  
      function calculateResults() {
          // Calculate interview duration in minutes
          const durationMs = interviewState.endTime - interviewState.startTime;
          const durationMinutes = Math.floor(durationMs / 60000);
          
          // Set basic stats
          interviewDurationEl.textContent = `${durationMinutes} min`;
          questionsAnsweredEl.textContent = `${interviewState.currentQuestionIndex}/${interviewState.totalQuestions}`;
          totalWarningsEl.textContent = interviewState.warningCount;
          
          // Generate mock scores and feedback (in real implementation, this would use AI analysis)
          let totalScore = 0;
          const questionFeedback = [];
          
          // For each answered question
          for (let i = 0; i < interviewState.currentQuestionIndex; i++) {
              // Generate a random score between 60 and 95
              const score = Math.floor(Math.random() * 36) + 60;
              totalScore += score;
              
              // Generate mock feedback
              const feedback = generateMockFeedback(i, score);
              questionFeedback.push(feedback);
          }
          
          // Reduce score based on warnings
          const warningPenalty = interviewState.warningCount * 5;
          totalScore = Math.max(0, totalScore - warningPenalty);
          
          // Calculate average score if any questions were answered
          if (interviewState.currentQuestionIndex > 0) {
              totalScore = Math.round(totalScore / interviewState.currentQuestionIndex);
          } else {
              totalScore = 0;
          }
          
          // Update UI
          finalScoreEl.textContent = totalScore;
          
          // Build feedback HTML
          buildFeedbackHTML(questionFeedback, totalScore);
      }
  
      function generateMockFeedback(questionIndex, score) {
          const question = interviewState.questions[questionIndex];
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
          
          return {
              question,
              score,
              strengths: selectedStrengths,
              weaknesses: selectedWeaknesses
          };
      }
  
      function buildFeedbackHTML(questionFeedback, totalScore) {
          // Overall feedback
          let overallFeedback = '';
          if (totalScore >= 90) {
              overallFeedback = 'Excellent performance! You demonstrated strong knowledge and communication skills throughout the interview.';
          } else if (totalScore >= 75) {
              overallFeedback = 'Good performance! You showed solid understanding and communicated well, with some areas for improvement.';
          } else if (totalScore >= 60) {
              overallFeedback = 'Fair performance. You demonstrated basic understanding but need improvement in depth and clarity.';
          } else {
              overallFeedback = 'Needs improvement. Focus on deepening your knowledge and practicing your interview communication skills.';
          }
          
          // Add warning feedback if applicable
          if (interviewState.warningCount > 0) {
              overallFeedback += ` You received ${interviewState.warningCount} warnings during the interview, which affected your score. Pay attention to maintaining a professional environment and camera presence.`;
          }
          
          // Set overall feedback
          feedbackContentEl.innerHTML = `<p class="overall-feedback">${overallFeedback}</p>`;
          
          // Add question breakdowns
          let breakdownHTML = '';
          
          questionFeedback.forEach((feedback, index) => {
              breakdownHTML += `
                  <div class="question-item">
                      <div class="question-heading">
                          <h4>Question ${index + 1}</h4>
                          <span class="question-score">Score: ${feedback.score}/100</span>
                      </div>
                      <p><strong>Q: </strong>${feedback.question}</p>
                      <div class="feedback-details">
                          <h5>Strengths:</h5>
                          ${feedback.strengths.map(strength => 
                              `<p class="feedback-point feedback-positive">${strength}</p>`
                          ).join('')}
                          
                          <h5>Areas for Improvement:</h5>
                          ${feedback.weaknesses.map(weakness => 
                              `<p class="feedback-point feedback-negative">${weakness}</p>`
                          ).join('')}
                      </div>
                  </div>
              `;
          });
          
          questionBreakdownEl.innerHTML = breakdownHTML;
      }
  
      function downloadReport() {
          // Create report content
          const reportTitle = `Interview Report - ${interviewState.position} (${interviewState.interviewType})`;
          const date = new Date().toLocaleDateString();
          const score = finalScoreEl.textContent;
          
          // Create a simple text report
          let reportContent = `${reportTitle}\n`;
          reportContent += `Date: ${date}\n`;
          reportContent += `Interview Type: ${interviewState.interviewType}\n`;
          reportContent += `Position: ${interviewState.position}\n`;
          reportContent += `Difficulty: ${interviewState.difficulty}\n\n`;
          reportContent += `Overall Score: ${score}/100\n`;
          reportContent += `Questions Answered: ${questionsAnsweredEl.textContent}\n`;
          reportContent += `Warnings Received: ${totalWarningsEl.textContent}\n`;
          reportContent += `Interview Duration: ${interviewDurationEl.textContent}\n\n`;
          reportContent += `Feedback:\n${feedbackContentEl.textContent.trim()}\n\n`;
          
          // Add question breakdown
          reportContent += `Question Breakdown:\n`;
          const questions = questionBreakdownEl.querySelectorAll('.question-item');
          questions.forEach((question, index) => {
              const questionText = question.querySelector('p').textContent;
              const score = question.querySelector('.question-score').textContent;
              reportContent += `\nQuestion ${index + 1}: ${questionText}\n`;
              reportContent += `${score}\n`;
              
              // Add strengths
              const strengths = question.querySelectorAll('.feedback-positive');
              reportContent += `Strengths:\n`;
              strengths.forEach(strength => {
                  reportContent += `- ${strength.textContent}\n`;
              });
              
              // Add weaknesses
              const weaknesses = question.querySelectorAll('.feedback-negative');
              reportContent += `Areas for Improvement:\n`;
              weaknesses.forEach(weakness => {
                  reportContent += `- ${weakness.textContent}\n`;
              });
          });
          
          // Create download link
          const blob = new Blob([reportContent], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `interview_report_${date.replace(/\//g, '-')}.txt`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
      }
  
      function resetInterview() {
          // Reset state
          interviewState = {
              started: false,
              currentQuestionIndex: 0,
              totalQuestions: 0,
              questions: [],
              answers: [],
              warnings: [],
              warningCount: 0,
              startTime: null,
              endTime: null,
              interviewType: '',
              difficulty: '',
              position: '',
              totalScore: 0,
              questionScores: [],
              questionFeedback: [],
              remainingTime: 0,
              answerTimer: null,
              interviewTimer: null,
              isMuted: false,
              isCameraOff: false,
              stream: null,
              audioAnalyser: null,
              faceDetectionInterval: null,
              noiseDetectionInterval: null
          };
          
          // Reset UI
          resultsSection.classList.add('hidden');
          setupSection.classList.remove('hidden');
          
          // Reset device check status
          deviceCheckStatus = {
              camera: false,
              microphone: false,
              // speaker: false
          };
          
          // Reset buttons
          startInterviewBtn.disabled = true;
          checkCameraBtn.disabled = false;
          checkCameraBtn.textContent = 'Check';
          checkMicrophoneBtn.disabled = false;
          checkMicrophoneBtn.textContent = 'Check';
          // checkSpeakerBtn.disabled = false;
          // checkSpeakerBtn.textContent = 'Check';
          
          // Reset status indicators
          document.querySelectorAll('.status-icon').forEach(icon => {
              icon.textContent = '⚪';
              icon.classList.remove('success', 'error');
          });
          
          // Hide preview
          previewContainer.classList.add('hidden');
          
          // Reset warnings list
          warningsList.innerHTML = '';
      }
  
      function returnToDashboard() {
          window.location.href = '../LMS.html';
      }
  
      // Helper functions
      function formatTime(seconds) {
          const minutes = Math.floor(seconds / 60);
          const remainingSeconds = seconds % 60;
          return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
      }
  
      function showError(message) {
          alert(message);
      }
  
      // Initialize the app
      init();
  });