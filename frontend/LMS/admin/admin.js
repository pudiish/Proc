document.addEventListener('DOMContentLoaded', function() {
    // Initialize TinyMCE editor
    tinymce.init({
        selector: '#courseContent',
        height: 400,
        plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'help', 'wordcount'
        ],
        toolbar: 'undo redo | formatselect | ' +
                'bold italic backcolor | alignleft aligncenter ' +
                'alignright alignjustify | bullist numlist outdent indent | ' +
                'removeformat | image | help',
        image_title: true,
        automatic_uploads: true,
        file_picker_types: 'image',
        file_picker_callback: function (cb, value, meta) {
            var input = document.createElement('input');
            input.setAttribute('type', 'file');
            input.setAttribute('accept', 'image/*');

            input.onchange = function () {
                var file = this.files[0];
                var reader = new FileReader();

                reader.onload = function () {
                    var id = 'blobid' + (new Date()).getTime();
                    var blobCache = tinymce.activeEditor.editorUpload.blobCache;
                    var base64 = reader.result.split(',')[1];
                    var blobInfo = blobCache.create(id, file, base64);
                    blobCache.add(blobInfo);

                    cb(blobInfo.blobUri(), { title: file.name });
                };
                reader.readAsDataURL(file);
            };

            input.click();
        },
        content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
        setup: function(editor) {
            editor.on('init', function() {
                console.log('TinyMCE editor initialized');
            });
        }
    });

    // Add logout functionality
    const logoutButton = document.getElementById('logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            // Clear auth token and session ID from localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('sessionId');
            localStorage.removeItem('username');

            // Redirect to login page
            window.location.href = './index.html';
        });
    }

    // Handle form submission
    document.getElementById("adminCourseForm").addEventListener("submit", function(event) {
        event.preventDefault();

        // Get form data
        const title = document.getElementById("courseTitle").value;
        const description = document.getElementById("courseDescription").value;
        const content = tinymce.get("courseContent").getContent();
        const category = document.getElementById("courseCategory").value;
        const image = document.getElementById("courseImage").value;
        const duration = document.getElementById("courseDuration").value;

        // Get objectives
        const objectives = Array.from(document.querySelectorAll('.objective')).map(input => input.value);

        // Get requirements
        const requirements = Array.from(document.querySelectorAll('.requirement')).map(input => input.value);

        // Get curriculum
        const curriculum = Array.from(document.querySelectorAll('.curriculumSection')).map(section => {
            const title = section.querySelector('.curriculumTitle').value;
            const lectures = Array.from(section.querySelectorAll('.lecturesContainer')).map(lecture => ({
                title: lecture.querySelector('.lectureTitle').value,
                duration: lecture.querySelector('.lectureDuration').value,
                type: lecture.querySelector('.lectureType').value
            }));
            return { title, lectures };
        });

        // Get instructor
        const instructor = {
            name: document.getElementById("instructorName").value,
            bio: document.getElementById("instructorBio").value,
            image: document.getElementById("instructorImage").value
        };

        // Get reviews
        const reviews = {
            average: parseFloat(document.getElementById("reviewAverage").value),
            count: parseInt(document.getElementById("reviewCount").value),
            items: Array.from(document.querySelectorAll('.reviewItem')).map(review => ({
                userName: review.querySelector('.reviewUserName').value,
                userImage: review.querySelector('.reviewUserImage').value,
                date: review.querySelector('.reviewDate').value,
                rating: parseFloat(review.querySelector('.reviewRating').value),
                content: review.querySelector('.reviewContent').value
            }))
        };

        // Prepare course data
        const courseData = {
            title,
            description,
            content,
            category,
            image,
            duration,
            objectives,
            requirements,
            curriculum,
            instructor,
            reviews
        };

        // Send POST request to add course
        fetch("http://localhost:5002/api/courses", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(courseData)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.error || "Failed to add course");
                });
            }
            return response.json();
        })
        .then(data => {
            alert(data.message);
            document.getElementById("adminCourseForm").reset();
            tinymce.get("courseContent").setContent('');
        })
        .catch(err => {
            console.error("❌ Error adding course:", err);
            alert("Error adding course: " + err.message);
        });
    });
});