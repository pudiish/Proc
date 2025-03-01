import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());
app.use(cors());

// MongoDB Connection
mongoose.connect("mongodb://127.0.0.1:27017/lms", {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Course Schema
const courseSchema = new mongoose.Schema({
  title: String,
  description: String,
  category: String,
  image: String,
});

const Course = mongoose.model("Course", courseSchema);

// Category Schema
const categorySchema = new mongoose.Schema({
  name: String
});

const Category = mongoose.model("Category", categorySchema);

// API: Add a Course
app.post("/api/courses", async (req, res) => {
  try {
    const { title, description, category, image } = req.body;
    const newCourse = new Course({ title, description, category, image });
    await newCourse.save();
    res.status(201).json({ message: "✅ Course added successfully!" });
  } catch (err) {
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

// API: Add a Category
app.post("/api/categories", async (req, res) => {
  try {
    const { name } = req.body;
    const newCategory = new Category({ name });
    await newCategory.save();
    res.status(201).json({ message: "✅ Category added successfully!" });
  } catch (err) {
    res.status(500).json({ error: "❌ Failed to add category." });
  }
});

// API: Fetch Categories
app.get("/api/categories", async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: "❌ Failed to retrieve categories." });
  }
});

// Start Server
const PORT = 5002;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
