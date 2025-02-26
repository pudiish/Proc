// Wait for the DOM to be fully loaded before executing
document.addEventListener('DOMContentLoaded', function() {
    // ==================== NAVIGATION BAR FUNCTIONALITY ====================

    // Get all dropdown menu items
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

    // ==================== SEARCH BAR FUNCTIONALITY ====================

    const searchIcon = document.querySelector('.SearchIcon');
    const searchBar = document.querySelector('.SearchBar_Header input');

    searchIcon.addEventListener('click', function() {
        searchBar.style.width = searchBar.style.width === '240px' ? '120px' : '240px';
        searchBar.focus();
    });

    // ==================== COURSES DATABASE FUNCTIONALITY ====================

    // Function to fetch courses from database
    function fetchCourses() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    {
                        id: 1,
                        title: "Java Backend Development - Live",
                        level: "Beginner to Advanced",
                        image: "https://media.geeksforgeeks.org/img-practice/banner/Java-backend-live-thumbnail.png",
                        category: "backend"
                    },
                    {
                        id: 2,
                        title: "DevOps Engineering - Planning to Production",
                        level: "Beginner to Advanced",
                        image: "https://media.geeksforgeeks.org/img-practice/banner/devops-live-thumbnail.png",
                        category: "devops"
                    },
                    {
                        id: 3,
                        title: "Data Structures and Algorithms-Self Paced",
                        level: "Beginner to Advanced",
                        image: "https://media.geeksforgeeks.org/img-practice/banner/dsa-self-paced-thumbnail.png",
                        category: "dsa"
                    },
                    {
                        id: 4,
                        title: "Data Structures and Algorithms in Python-Self Paced",
                        level: "Beginner to Advanced",
                        image: "https://media.geeksforgeeks.org/img-practice/banner/Data-Structures-With-Python-thumbnail.png",
                        category: "dsa"
                    },
                    {
                        id: 5,
                        title: "DSA Live for Working Professionals-Live",
                        level: "Beginner to Advanced",
                        image: "https://media.geeksforgeeks.org/img-practice/banner/geeks-classes-live-thumbnail.png",
                        category: "dsa"
                    },
                    {
                        id: 6,
                        title: "Full Stack Development with React and Node JS -Live",
                        level: "Beginner to Advanced",
                        image: "https://media.geeksforgeeks.org/img-practice/banner/full-stack-node-thumbnail.png",
                        category: "fullstack"
                    },
                    {
                        id: 7,
                        title: "Machine Learning and Data Science",
                        level: "Intermediate to Advanced",
                        image: "https://media.geeksforgeeks.org/img-practice/banner/ml-ds-thumbnail.png",
                        category: "datascience"
                    },
                    {
                        id: 8,
                        title: "Competitive Programming - Live",
                        level: "Intermediate to Advanced",
                        image: "https://media.geeksforgeeks.org/img-practice/banner/competitive-programming-thumbnail.png",
                        category: "dsa"
                    }
                ]);
            }, 500);
        });
    }

    // Function to render courses in the courses section
    function renderCourses(courses) {
        const coursesContainer = document.querySelector('.courses-container');

        // Clear existing course elements
        coursesContainer.innerHTML = '';

        // Add courses from database
        courses.slice(0, 6).forEach(course => {
            const courseDiv = document.createElement('div');
            courseDiv.className = `P3 ${course.category}`;
            courseDiv.innerHTML = `
                <img src="${course.image}" alt="${course.title}" 
                    style="height: 180px; border-top-right-radius: 10px; border-top-left-radius: 10px; width: 100%;">
                <h5>${course.title}</h5>
                <p>${course.level}</p>
            `;

            // Add click event to course div to simulate course selection
            courseDiv.addEventListener('click', () => {
                alert(`You selected: ${course.title}`);
            });

            coursesContainer.appendChild(courseDiv);
        });
    }

    // Course filter functionality
    const filterButtons = document.querySelectorAll('.course-filters button');

    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Reset all buttons
            filterButtons.forEach(btn => {
                btn.classList.remove('active-filter');
            });

            // Highlight active button
            this.classList.add('active-filter');

            // Apply filter
            const category = this.dataset.category;

            fetchCourses().then(courses => {
                if (category === 'all') {
                    renderCourses(courses);
                } else {
                    const filteredCourses = courses.filter(course => course.category === category);
                    renderCourses(filteredCourses);
                }
            });
        });
    });

    // Initialize with all courses
    fetchCourses().then(courses => {
        renderCourses(courses);
    });
});
