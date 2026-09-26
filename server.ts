import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { analyzeMarketWithGemini } from './src/server/aiHandler.ts';
import { fetchLiveMarketData } from './src/server/marketDataService.ts';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Version and Auto-updater endpoint
  app.get('/api/version', (_req: Request, res: Response) => {
    try {
      const versionPath = path.resolve(__dirname, 'version.json');
      if (fs.existsSync(versionPath)) {
        const data = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
        res.json(data);
      } else {
        res.json({
          version: '2.5.0',
          codename: 'Quant-Pro Institutional',
          buildDate: '2026-09-23',
        });
      }
    } catch {
      res.json({
        version: '2.5.0',
        codename: 'Quant-Pro Institutional',
        buildDate: '2026-09-23',
      });
    }
  });

  // Download updater script endpoint (.bat for Windows, .sh for Mac/Linux)
  app.get('/api/download-updater', (req: Request, res: Response) => {
    const filename = req.query.os === 'unix' ? 'actualizar.sh' : 'actualizar.bat';
    const filePath = path.resolve(__dirname, filename);
    if (fs.existsSync(filePath)) {
      res.download(filePath, filename);
    } else {
      res.status(404).send('Script no encontrado');
    }
  });

  // Real-time market data endpoint (15m OHLC from Kraken PAXG/USD & GoldAPI Spot)
  app.get('/api/market-data', async (_req: Request, res: Response) => {
    try {
      const data = await fetchLiveMarketData();
      res.json(data);
    } catch (error) {
      console.error('Error in /api/market-data:', error);
      res.status(500).json({ error: 'Failed to fetch real market data' });
    }
  });

  // Server-side AI route for quantitative market analysis
  app.post('/api/ai-analyze', async (req: Request, res: Response) => {
    try {
      const result = await analyzeMarketWithGemini(req.body);
      res.json(result);
    } catch (error) {
      console.error('Error in /api/ai-analyze:', error);
      res.status(500).json({ error: 'Failed to analyze market' });
    }
  });

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', symbol: 'XAU/USD', strategy: 'London Open Breakout' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`XAUUSD London Breakout Quant server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
