import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import path from 'path';
import crypto from 'crypto';
import { calculatePricing } from './services/pricingEngine';

const app = express();
app.set('trust proxy', 1);
app.use((req, res, next) => {
    if (req.body && Object.keys(req.body).length > 0) {
        next();
    } else {
        express.json()(req, res, next);
    }
});
app.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only-do-not-use-in-prod';

const MONTHLY_HASHES: Record<string, string> = {
  "2026-04": "5433f0bcf3b7783c10e3d318ec310a9cdb2458762a7ddcbd42dbb925b476423a",
  "2026-05": "6c5f4d35c898ed832c1fb718fee0696efa56914a758f3a3a1a1d43b7ab60b6f4",
  "2026-06": "aeacf76e0047f395f680741ae73ea13382abf97fa2f4bceccf4166856c31f1e6",
  "2026-07": "57691dc4cd926dea5d550026764ca9d5d93cfe958269350d1dac611c688317fe",
  "2026-08": "e80d219edb1d229a6edd058d1bb30a316d66ad921f37eca6d7757ce730163859",
  "2026-09": "621e329fdfc17f98aa3143bc170c74d34c1b92931b85600c926cbd6d50616b77",
  "2026-10": "f51a7660f584b2f9d5243a449d6705d9c3d5b8a335b9679e0e911038bf7b3df8",
  "2026-11": "fda5e13af645d6783a6a84b6314c42d7fbc3916279ca33cbe0f3fd7f656a9320",
  "2026-12": "ef0ddba4c0d30c5fec550110f26d9a95fd688e7b49f60d8d7e8192fb95f286d0",
  "2027-01": "8b2f06979c82e7e84acdb460632d4ca8b2c749947a16500ef13af22e2e2e45b9",
  "2027-02": "89349352e0ede47079ef0dc615952527c5beba1e92bae9fe1c0a2dc1e12088df",
  "2027-03": "8895edca1938e77a50f280282a30295a77f821ebf1facc9fe132c715f81810db"
};

function hashPasscodeNode(passcode: string) {
    return crypto.createHash('sha256').update(passcode).digest('hex');
}

app.post('/api/login', (req, res) => {
    try {
        const { passcode } = req.body;
        const currentMonth = new Date().toISOString().slice(0, 7);
        const expectedHash = MONTHLY_HASHES[currentMonth];

        if (!expectedHash) {
            return res.status(401).json({ error: 'No hash for current month' });
        }

        if (typeof passcode !== 'string') {
            return res.status(400).json({ error: 'Passcode must be a string', body: req.body });
        }

        const inputHash = hashPasscodeNode(passcode);
        if (inputHash === expectedHash) {
            const token = jwt.sign({ authenticated: true }, JWT_SECRET, { expiresIn: '12h' });
            res.cookie('auth_token', token, { 
                httpOnly: true, 
                secure: true, 
                sameSite: 'none',
                maxAge: 12 * 60 * 60 * 1000 // 12 hours
            });
            res.json({ success: true });
        } else {
            res.status(401).json({ error: 'Invalid passcode' });
        }
    } catch (err: any) {
        res.status(500).json({ error: err.message, stack: err.stack });
    }
});

app.post('/api/logout', (_req, res) => {
    res.clearCookie('auth_token', {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
    });
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
        const viteModule = 'vite';
        const { createServer: createViteServer } = await import(/* @vite-ignore */ viteModule);
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa'
        });
        app.use(vite.middlewares);
    } else {
        const distPath = path.join(process.cwd(), 'dist');
        app.use(express.static(distPath));
        app.get('*all', (_req, res) => {
            res.sendFile(path.join(distPath, 'index.html'));
        });
    }

    if (!process.env.VERCEL) {
        const PORT = 3000;
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT}`);
        });
    }
}

if (!process.env.VERCEL) {
    startServer();
}

export default app;
