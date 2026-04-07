import express from 'express';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import path from 'path';
import crypto from 'crypto';
import { calculatePricing } from './services/pricingEngine';

const app = express();
app.use(express.json());
app.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only-do-not-use-in-prod';

const MONTHLY_HASHES: Record<string, string> = {
  "2026-04": "5de0cf3471c8e6d8569bbf7ed2811c37f6d1a585e164b4deef0335b8b013b848",
  "2026-05": "72b025425106f5c7bba2ee1a0cf66c1715db1f1f0dcf6391201713f53d99fb7a",
  "2026-06": "68e68724f508ec3777785df47a6c6d1f57a73b2cd9c33cfafdfb44650a6b258e",
  "2026-07": "73c5f4ee0400c654f1f624e7db313f4def900eaa15822f9320b68c5dadf3f786",
  "2026-08": "ab2f6b201ecc081d29bdba49e50cf9a1097be669f778c266f5743fb6281db572",
  "2026-09": "8197da844eeeaf17c098e71871d9953801d418e55ff40e099bedddd18eba8fdf",
  "2026-10": "3aa86cd5ee94b731abd4a8bfc68ee6ba4d3ea090d9cf197faae4bc418ef63569",
  "2026-11": "0d3336986b57323783feba17d202e7e353862c926de7c715ecb46d92416f9173",
  "2026-12": "6c125621220c4e2ecc7263544b8dfa42d999b64547082578b42444a6a4449847",
  "2027-01": "a22a63aaa2d256bb45e3dc619d8d3d620aba33229754c92666f00875a42223d3",
  "2027-02": "5e48e58823b68b7fea6dd2676998a52e5b8997f62b029b79935ee71c3e3daa06",
  "2027-03": "ba11a731d793ac156a2d621be3547ab3f28a49bc532134aa25c62af7faa25276"
};

function hashPasscodeNode(passcode: string) {
    return crypto.createHash('sha256').update(passcode).digest('hex');
}

app.post('/api/login', (req, res) => {
    const { passcode } = req.body;
    const currentMonth = new Date().toISOString().slice(0, 7);
    const expectedHash = MONTHLY_HASHES[currentMonth];

    if (!expectedHash) {
        return res.status(401).json({ error: 'No hash for current month' });
    }

    const inputHash = hashPasscodeNode(passcode);
    if (inputHash === expectedHash) {
        const token = jwt.sign({ authenticated: true }, JWT_SECRET, { expiresIn: '12h' });
        res.cookie('auth_token', token, { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production', 
            sameSite: 'strict',
            maxAge: 12 * 60 * 60 * 1000 // 12 hours
        });
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid passcode' });
    }
});

app.post('/api/logout', (_req, res) => {
    res.clearCookie('auth_token');
    res.json({ success: true });
});

// Middleware to protect routes
const requireAuth = (req: any, res: any, next: any) => {
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

app.get('/api/verify', requireAuth, (_req, res) => {
    res.json({ success: true });
});

app.post('/api/calculate', requireAuth, (req, res) => {
    try {
        const config = req.body;
        const results = calculatePricing(config);
        res.json(results);
    } catch (error) {
        console.error('Calculation error:', error);
        res.status(500).json({ error: 'Calculation failed' });
    }
});

async function startServer() {
    if (process.env.NODE_ENV !== 'production') {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa'
        });
        app.use(vite.middlewares);
    } else {
        const distPath = path.join(process.cwd(), 'dist');
        app.use(express.static(distPath));
        app.get('*', (_req, res) => {
            res.sendFile(path.join(distPath, 'index.html'));
        });
    }

    const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
    });
}

startServer();

export default app;
