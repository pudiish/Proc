// Wait for the DOM to be fully loaded before executing
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
});