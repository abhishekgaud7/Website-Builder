import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Helper function to extract clean HTML code from AI response (removes markdown backticks if any)
function cleanGeneratedCode(code: string): string {
  let cleaned = code.trim();
  if (cleaned.includes('```html')) {
    cleaned = cleaned.split('```html')[1].split('```')[0].trim();
  } else if (cleaned.includes('```')) {
    cleaned = cleaned.split('```')[1].split('```')[0].trim();
  }
  return cleaned;
}

// 1. Auth Sync Endpoint
app.post('/api/auth/sync', async (req: express.Request, res: express.Response): Promise<any> => {
  const { id, email, name } = req.body;
  if (!id || !email) {
    return res.status(400).json({ error: 'Missing id or email' });
  }

  try {
    const user = await prisma.user.upsert({
      where: { id },
      update: { email, name: name || '' },
      create: { id, email, name: name || '', credits: 20 },
    });
    return res.json(user);
  } catch (err: any) {
    console.error('Error syncing user:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 2. Fetch User Projects
app.get('/api/projects', async (req: express.Request, res: express.Response): Promise<any> => {
  const { userId } = req.query;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  try {
    const projects = await prisma.websiteProject.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
      }
    });
    return res.json(projects);
  } catch (err: any) {
    console.error('Error fetching projects:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 3. Fetch Single Project Details
app.get('/api/projects/:id', async (req: express.Request, res: express.Response): Promise<any> => {
  const { id } = req.params;
  try {
    const project = await prisma.websiteProject.findUnique({
      where: { id },
      include: {
        versions: { orderBy: { timestamp: 'asc' } },
        conversation: { orderBy: { timestamp: 'asc' } },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    return res.json(project);
  } catch (err: any) {
    console.error('Error fetching project:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 4. Create Project (Generate website via Gemini AI)
app.post('/api/projects', async (req: express.Request, res: express.Response): Promise<any> => {
  const { prompt, userId, name } = req.body;
  if (!prompt || !userId) {
    return res.status(400).json({ error: 'Missing prompt or userId' });
  }

  try {
    // Check user credits
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.credits < 5) {
      return res.status(400).json({ error: 'Insufficient credits! You need at least 5 credits.' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Step 1: Enhance prompt
    const enhancePromptInstruction = `
You are a prompt enhancement specialist. Take the user's website request and expand it into a detailed, comprehensive prompt that will help create the best possible website.
    Enhance this prompt by:
    1. Adding specific design details (layout, color scheme, typography)
    2. Specifying key sections and features
    3. Describing the user experience and interactions
    4. Including modern web design best practices
    5. Mentioning responsive design requirements
    6. Adding any missing but important elements

Return ONLY the enhanced prompt, nothing else. Make it detailed but concise (2-3 paragraphs max).

User Request: "${prompt}"
`;
    const enhanceResult = await model.generateContent(enhancePromptInstruction);
    const enhancedPrompt = enhanceResult.response.text().trim();

    // Step 2: Generate code
    const generateCodeInstruction = `
You are an expert web developer. Create a complete, production-ready, single-page website based on this request: "${enhancedPrompt}"

    CRITICAL REQUIREMENTS:
    - You MUST output valid HTML ONLY. 
    - Use Tailwind CSS for ALL styling
    - Include this EXACT script in the <head>: <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    - Use Tailwind utility classes extensively for styling, animations, and responsiveness
    - Make it fully functional and interactive with JavaScript in <script> tag before closing </body>
    - Use modern, beautiful design with great UX using Tailwind classes
    - Make it responsive using Tailwind responsive classes (sm:, md:, lg:, xl:)
    - Use Tailwind animations and transitions (animate-*, transition-*)
    - Include all necessary meta tags
    - Use Google Fonts CDN if needed for custom fonts
    - Use placeholder images from https://placehold.co/600x400
    - Use Tailwind gradient classes for beautiful backgrounds
    - Make sure all buttons, cards, and components use Tailwind styling

    CRITICAL HARD RULES:
    1. You MUST put ALL HTML output ONLY.
    2. You MUST NOT include internal thoughts, explanations, analysis, comments, or markdown.
    3. Do NOT include markdown code blocks or code fences. Return HTML only.
`;
    const codeResult = await model.generateContent(generateCodeInstruction);
    const rawCode = codeResult.response.text();
    const cleanCode = cleanGeneratedCode(rawCode);

    // Save project, version, and conversations to Database in a transaction
    const project = await prisma.$transaction(async (tx) => {
      // 1. Create project
      const newProject = await tx.websiteProject.create({
        data: {
          name: name || prompt.slice(0, 45) + '...',
          initial_prompt: prompt,
          current_code: cleanCode,
          userId: userId,
        },
      });

      // 2. Create version
      const version = await tx.version.create({
        data: {
          code: cleanCode,
          description: 'Initial Generation',
          projectId: newProject.id,
        },
      });

      // Update project current version index
      await tx.websiteProject.update({
        where: { id: newProject.id },
        data: { current_version_index: version.id },
      });

      // 3. Save conversation history
      await tx.conversation.create({
        data: {
          role: 'user',
          content: prompt,
          projectId: newProject.id,
        },
      });
      await tx.conversation.create({
        data: {
          role: 'assistant',
          content: 'Website successfully generated based on your instructions.',
          projectId: newProject.id,
        },
      });

      // 4. Deduct user credits
      await tx.user.update({
        where: { id: userId },
        data: {
          credits: { decrement: 5 },
          totalCreation: { increment: 1 },
        },
      });

      return newProject;
    });

    return res.json(project);
  } catch (err: any) {
    console.error('Error generating website:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 5. Revision Endpoint (Edit existing website code via chat dialog)
app.post('/api/projects/:id/revision', async (req: express.Request, res: express.Response): Promise<any> => {
  const { id } = req.params;
  const { prompt, userId } = req.body;

  if (!prompt || !userId) {
    return res.status(400).json({ error: 'Missing prompt or userId' });
  }

  try {
    // 1. Check user credits
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.credits < 5) {
      return res.status(400).json({ error: 'Insufficient credits! You need at least 5 credits.' });
    }

    // 2. Get current project
    const project = await prisma.websiteProject.findUnique({
      where: { id },
      include: {
        conversation: { orderBy: { timestamp: 'asc' } },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const currentCode = project.current_code || '';
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Step 1: Enhance revision prompt
    const enhanceRevisionInstruction = `
You are a prompt enhancement specialist. The user wants to make changes to their website. Enhance their request to be more specific and actionable for a web developer.
    Enhance this by:
    1. Being specific about what elements to change
    2. Mentioning design details (colors, spacing, sizes)
    3. Clarifying the desired outcome
    4. Using clear technical terms

Return ONLY the enhanced request, nothing else. Keep it concise (1-2 sentences).

User request: "${prompt}"
`;
    const enhanceResult = await model.generateContent(enhanceRevisionInstruction);
    const enhancedRevisionPrompt = enhanceResult.response.text().trim();

    // Step 2: Generate revised code
    const revisionInstruction = `
You are an expert web developer. Apply the following revision changes to the existing HTML page.

    REVISION INSTRUCTIONS:
    "${enhancedRevisionPrompt}"

    EXISTING HTML CODE:
    \`\`\`html
    ${currentCode}
    \`\`\`

    CRITICAL REQUIREMENTS:
    - Return ONLY the complete updated HTML code with the requested changes.
    - Use Tailwind CSS for ALL styling.
    - Include all JavaScript in <script> tags before closing </body>.
    - Return the HTML Code Only, nothing else. Do NOT include markdown code blocks or code fences.
`;
    const revisionResult = await model.generateContent(revisionInstruction);
    const rawRevisedCode = revisionResult.response.text();
    const cleanRevisedCode = cleanGeneratedCode(rawRevisedCode);

    // Save revision, version, and conversations to Database in a transaction
    const updatedProject = await prisma.$transaction(async (tx) => {
      // 1. Create version
      const version = await tx.version.create({
        data: {
          code: cleanRevisedCode,
          description: prompt,
          projectId: id,
        },
      });

      // 2. Update project code & current version index
      const updated = await tx.websiteProject.update({
        where: { id },
        data: {
          current_code: cleanRevisedCode,
          current_version_index: version.id,
        },
      });

      // 3. Save conversation history
      await tx.conversation.create({
        data: {
          role: 'user',
          content: prompt,
          projectId: id,
        },
      });
      await tx.conversation.create({
        data: {
          role: 'assistant',
          content: `Website updated based on your request: "${prompt}"`,
          projectId: id,
        },
      });

      // 4. Deduct user credits
      await tx.user.update({
        where: { id: userId },
        data: {
          credits: { decrement: 5 },
        },
      });

      return updated;
    });

    return res.json(updatedProject);
  } catch (err: any) {
    console.error('Error revising website:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 6. Delete Project Endpoint
app.delete('/api/projects/:id', async (req: express.Request, res: express.Response): Promise<any> => {
  const { id } = req.params;
  try {
    await prisma.websiteProject.delete({
      where: { id },
    });
    return res.json({ success: true, message: 'Project deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting project:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Export app for Vercel Serverless Function compatibility
export default app;
