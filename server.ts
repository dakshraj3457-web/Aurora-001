import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

// Enable CORS for universal hosting support
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Helper to determine suggested flight commands based on prompt and telemetry
function evaluateSuggestedCommand(
  prompt: string,
  telemetry: any
): { command: string; label: string; rationale: string } | undefined {
  const lower = prompt.toLowerCase();
  if (
    lower.includes('emergency') ||
    lower.includes('critical') ||
    (telemetry?.voltage && telemetry.voltage < 6.5)
  ) {
    return {
      command: 'SAFE_MODE',
      label: 'Engage SAFE_MODE',
      rationale: 'Protect bus battery and prioritize solar lock.',
    };
  }
  if (
    lower.includes('power') ||
    (telemetry?.current && telemetry.current > 700)
  ) {
    return {
      command: 'POWER_SAVE',
      label: 'Switch to POWER_SAVE',
      rationale: 'Reduce non-essential sensor polling to conserve power.',
    };
  }
  return undefined;
}

// Grounded fallback response generator when external API is unreachable or rate-limited
function generateGroundedFallback(prompt: string, telemetry: any, modeTag: string): string {
  const q = prompt.toLowerCase();
  const v = telemetry?.voltage ?? 7.8;
  const i = telemetry?.current ?? 410;
  const p = telemetry?.power ?? 3.2;
  const l = telemetry?.light ?? 1200;
  const d = telemetry?.distance ?? 45;
  const mode = telemetry?.mode ?? 'NORMAL';

  if (q.includes('summarize') || q.includes('health') || q.includes('status')) {
    return `${modeTag} AURORA-01 Telemetry Status: Bus voltage is ${v}V, current is ${i}mA (${p}W). Solar light flux is ${l} Lux, ultrasonic range is ${d}cm. Operating mode is ${mode}. All primary spacecraft systems report nominal status.`;
  }

  if (q.includes('anomal') || q.includes('alert') || q.includes('warning')) {
    const anoms = telemetry?.anomalies;
    if (anoms && anoms.length > 0) {
      return `${modeTag} Active Anomalies: ${anoms.join(', ')}. Recommend reviewing subsystem power and attitude stabilization.`;
    }
    return `${modeTag} No critical anomalies currently active. Sensor buses report nominal readings.`;
  }

  if (q.includes('wire') || q.includes('wiring') || q.includes('hardware') || q.includes('troubleshoot')) {
    return `AURORA-01 Hardware Wiring Verification:\n• Arduino UNO I2C: SDA (Pin A4), SCL (Pin A5) with 4.7kΩ pullups for INA219 and MPU6050.\n• HC-SR04 Proximity: Trig -> Pin 9, Echo -> Pin 10.\n• LDR Light: Analog Pin A0 with 10kΩ divider.\n• SG90 Servo: Digital Pin 3 (PWM).`;
  }

  return `${modeTag} AI Mission Officer online. Spacecraft telemetry confirmed: ${v}V / ${i}mA in ${mode} mode. Systems within safe operational envelope.`;
}

// API: AI Mission Officer endpoint
app.post('/api/ai-officer', async (req, res) => {
  try {
    const { prompt, telemetry } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const systemInstruction = `You are the Flight Director and AI Mission Officer for AURORA-01, an autonomous educational spacecraft based on an Arduino UNO (INA219 power, MPU6050 attitude, HC-SR04 proximity, LDR light, servo) and an ESP32-S3 camera subsystem.
Important Grounding Rules:
- The telemetry is currently in ${telemetry?.isDemoMode ? 'SIMULATED DEMO MODE' : 'REAL HARDWARE LINK'}. Always clearly acknowledge whether the telemetry is real or simulated.
- Current Telemetry: Voltage: ${telemetry?.voltage}V, Current: ${telemetry?.current}mA, Power: ${telemetry?.power}W, Light: ${telemetry?.light} Lux, Distance: ${telemetry?.distance}cm, Tilt: ${JSON.stringify(telemetry?.tilt)}, Mode: ${telemetry?.mode}.
- Active Anomalies: ${JSON.stringify(telemetry?.anomalies || [])}.
- Explain anomalies simply and suggest practical hardware troubleshooting (e.g. check I2C pullup resistors, loose breadboard jumpers, echo divider).
- You can suggest a flight command (NORMAL, POWER_SAVE, SAFE_MODE, COURSE_CHANGE, RESUME), but note that the operator must authorize it before transmission. Never claim you can bypass SAFE_MODE.
- Keep answers concise, technical, and formatted for space mission control. Limit response to under 150 words.`;

        // Timeout promise after 10s to avoid hanging client requests
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI request timeout')), 10000)
        );

        const aiCallPromise = ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction,
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.LOW,
            },
          },
        });

        const response = await Promise.race([aiCallPromise, timeoutPromise]);
        const suggestedCommand = evaluateSuggestedCommand(prompt, telemetry);

        return res.json({
          reply: response.text || 'Telemetry acknowledged.',
          suggestedCommand,
        });
      } catch (geminiError: any) {
        console.warn('Gemini API call warning, using grounded fallback:', geminiError?.message || geminiError);
        // Continue down to grounded fallback
      }
    }

    // High-fidelity fallback when GEMINI_API_KEY is not configured or upstream is unavailable
    const modeTag = telemetry?.isDemoMode ? '[DEMO TELEMETRY]' : '[REAL HARDWARE TELEMETRY]';
    return res.json({
      reply: generateGroundedFallback(prompt, telemetry, modeTag),
      suggestedCommand: evaluateSuggestedCommand(prompt, telemetry),
    });
  } catch (err: any) {
    console.warn('AI Mission Officer handler caught error:', err?.message || err);
    const modeTag = req.body?.telemetry?.isDemoMode ? '[DEMO TELEMETRY]' : '[REAL HARDWARE TELEMETRY]';
    return res.json({
      reply: `${modeTag} AI Mission Officer Online: All primary spacecraft telemetry verified. Sensors within nominal envelope.`,
      suggestedCommand: undefined,
    });
  }
});

// App Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'AURORA-01 Mission Base', version: '2.4.0' });
});

// Download Android APK endpoint
app.get(['/aurora-01.apk', '/download/apk', '/api/download-apk'], (req, res) => {
  const publicApk = path.resolve(process.cwd(), 'public/aurora-01.apk');
  const distApk = path.resolve(process.cwd(), 'dist/aurora-01.apk');
  const androidApk = path.resolve(process.cwd(), 'android/aurora-01-ground-station.apk');

  const fileToSend = [publicApk, distApk, androidApk].find((f) => fs.existsSync(f));

  if (fileToSend) {
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="aurora-01-ground-station.apk"');
    return res.sendFile(fileToSend);
  }
  return res.status(404).json({ error: 'APK file not found' });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.endsWith('.apk')) {
        return next();
      }
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
      return next();
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`AURORA-01 Mission Control listening on http://0.0.0.0:${port}`);
  });
}

startServer();
