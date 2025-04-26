document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('id');

    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const menu = document.getElementById('menu');

    hamburgerMenu.addEventListener('click', () => {
        menu.classList.toggle('active');
    });

    // Close the menu when clicking outside
    document.addEventListener('click', (event) => {
        if (!menu.contains(event.target) && !hamburgerMenu.contains(event.target)) {
            menu.classList.remove('active');
        }
    });

    // Display the logged-in username
    const usernameDisplay = document.getElementById('usernameDisplay');
    const logoutButton = document.getElementById('logoutButton');

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

    if (courseId) {
        console.log("Course ID from URL:", courseId);
        fetchCourseById(courseId);
    } else {
        console.error("No course ID found in the URL.");
        document.getElementById('loadingSpinner').innerHTML = `
            <i class="fa fa-exclamation-circle" style="color: red;"></i>
            <p>No course ID provided. Please select a course.</p>
            <button onclick="window.location.href='LMS.html'">Return to Courses</button>
        `;
    }

    // Tab switching functionality
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // Filter related courses
    const filterCategory = document.getElementById('filterCategory');
    filterCategory.addEventListener('change', () => {
        const category = filterCategory.value;
        fetchRelatedCourses(courseId, category);
    });
});

function fetchCourseById(courseId) {
    document.getElementById('loadingSpinner').style.display = 'block';
    document.getElementById('courseDetails').style.display = 'none';

    fetch(`http://localhost:5002/api/courses/${courseId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch course (Status: ${response.status})`);
            }
            return response.json();
        })
        .then(course => {
            console.log("✅ Course data fetched:", course);
            displayCourseDetails(course);
            document.getElementById('loadingSpinner').style.display = 'none';
            document.getElementById('courseDetails').style.display = 'block';
        })
        .catch(error => {
            console.error('❌ Error fetching course:', error);
            document.getElementById('loadingSpinner').innerHTML = `
                <i class="fa fa-exclamation-circle" style="color: red;"></i>
                <p>Error loading course: ${error.message}</p>
                <button onclick="window.location.href='LMS.html'">Return to Courses</button>
            `;
        });
}

function displayCourseDetails(course) {
    // Display basic course details
    document.getElementById('courseTitle').textContent = course.title;
    document.getElementById('courseImage').src = course.image || 'PrepBuddy.svg';
    document.getElementById('courseCategory').textContent = course.category || 'General';
    document.getElementById('courseOverview').innerHTML = course.content || course.description || "No content available.";

    // Display duration
    const courseMeta = document.querySelector('.course-meta');
    const durationElement = document.createElement('span');
    durationElement.textContent = `Duration: ${course.duration}`;
    courseMeta.appendChild(durationElement);

    // Display objectives
    const objectivesElement = document.createElement('div');
    objectivesElement.innerHTML = `
        <h3>Course Objectives</h3>
        <ul>
            ${course.objectives.map(obj => `<li>${obj}</li>`).join('')}
        </ul>
    `;
    document.getElementById('overview').appendChild(objectivesElement);

    // Display requirements
    const requirementsElement = document.createElement('div');
    requirementsElement.innerHTML = `
        <h3>Requirements</h3>
        <ul>
            ${course.requirements.map(req => `<li>${req}</li>`).join('')}
        </ul>
    `;
    document.getElementById('overview').appendChild(requirementsElement);

    // Display curriculum
    if (course.curriculum && course.curriculum.length > 0) {
        const curriculumElement = document.createElement('div');
        curriculumElement.innerHTML = `
            <h2>Curriculum</h2>
            ${course.curriculum.map(section => `
                <div class="curriculum-section">
                    <div class="section-header">
                        <h3>${section.title}</h3>
                    </div>
                    <div class="section-lectures">
                        ${section.lectures.map(lecture => `
                            <div class="lecture-item">
                                <div class="lecture-title">
                                    <i class="fa fa-play-circle"></i>
                                    <span>${lecture.title}</span>
                                </div>
                                <span>${lecture.duration}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        `;
        document.getElementById('curriculum').appendChild(curriculumElement);
    }

    // Display instructor details
    if (course.instructor) {
        document.getElementById('courseInstructor').innerHTML = `
            <div class="instructor-profile">
                <img class="instructor-image" src="${course.instructor.image || 'default-instructor.jpg'}" alt="${course.instructor.name}">
                <div class="instructor-info">
                    <h3>${course.instructor.name}</h3>
                    <p>${course.instructor.bio || 'No bio available.'}</p>
                </div>
            </div>
        `;
    }

    // Display reviews
    if (course.reviews && course.reviews.items && course.reviews.items.length > 0) {
        const reviewsElement = document.createElement('div');
        reviewsElement.innerHTML = `
            <div class="rating-summary">
                <div class="average-rating">
                    <span>${course.reviews.average}</span>
                    <div class="stars">${'⭐'.repeat(Math.round(course.reviews.average))}</div>
                    <span>(${course.reviews.count} reviews)</span>
                </div>
            </div>
            <div class="reviews-list">
                ${course.reviews.items.map(review => `
                    <div class="review">
                        <div class="review-header">
                            <div class="reviewer">
                                <img src="${review.userImage || 'default-user.jpg'}" alt="${review.userName}">
                                <div>
                                    <h4>${review.userName}</h4>
                                    <p class="review-date">${review.date}</p>
                                </div>
                            </div>
                            <div class="review-stars">${'⭐'.repeat(review.rating)}</div>
                        </div>
                        <p>${review.content}</p>
                    </div>
                `).join('')}
            </div>
        `;
        document.getElementById('reviews').appendChild(reviewsElement);
    }

    // Fetch related courses
    fetchRelatedCourses(course._id);
}

function fetchRelatedCourses(currentCourseId, category = 'all') {
    fetch('http://localhost:5002/api/courses')
        .then(response => response.json())
        .then(courses => {
            let relatedCourses = courses.filter(course => course._id !== currentCourseId);
            if (category !== 'all') {
                relatedCourses = relatedCourses.filter(course => course.category === category);
            }
            relatedCourses = relatedCourses.slice(0, 3);

            const container = document.getElementById('relatedCourses');
            container.innerHTML = '';

            if (relatedCourses.length === 0) {
                container.innerHTML = '<p>No related courses found.</p>';
                return;
            }

            relatedCourses.forEach(course => {
                const div = document.createElement('div');
                div.className = 'course-card';
                div.innerHTML = `
                    <img src="${course.image || 'default-course-image.jpg'}" alt="${course.title}">
                    <h3>${course.title}</h3>
                `;
                div.onclick = () => window.location.href = `course-details.html?id=${course._id}`;
                container.appendChild(div);
            });
        })
        .catch(error => console.error('Error fetching related courses:', error));
}

function switchTab(tabName) {
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabPanes.forEach(pane => pane.style.display = 'none');
    document.getElementById(tabName).style.display = 'block';

    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => button.classList.remove('active'));
    document.querySelector(`.tab-button[data-tab="${tabName}"]`).classList.add('active');
}