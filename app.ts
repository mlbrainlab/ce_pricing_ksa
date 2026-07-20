import express from 'express';
import cookieParser from 'cookie-parser';
import { calculatePricing } from './services/pricingEngine.js';
import { getPublicMetadata } from './services/metadata.js';
import { generateQuotePDF } from './services/pdfGenerator.js';
import { generateQuoteExcel } from './services/excelGenerator.js';

const app = express();
app.set('trust proxy', 1);
app.use((req, res, next) => {
    if (req.body !== undefined) {
        next();
    } else {
        express.json({ limit: '50mb' })(req, res, next);
    }
});
app.use(cookieParser());

// Middleware to protect routes using Firebase Auth
import { getAuth } from "firebase-admin/auth";
import { initializeApp, getApps } from "firebase-admin/app";
import fs from 'fs';
import path from 'path';

// Initialize Firebase Admin
let projectId: string | undefined = undefined;
try {
    if (getApps().length === 0) {
        try {
            const cwd = process.cwd();
            const configPaths = [
                path.join(cwd, 'firebase-applet-config.json'),
                path.join(cwd, '..', 'firebase-applet-config.json')
            ];
            
            for (const p of configPaths) {
                if (fs.existsSync(p)) {
                    projectId = JSON.parse(fs.readFileSync(p, 'utf8')).projectId;
                    break;
                }
            }
        } catch (e: any) {
            console.warn("Could not find or parse firebase-applet-config.json", e.message);
        }

        if (!projectId) { 
            projectId = 'gen-lang-client-0528663295';
        }
        
        initializeApp({ projectId });
        console.log("Firebase Admin initialized" + (projectId ? ` with project ${projectId}` : " without project ID"));
    }
} catch (e: any) {
    console.error("FATAL ERROR initializing Firebase Admin:", e);
}

const requireAuth = async (req: any, res: any, next: any) => {
    try {
        let idToken;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            idToken = req.headers.authorization.split('Bearer ')[1];
        }
        
        if (!idToken) {
            return res.status(401).json({ error: 'Unauthorized: No token provided' });
        }

        // Wrap getAuth() so if it throws synchronously it is caught!
        let authService;
        try {
            authService = getAuth();
        } catch (e: any) {
            console.error("Firebase not initialized:", e);
            return res.status(500).json({ error: 'Internal Server Error: Auth Service Unavailable', details: e.message });
        }

        const decodedToken = await authService.verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error: any) {
        if (error.code !== 'auth/argument-error' && process.env.NODE_ENV !== 'production') {
            console.error('Firebase Auth Error:', error.message);
        }
        res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

app.get('/api/metadata', (_req, res) => {
    res.json(getPublicMetadata());
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

app.post('/api/export-pdf', requireAuth, async (req, res) => {
    try {
        const { config, data, options } = req.body;
        const pdfBuffer = await generateQuotePDF(config, data, options);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=quote.pdf');
        res.send(pdfBuffer);
    } catch (error) {
        console.error('PDF generation error:', error);
        res.status(500).json({ error: 'PDF generation failed' });
    }
});

app.post('/api/export-excel', requireAuth, async (req, res) => {
    try {
        const { config, data, options } = req.body;
        const excelBuffer = await generateQuoteExcel(config, data, options);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=quote.xlsx');
        res.send(excelBuffer);
    } catch (error) {
        console.error('Excel generation error:', error);
        res.status(500).json({ error: 'Excel generation failed' });
    }
});

app.get('/api/proxy-font', async (req, res) => {
    try {
        const fontUrl = req.query.url as string;
        if (!fontUrl) return res.status(400).send('Missing url');
        
        // Ensure the URL is valid
        new URL(fontUrl);

        const response = await fetch(fontUrl);
        if (!response.ok) {
            return res.status(response.status).send('Fetcher Error');
        }
        
        const buffer = await response.arrayBuffer();
        res.setHeader('Content-Type', 'font/ttf');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.send(Buffer.from(buffer));
    } catch (e) {
        console.error('Proxy Error:', e);
        res.status(500).send('Error proxying font');
    }
});

app.post('/api/notify-admin', requireAuth, async (req, res) => {
    try {
        const { event, quoteId, authorName, quoteName } = req.body;
        // In a real application, you would integrate a mailer service here, e.g., NodeMailer, SendGrid, Mailchimp.
        // For now, we simulate the email behavior with console.log on the server.
        console.log(`[EMAIL NOTIFICATION TO ADMIN] Event: ${event} | Quote ID: ${quoteId} | Author: ${authorName} | Name: ${quoteName}`);
        res.json({ success: true, notified: true });
    } catch (e) {
        console.error('Notify admin error:', e);
        res.status(500).json({ error: 'Notification failed' });
    }
});

app.use((err: any, _req: any, res: any, _next: any) => {
    console.error('Unhandled error in Express middleware:', err);
    if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error', details: err.message || String(err) });
    }
});

export default app;
