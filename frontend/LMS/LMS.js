document.addEventListener('DOMContentLoaded', function () {
    // ==================== NAVIGATION BAR FUNCTIONALITY ====================

    // Get all dropdown menu items
    const menuItems = document.querySelectorAll('.menu > li');

    // Add click event listeners to top-level menu items
    menuItems.forEach(item => {
        item.addEventListener('click', function (e) {
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
        link.addEventListener('click', function (e) {
            e.stopPropagation(); // Stop event from affecting parent elements

            const targetUrl = this.getAttribute('href');
            if (targetUrl && targetUrl !== "#") {
                window.location.href = targetUrl; // Redirect to actual URL
            }
        });
    });

    // Close menus when clicking outside
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.menu')) {
            document.querySelectorAll('.Submenu.active, .Submenu2.active, .Submenu3.active').forEach(menu => {
                menu.classList.remove('active');
            });
        }
    });

    // ==================== SEARCH BAR FUNCTIONALITY ====================

    const searchIcon = document.querySelector('.SearchIcon');
    const searchBar = document.querySelector('.SearchBar_Header input');

    searchIcon.addEventListener('click', function () {
        searchBar.style.width = searchBar.style.width === '240px' ? '120px' : '240px';
        searchBar.focus();
    });

    // Add event listener for search input
    searchBar.addEventListener('input', function (e) {
        const searchTerm = e.target.value.toLowerCase().trim();
        filterCoursesBySearchTerm(searchTerm);
    });

    // Function to filter courses by search term
    function filterCoursesBySearchTerm(searchTerm) {
        const coursesContainer = document.querySelector('.courses-container');
        const courseDivs = coursesContainer.querySelectorAll('.P3');

        courseDivs.forEach(courseDiv => {
            const courseTitle = courseDiv.querySelector('h5').textContent.toLowerCase();
            const courseDescription = courseDiv.querySelector('p').textContent.toLowerCase();

            if (courseTitle.includes(searchTerm) || courseDescription.includes(searchTerm)) {
                courseDiv.style.display = 'block'; // Show the course if it matches the search term
            } else {
                courseDiv.style.display = 'none'; // Hide the course if it doesn't match
            }
        });
    }

    // ==================== USER PROFILE AND LOGOUT FUNCTIONALITY ====================

    const usernameDisplay = document.getElementById('usernameDisplay');
    const logoutButton = document.getElementById('logoutButton');

    // Display the logged-in username
    const username = localStorage.getItem('username');
    if (username) {
        usernameDisplay.textContent = username;
    } else {
        // If no username is found, redirect to login page
        window.location.href = '../index.html';
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
                window.location.href = '../index.html';
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
    });

    // ==================== COURSES DATABASE FUNCTIONALITY ====================

    // Function to fetch courses from database
    function fetchCourses() {
        fetch("http://localhost:5002/api/courses")  // API URL to get courses
            .then(response => response.json())
            .then(courses => {
                renderCourses(courses);
            })
            .catch(error => console.error("❌ Error fetching courses:", error));
    }

    // Function to render courses dynamically
    function renderCourses(courses) {
        const coursesContainer = document.querySelector('.courses-container');
        coursesContainer.innerHTML = ''; // Clear existing courses

        courses.forEach(course => {
            const courseDiv = document.createElement('div');
            courseDiv.className = `P3 ${course.category}`;
            courseDiv.innerHTML = `
                <img src="${course.image}" alt="${course.title}">
                <h5>${course.title}</h5>
                <p>${course.description}</p>
            `;

            // Handle click event for course selection
            courseDiv.addEventListener('click', () => {
                // Extract the course ID
                const courseId = course._id;
                console.log("Selected Course ID:", courseId); // Debugging: Log the course ID

                // Navigate to course details page with course ID
                window.location.href = `course-details.html?id=${courseId}`;
            });

            coursesContainer.appendChild(courseDiv);
        });
    }

    // ==================== FILTER COURSES BY CATEGORY ====================
    const filterButtons = document.querySelectorAll('.course-filters button');

    filterButtons.forEach(button => {
        button.addEventListener('click', function () {
            filterButtons.forEach(btn => btn.classList.remove('active-filter'));
            this.classList.add('active-filter');

            const category = this.dataset.category;
            fetch("http://localhost:5002/api/courses")
                .then(response => response.json())
                .then(courses => {
                    if (category === 'all') {
                        renderCourses(courses);
                    } else {
                        const filteredCourses = courses.filter(course => course.category === category);
                        renderCourses(filteredCourses);
                    }
                })
                .catch(error => console.error("❌ Error fetching courses:", error));
        });
    });

    // Initialize with all courses
    fetchCourses();

    // ==================== CHATBOT FUNCTIONALITY ====================

    const chatbotContainer = document.getElementById('chatbot-container');
    const chatbotToggle = document.getElementById('chatbot-toggle');
    const chatbotOpen = document.getElementById('chatbot-open');
    const userInput = document.getElementById('user-input');
    const sendMessage = document.getElementById('send-message');
    const chatbotMessages = document.getElementById('chatbot-messages');

        // Initialize chatbot state
        hideChatbot(); // Make sure chatbot is hidden initially


    let state = 'askDomain';
    let userData = {
        domain: '',
        experience: '',
        duration: '',
        skillLevel: ''
    };

    // Fix for chatbot visibility
    function showChatbot() {
        // chatbotContainer.classList.add('chatbot-visible');
        // chatbotOpen.style.display = 'none';
        chatbotContainer.style.display = 'flex';
    chatbotOpen.style.display = 'block'; // Changed from 'none'
    }

    function hideChatbot() {
        // chatbotContainer.classList.remove('chatbot-visible');
        // chatbotOpen.style.display = 'block';
        chatbotContainer.style.display = 'none';
    chatbotOpen.style.display = 'block';
    }

    // Initialize chatbot state
    hideChatbot(); // Make sure chatbot is hidden initially

    chatbotOpen.addEventListener('click', () => {
        showChatbot();
        chatbotMessages.innerHTML = '';
        addBotMessage('Hello! I can help you generate a personalized learning roadmap. Let\'s start with your domain of interest (e.g., Web Development, Data Science, Mobile App Development).');
        // Add some suggested domains as clickable options
        addSuggestedOptions(['Web Development', 'Data Science', 'Mobile App Development', 'DevOps', 'Cloud Computing']);
    });

    // FIX 1: Add stopPropagation to close button handler
    document.getElementById('chatbot-toggle').addEventListener('click', function(e) {
        // Triple-layer protection
        e.stopImmediatePropagation();
        e.preventDefault();
        e.stopPropagation();
    
        // Direct DOM manipulation
        document.getElementById('chatbot-container').style.display = 'none';
        document.getElementById('chatbot-open').style.display = 'block';
    
        
        // Force state reset
        state = 'askDomain';
        userData = { domain: '', experience: '', duration: '', skillLevel: '' };
});

// FIX 2: Add container click handler
chatbotContainer.addEventListener('click', (e) => {  // Added this block
    e.stopPropagation();
});

    sendMessage.addEventListener('click', () => {
        const message = userInput.value.trim();
        if (message) {
            addUserMessage(message);
            handleUserInput(message);
            userInput.value = '';
        }
    });

    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && userInput.value.trim()) {
            sendMessage.click();
        }
    });

    function addUserMessage(message) {
        const div = document.createElement('div');
        div.className = 'message user-message';
        div.textContent = message;
        chatbotMessages.appendChild(div);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }

    function addBotMessage(message) {
        const div = document.createElement('div');
        div.className = 'message bot-message';
        div.textContent = message;
        chatbotMessages.appendChild(div);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }

    // Add suggestion buttons for better UX
    function addSuggestedOptions(options) {
        const suggestionsDiv = document.createElement('div');
        suggestionsDiv.className = 'suggestions';
        
        options.forEach(option => {
            const button = document.createElement('button');
            button.className = 'suggestion-btn';
            button.textContent = option;
            button.addEventListener('click', () => {
                addUserMessage(option);
                handleUserInput(option);
            });
            suggestionsDiv.appendChild(button);
        });
        
        chatbotMessages.appendChild(suggestionsDiv);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }

    function addTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot-message typing';
        typingDiv.textContent = 'Bot is typing...';
        chatbotMessages.appendChild(typingDiv);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        return typingDiv;
    }

    function removeTypingIndicator(typingDiv) {
        if (typingDiv && typingDiv.parentNode === chatbotMessages) {
            chatbotMessages.removeChild(typingDiv);
        }
    }

    async function handleUserInput(message) {
        switch (state) {
            case 'askDomain':
                userData.domain = message;
                addBotMessage('Great! What is your experience level?');
                addSuggestedOptions(['Beginner', 'Intermediate', 'Advanced']);
                state = 'askExperience';
                break;
            case 'askExperience':
                userData.experience = message;
                addBotMessage('How long do you plan to learn?');
                addSuggestedOptions(['3 months', '6 months', '1 year']);
                state = 'askDuration';
                break;
            case 'askDuration':
                userData.duration = message;
                addBotMessage('What is your current skill level?');
                addSuggestedOptions(['Beginner', 'Intermediate', 'Advanced']);
                state = 'askSkillLevel';
                break;
            case 'askSkillLevel':
                userData.skillLevel = message;
                addBotMessage('Generating your personalized roadmap...');
                const typingDiv = addTypingIndicator();
                
                // Add a slight delay to simulate processing
                setTimeout(async () => {
                    await generateRoadmap();
                    removeTypingIndicator(typingDiv);
                    // Add options after roadmap generation
                    addBotMessage('Would you like to:');
                    addSuggestedOptions(['Generate another roadmap', 'Download roadmap as PDF', 'Send roadmap to email']);
                    state = 'done';
                }, 2000);
                break;
            case 'done':
                if (message.toLowerCase().includes('generate another') || message.toLowerCase() === 'restart') {
                    userData = { domain: '', experience: '', duration: '', skillLevel: '' };
                    state = 'askDomain';
                    addBotMessage('What domain do you want to learn?');
                    addSuggestedOptions(['Web Development', 'Data Science', 'Mobile App Development', 'DevOps', 'Cloud Computing']);
                } else if (message.toLowerCase().includes('download') || message.toLowerCase().includes('pdf')) {
                    addBotMessage('The PDF download feature is coming soon! We are working on it.');
                } else if (message.toLowerCase().includes('email') || message.toLowerCase().includes('send')) {
                    addBotMessage('Please enter your email address:');
                    state = 'askEmail';
                } 
                else {
                    addBotMessage('Would you like to generate another roadmap? Type "restart" to start over.');
                }
                break;
            // case 'askEmail':
            //     // Simple email validation
            //     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            //     if (emailRegex.test(message)) {
            //         addBotMessage(`Roadmap will be sent to ${message} shortly.`);
            //         addBotMessage('Would you like to generate another roadmap? Type "restart" to start over.');
            //         state = 'done';
            //     } else {
            //         addBotMessage('Please enter a valid email address.');
            //     }
            //     break;
        }
    }

    async function generateRoadmap() {
        try {
            console.log('Sending request with body:', userData);
            const response = await fetch('http://localhost:5001/api/chatbot/generate-roadmap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                if (response.status === 400) {
                    const errorData = await response.json();
                    addBotMessage(`Error: ${errorData.error || 'Invalid request. Please try again.'}`);
                } else if (response.status === 500) {
                    addBotMessage('Error: Server issue. Please check the backend and try again.');
                } else {
                    addBotMessage(`Error: Failed to generate roadmap (Status ${response.status}). Please try again.`);
                }
                return;
            }

            const roadmap = await response.json();

            if (roadmap.error) {
                addBotMessage(`Error: ${roadmap.error}`);
                return;
            }

            // Create a formatted roadmap message
            addBotMessage(`🎯 YOUR PERSONALIZED ROADMAP`);
            addBotMessage(`🔹 Domain: ${userData.domain}`);
            addBotMessage(`🔹 Experience: ${userData.experience}`);
            addBotMessage(`🔹 Duration: ${userData.duration}`);
            
            addBotMessage(`📝 Introduction: ${roadmap.introduction}`);
            
            roadmap.roadmap.forEach((step, index) => {
                addBotMessage(`📚 Step ${index + 1}: ${step.step}`);
                addBotMessage(`Topics: ${step.topics.join(', ')}`);
                addBotMessage(`Resources: ${step.resources.join(', ')}`);
                addBotMessage(`Timeline: ${step.timeline}`);
            });
            
            addBotMessage(`🛠️ Suggested Projects: ${roadmap.projects.join(', ')}`);
            addBotMessage(`💡 Tips: ${roadmap.tips.join(', ')}`);
            
        } catch (error) {
            console.error('Error generating roadmap:', error);
            addBotMessage('Error: Unable to connect to the server. Please ensure the backend is running on port 5001 and try again.');
        }
    }


    

});
