import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Initialize Server-Side Gemini Client with required User-Agent header
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured on the server.');
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  // Endpoint: Generate AI Strategic Report for Divisional Secretariat Vaharai
  app.post('/api/ai-strategic-report', async (req, res) => {
    try {
      const { summaryData, lang = 'ta', focusFilter = 'ALL' } = req.body || {};
      const ai = getGeminiClient();

      const languageInstruction =
        lang === 'ta'
          ? 'Write all text responses clearly in professional Sri Lankan Official Tamil (இலங்கை அரச நிர்வாகத் தமிழ்), keeping division names and numbers clear.'
          : 'Write all text responses in clear, actionable professional English suitable for a Divisional Secretary in Sri Lanka.';

      const prompt = `
You are the Senior Strategic Policy & Welfare Analytics Advisor for Divisional Secretariat Koralaipattu North (Vaharai), Batticaloa District, Sri Lanka (பிரதேச செயலகம் கோறளைப்பற்று வடக்கு - வாகரை).

Analyze the following real-time Divisional Secretariat registry and vulnerability dataset and generate a comprehensive Strategic Priority & Action Report answering:
1. Where should the Divisional Secretariat focus HIGH ATTENTION immediately? (எங்கு அதிக கவனம் செலுத்த வேண்டும் - கிராம சேவகர் பிரிவுகள் மற்றும் இடர்பாட்டுக் குறிகாட்டிகள்)
2. In which sectors/matters should our Secretariat act most proactively? (எவ்விடயத்தில் அதிகம் எமது செயலகம் செயற்பட வேண்டும் - வாழ்வாதாரம், கல்வி, மருத்துவம், வீட்டுத்திட்டம், அஸ்வெசும, அடையாள அட்டை ஆவணப்படுத்தல்)

Focus Filter Selected: ${focusFilter}
Dataset Summary JSON:
${JSON.stringify(summaryData, null, 2)}

${languageInstruction}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executiveSummary: {
                type: Type.STRING,
                description: 'High-level strategic summary of the Divisional Secretariat situation and urgent priorities.',
              },
              highAttentionDivisions: {
                type: Type.ARRAY,
                description: 'Top GN Divisions requiring urgent focus based on vulnerability, unassisted families, and Aswesuma poverty.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    divisionName: { type: Type.STRING },
                    urgencyLevel: { type: Type.STRING },
                    keyIssues: { type: Type.STRING },
                    immediateAction: { type: Type.STRING },
                  },
                  required: ['divisionName', 'urgencyLevel', 'keyIssues', 'immediateAction'],
                },
              },
              priorityActionAreas: {
                type: Type.ARRAY,
                description: 'Specific operational sectors where the Divisional Secretariat must act most.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sectorTitle: { type: Type.STRING },
                    whyCritical: { type: Type.STRING },
                    recommendedProgram: { type: Type.STRING },
                    targetGroupCount: { type: Type.STRING },
                    timeline: { type: Type.STRING },
                  },
                  required: ['sectorTitle', 'whyCritical', 'recommendedProgram', 'targetGroupCount', 'timeline'],
                },
              },
              aswesumaGapAnalysis: {
                type: Type.STRING,
                description: 'Analysis of Severely Poor, Poor, Vulnerable, and Not selected families needing Aswesuma review or supplementary aid.',
              },
              nicAndDocumentationAction: {
                type: Type.STRING,
                description: 'Action plan for 18+ citizens registered with Temporary System NICs who need mobile civil registration / NIC camps.',
              },
              secretariatActionPlan: {
                type: Type.ARRAY,
                description: '5 concrete action steps for the Divisional Secretary, Assistant Director of Planning, Social Services, and GN Officers.',
                items: {
                  type: Type.STRING,
                },
              },
            },
            required: [
              'executiveSummary',
              'highAttentionDivisions',
              'priorityActionAreas',
              'aswesumaGapAnalysis',
              'nicAndDocumentationAction',
              'secretariatActionPlan',
            ],
          },
        },
      });

      const rawText = response.text || '{}';
      const parsed = JSON.parse(rawText);
      res.json({ ok: true, report: parsed, generatedAt: new Date().toISOString() });
    } catch (error: any) {
      console.error('AI Strategic Report Error:', error);
      res.status(500).json({
        ok: false,
        error: error?.message || 'Failed to generate AI strategic report.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
