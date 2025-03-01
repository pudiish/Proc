// ui.js - User interface interactions
export class QuizUI {
    constructor(quizState, logger) {
        this.quizState = quizState;
        this.logger = logger;
        
        // DOM Elements
        this.quizContainer = document.getElementById("quiz-container");
        this.questionContainer = document.getElementById("question");
        this.optionsContainer = document.getElementById("options");
        this.scoreContainer = document.getElementById("score-container");
        this.scoreText = document.getElementById("score");
        this.notificationBox = document.getElementById("notification-box");
        this.progress = document.getElementById("progress");
        this.timeLeftContainer = document.getElementById("time-left");
        this.backButton = document.getElementById("back-btn");
        this.nextButton = document.getElementById("next-btn");
        this.startTestContainer = document.getElementById("start-test-container");
        this.statusMessage = document.getElementById("status-message");
        this.setupContainer = document.getElementById("setup-container");
    }
    
    setupNavigation() {
        const menuItems = document.querySelectorAll('.menu > li');

        // Add click event listeners to top-level menu items
        menuItems.forEach(item => {
            item.addEventListener('click', function(e) {
                // Toggle the submenu visibility
                const submenu = this.querySelector('.Submenu');
                if (submenu) {
                    e.preventDefault(); // Prevent navigation only for menu items with submenus

                    // Close all other open submenus
                    document.querySelectorAll('.Submenu.active').forEach(menu => {
                        if (menu !== submenu) {
                            menu.classList.remove('active');
                        }
                    });

                    // Toggle current submenu
                    submenu.classList.toggle('active');
                }
            });
        });

        // Ensure submenu items and main links work correctly
        document.querySelectorAll('.nav-link, .Submenu a, .Submenu2 a, .Submenu3 a').forEach(link => {
            link.addEventListener('click', function(e) {
                e.stopPropagation(); // Stop event from affecting parent elements

                const targetUrl = this.getAttribute('href');
                if (targetUrl && targetUrl !== "#") {
                    window.location.href = targetUrl; // Redirect to actual URL
                }
            });
        });

        // Close menus when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.menu')) {
                document.querySelectorAll('.Submenu.active, .Submenu2.active, .Submenu3.active').forEach(menu => {
                    menu.classList.remove('active');
                });
            }
        });

        // Setup search bar functionality
        const searchIcon = document.querySelector('.SearchIcon');
        const searchBar = document.querySelector('.SearchBar_Header input');

        if (searchIcon && searchBar) {
            searchIcon.addEventListener('click', function() {
                searchBar.style.width = searchBar.style.width === '240px' ? '120px' : '240px';
                searchBar.focus();
            });
        }
    }
    
    updateStatusMessage(message, isSuccess = false) {
        if (this.statusMessage) {
            this.statusMessage.textContent = message;
            this.statusMessage.className = isSuccess ? "status-success" : "status-message";
            console.log(`📢 Status: ${message}`);
        }
    }
    
    resetTimer() {
        clearInterval(this.quizState.timer);
        this.quizState.timeLeft = this.quizState.remainingTimes[this.quizState.currentQuestionIndex] || CONFIG.questionTime;
        this.updateTimeLeft();

        this.quizState.timer = setInterval(() => {
            if (this.quizState.quizPaused) return;

            this.quizState.timeLeft--;
            this.updateTimeLeft();

            if (this.quizState.timeLeft === 0) {
                clearInterval(this.quizState.timer);
                this.quizState.expiredTimes[this.quizState.currentQuestionIndex] = true;
                this.quizState.remainingTimes[this.quizState.currentQuestionIndex] = 0;
                
                // Mark the question as answered when time expires
                this.quizState.answeredQuestions[this.quizState.currentQuestionIndex] = true;
                
                // Enable next button when time expires
                this.nextButton.disabled = false;
                
                this.showNotification("Time's up for this question!");
            }
        }, 1000);
    }
    
    updateTimeLeft() {
        this.timeLeftContainer.textContent = `${this.quizState.timeLeft} s`;
    }
    
    updateProgress(index) {
        const progressPercentage = ((index + 1) / quizQuestions.length) * 100;
        this.progress.style.width = `${progressPercentage}%`;
    }
    
    updateNavigationButtons() {
        // Previous button enabled only if not on first question
        this.backButton.disabled = this.quizState.currentQuestionIndex === 0;
        
        // Next button enabled if current question is answered or time expired
        this.nextButton.disabled = !(
            this.quizState.answeredQuestions[this.quizState.currentQuestionIndex] || 
            this.quizState.expiredTimes[this.quizState.currentQuestionIndex]
        );
        
        console.log(`✅ Navigation buttons updated: Back=${!this.backButton.disabled}, Next=${!this.nextButton.disabled}`);
    }
    
    showNotification(message) {
        this.notificationBox.textContent = message;
        this.notificationBox.classList.remove("hidden");
        this.notificationBox.classList.add("visible");

        setTimeout(() => {
            this.notificationBox.classList.remove("visible");
            setTimeout(() => {
                this.notificationBox.classList.add("hidden");
            }, 300);
        }, 3000);
    }
    
    pauseQuiz(reason = "unknown") {
        this.quizState.quizPaused = true;
        clearInterval(this.quizState.timer);
        console.log(`🚨 Quiz paused due to: ${reason}`);
        
        // Log quiz pause event
        this.logger.logActivity("Quiz Paused", { reason: reason }, this.quizState.currentQuestionIndex);
        
        if (reason === "malpractice") {
            this.showNotification("🚨 Quiz paused due to suspected malpractice. Please remove any electronic devices.");
        } else if (reason === "no face") {
            this.showNotification("🚨 Quiz paused. No face detected.");
        } else if (reason === "multiple faces") {
            this.showNotification("🚨 Quiz paused. Multiple faces detected.");
        } else {
            this.showNotification("🚨 Quiz paused. Please ensure proper test conditions.");
        }
    }
    
    resumeQuiz() {
        if (this.quizState.quizPaused) {
            this.quizState.quizPaused = false;
            this.resetTimer();
            console.log("✅ Quiz resumed");
            this.showNotification("✅ Environment clear! Resuming quiz.");
            
            // Log quiz resume event
            this.logger.logActivity("Quiz Resumed", null, this.quizState.currentQuestionIndex);
            this.logger.logCameraActivity("Quiz Resumed", {
                resumedAt: this.quizState.currentQuestionIndex
            }, this.quizState.currentQuestionIndex);
        }
    }
    
    startQuiz() {
        if (!this.quizState.quizStarted && this.quizState.environmentChecked) {
            this.quizState.quizStarted = true;
            this.setupContainer.classList.add("hidden");
            this.startTestContainer.classList.add("hidden");
            this.quizContainer.classList.remove("hidden");
            this.loadQuestion(this.quizState.currentQuestionIndex);
            this.resetTimer();
            this.logger.logActivity("Started Quiz");
            this.logger.logCameraActivity("Quiz Started");
            console.log("🏁 Quiz started");
        } else if (!this.quizState.environmentChecked) {
            this.showNotification("Please wait for environment check to complete");
            this.updateStatusMessage("Environment check in progress...");
        }
    }
    
    loadQuestion(index) {
        if (index >= quizQuestions.length) {
            this.finishQuiz();
            return;
        }

        console.log(`📝 Loading question ${index + 1}/${quizQuestions.length}`);
        const question = quizQuestions[index];
        this.questionContainer.textContent = question.question;
        this.optionsContainer.innerHTML = "";

        question.options.forEach((option, i) => {
            const optionElement = document.createElement("div");
            optionElement.classList.add("option");
            
            // Highlight previously selected option
            if (this.quizState.userSelections[index] === i) {
                optionElement.classList.add("selected");
            }
            
            optionElement.textContent = option;
            optionElement.onclick = () => this.handleOptionClick(i);
            this.optionsContainer.appendChild(optionElement);
        });

        this.updateProgress(index);
        this.updateNavigationButtons();
        this.quizState.startTime = Date.now();
    }
    
    handleOptionClick(optionIndex) {
        console.log(`👆 Option ${optionIndex} selected for question ${this.quizState.currentQuestionIndex + 1}`);
        
        // Store user selection
        this.quizState.userSelections[this.quizState.currentQuestionIndex] = optionIndex;
        
        // Mark as answered
        this.quizState.answeredQuestions[this.quizState.currentQuestionIndex] = true;
        
        // Save remaining time
        this.quizState.remainingTimes[this.quizState.currentQuestionIndex] = this.quizState.timeLeft;
        
        // Highlight selected option
        const options = this.optionsContainer.querySelectorAll('.option');
        options.forEach((option, index) => {
            if (index === optionIndex) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
        
        const timeTaken = (Date.now() - this.quizState.startTime) / 1000;
        this.logger.logActivity("Answered Question", {
            optionIndex,
            timeTaken,
            correctAnswer: quizQuestions[this.quizState.currentQuestionIndex].answer
        }, this.quizState.currentQuestionIndex);
        
        // Enable next button after answering
        this.nextButton.disabled = false;
    }
    
    goBack() {
        if (this.quizState.currentQuestionIndex > 0) {
            clearInterval(this.quizState.timer);
            // Save remaining time for current question
            this.quizState.remainingTimes[this.quizState.currentQuestionIndex] = this.quizState.timeLeft;
            
            this.quizState.currentQuestionIndex--;
            this.loadQuestion(this.quizState.currentQuestionIndex);
            this.resetTimer();
            console.log(`⬅️ Navigated to previous question: ${this.quizState.currentQuestionIndex + 1}`);
        }
    }
    
    loadNextQuestion() {
        if (this.quizState.currentQuestionIndex < quizQuestions.length - 1) {
            clearInterval(this.quizState.timer);
            // Save remaining time for current question
            this.quizState.remainingTimes[this.quizState.currentQuestionIndex] = this.quizState.timeLeft;
            
            this.quizState.currentQuestionIndex++;
            this.loadQuestion(this.quizState.currentQuestionIndex);
            this.resetTimer();
            console.log(`➡️ Navigated to next question: ${this.quizState.currentQuestionIndex + 1}`);
        } else {
            this.finishQuiz();
        }
    }
    
    finishQuiz() {
        clearInterval(this.quizState.timer);
        
        // Calculate score
        this.quizState.correctAnswers = 0;
        for (let i = 0; i < quizQuestions.length; i++) {
            if (this.quizState.userSelections[i] === quizQuestions[i].answer) {
                this.quizState.correctAnswers++;
            }
        }
        
        this.quizContainer.classList.add("hidden");
        this.scoreContainer.classList.remove("hidden");
        this.scoreText.textContent = `You scored ${this.quizState.correctAnswers} out of ${quizQuestions.length}`;
        
        this.logger.logActivity("Completed Quiz", {
            score: this.quizState.correctAnswers,
            totalQuestions: quizQuestions.length
        });
        
        this.logger.logCameraActivity("Quiz Completed", {
            score: this.quizState.correctAnswers,
            totalQuestions: quizQuestions.length
        });
        
        console.log(`🏁 Quiz completed. Score: ${this.quizState.correctAnswers}/${quizQuestions.length}`);
        
        // Stop camera monitoring interval
        clearInterval(this.quizState.cameraMonitoringInterval);
    }
    
    terminateQuizDueToMalpractice(reason) {
        clearInterval(this.quizState.timer);
        
        // Log quiz termination due to malpractice
        this.logger.logActivity("Quiz Terminated", { reason: reason }, this.quizState.currentQuestionIndex);
        
        // Log camera evidence
        this.logger.logCameraActivity("Quiz Terminated (Malpractice)", { 
            reason: reason,
            questionIndex: this.quizState.currentQuestionIndex,
            totalQuestionsAnswered: this.quizState.answeredQuestions.filter(item => item).length
        }, this.quizState.currentQuestionIndex);
        
        // Show termination message
        this.quizContainer.classList.add("hidden");
        this.scoreContainer.classList.remove("hidden");
        this.scoreText.textContent = `Quiz terminated due to detected malpractice: ${reason}`;
        
        console.log(`❌ Quiz terminated due to malpractice: ${reason}`);
        
        // Stop camera monitoring interval
        clearInterval(this.quizState.cameraMonitoringInterval);
    }
    
    restartQuiz() {
        console.log("🔄 Restarting quiz...");
        this.quizState.reset();
        this.scoreContainer.classList.add("hidden");
        this.quizContainer.classList.remove("hidden");
        this.loadQuestion(this.quizState.currentQuestionIndex);
        this.resetTimer();
    }
}