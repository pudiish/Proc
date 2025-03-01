document.addEventListener('DOMContentLoaded', function() {
    // ==================== FETCH CATEGORIES ====================
    function fetchCategories() {
        fetch("http://localhost:5002/api/categories")
            .then(res => res.json())
            .then(categories => {
                const categorySelect = document.getElementById("courseCategory");
                categorySelect.innerHTML = ""; // Clear previous options
                categories.forEach(cat => {
                    const option = document.createElement("option");
                    option.value = cat.name;
                    option.textContent = cat.name;
                    categorySelect.appendChild(option);
                });
            })
            .catch(err => console.error("❌ Error fetching categories:", err));
    }

    // Fetch categories on page load
    fetchCategories();

    // ==================== ADD COURSE FUNCTIONALITY ====================
    document.getElementById("adminCourseForm").addEventListener("submit", function(event) {
        event.preventDefault();

        const title = document.getElementById("courseTitle").value;
        const description = document.getElementById("courseDescription").value;
        const category = document.getElementById("courseCategory").value;
        const image = document.getElementById("courseImage").value;

        const courseData = { title, description, category, image };

        fetch("http://localhost:5002/api/courses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(courseData),
        })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
            document.getElementById("adminCourseForm").reset();
        })
        .catch(err => console.error("❌ Error adding course:", err));
    });
});
