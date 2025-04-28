import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

// Debug: Log partial API key (first 8 characters, masked rest)
const apiKey = process.env.GOOGLE_API_KEY;
console.log('Google API Key (partial):', apiKey ? `${apiKey.slice(0, 8)}...` : 'Not set');

const genAI = new GoogleGenerativeAI(apiKey);

router.post('/generate-roadmap', async (req, res) => {
  try {
    console.log('Received request body:', req.body);
    const { domain, experience, duration, skillLevel } = req.body;

    // Validate required fields
    if (!domain || !experience || !duration || !skillLevel) {
      return res.status(400).json({ error: 'Missing required fields: domain, experience, duration, skillLevel' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      You are a career advisor specializing in creating personalized learning roadmaps based on the latest industry trends and needs. Create a detailed roadmap for a user with the following details:
      - Domain: ${domain}
      - Experience: ${experience}
      - Duration: ${duration}
      - Skill Level: ${skillLevel}

      The roadmap should include:
      - A brief introduction to the domain and its current trends.
      - A step-by-step learning path with specific topics, resources (e.g., online courses, books, tools), and timelines.
      - Recommended projects to build skills.
      - Tips for staying updated with industry trends.

      Format the response in JSON with the following structure:
      {
        "introduction": "",
        "roadmap": [
          {
            "step": "",
            "topics": [],
            "resources": [],
            "timeline": ""
          }
        ],
        "projects": [],
        "tips": []
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const roadmapText = response.text();

    // Extract JSON from the response by finding the first '{' and last '}'
    const start = roadmapText.indexOf('{');
    const end = roadmapText.lastIndexOf('}');
    if (start === -1 || end === -1 || end < start) {
      console.error('No valid JSON found in response:', roadmapText);
      return res.status(500).json({ error: 'Invalid response format from AI' });
    }

    const jsonString = roadmapText.slice(start, end + 1);
    let roadmap;
    try {
      roadmap = JSON.parse(jsonString);
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError, 'Response text:', roadmapText);
      return res.status(500).json({ error: 'Failed to parse roadmap response from AI' });
    }

    res.json(roadmap);
  } catch (error) {
    console.error('Error generating roadmap:', error.message, error.stack);
    res.status(500).json({ error: `Failed to generate roadmap: ${error.message}` });
  }
});

export default router;