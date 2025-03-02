import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// MongoDB Connection
mongoose.connect("mongodb://127.0.0.1:27017/lms", {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Course Schema
const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, required: true },
  image: { type: String, required: true },
  duration: { type: String, required: true },
  objectives: { type: [String], required: true }, // Array of strings
  requirements: { type: [String], required: true }, // Array of strings
  curriculum: [{
    title: { type: String, required: true },
    lectures: [{
      title: { type: String, required: true },
      duration: { type: String, required: true },
      type: { type: String, required: true }
    }]
  }],
  instructor: {
    name: { type: String, required: true },
    bio: { type: String, required: true },
    image: { type: String, required: true }
  },
  reviews: {
    average: { type: Number, required: true },
    count: { type: Number, required: true },
    items: [{
      userName: { type: String, required: true },
      userImage: { type: String, required: true },
      date: { type: String, required: true },
      rating: { type: Number, required: true },
      content: { type: String, required: true }
    }]
  },
  createdAt: { type: Date, default: Date.now }
});

const Course = mongoose.model("Course", courseSchema);

// API: Add a Course
app.post("/api/courses", async (req, res) => {
  try {
    const {
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
    } = req.body;

    // Debugging: Log the incoming request body
    console.log("Incoming request body:", req.body);

    // Validate required fields
    if (!title || !description || !content || !category || !image || !duration || !objectives || !requirements || !curriculum || !instructor || !reviews) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    // Validate nested fields
    if (!instructor.name || !instructor.bio || !instructor.image) {
      return res.status(400).json({ error: "Instructor information is incomplete." });
    }

    if (!reviews.average || !reviews.count || !reviews.items) {
      return res.status(400).json({ error: "Reviews information is incomplete." });
    }

    // Create a new course instance
    const newCourse = new Course({
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
    });

    // Debugging: Log the new course object before saving
    console.log("New course object:", newCourse);

    // Save the course to the database
    await newCourse.save();

    // Debugging: Log success message
    console.log("✅ Course saved successfully:", newCourse);

    // Respond with success message
    res.status(201).json({ message: "✅ Course added!", courseId: newCourse._id });
  } catch (err) {
    console.error("❌ Error adding course:", err);
    res.status(500).json({ error: "❌ Failed to add course." });
  }
});

// API: Fetch Courses
app.get("/api/courses", async (req, res) => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: "❌ Failed to retrieve courses." });
  }
});

// API: Get a specific course by ID
app.get("/api/courses/:id", async (req, res) => {
  try {
    const courseId = req.params.id;

    // Validate the course ID
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ error: "Invalid course ID" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    res.json(course);
  } catch (err) {
    console.error("Error fetching course:", err);
    res.status(500).json({ error: "❌ Failed to retrieve course." });
  }
});

// Start Server
const PORT = 5002;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));