import express from 'express';
import { supabase, getUserClient } from './services/supabaseClient.js';
import cookieParser from 'cookie-parser';
import { calculatePricing } from './services/pricingEngine.js';
import { getPublicMetadata } from './services/metadata.js';
import { generateQuotePDF } from './services/pdfGenerator.js';
import { generateQuoteExcel } from './services/excelGenerator.js';

const app = express();
app.set('trust proxy', 1);

app.use((req, res, next) => {
    if (req.body && Object.keys(req.body).length > 0) {
        next();
    } else {
        express.json({ limit: '50mb' })(req, res, next);
    }
});
app.use(cookieParser());

// Middleware to protect routes using Supabase JWT
const requireAuth = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    const token = authHeader.split(' ')[1];
    
    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        req.user = user;
        req.token = token;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Authentication error' });
    }
};

app.get('/api/verify', requireAuth, (_req, res) => {
    res.json({ success: true });
});

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


app.get('/api/quotes', requireAuth, async (req: any, res: any) => {
    try {
        const { data, error } = await getUserClient(req.token)
            .from('quotes')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/quotes', requireAuth, async (req: any, res: any) => {
    try {
        const { title, config, results, is_draft } = req.body;
        const { data, error } = await getUserClient(req.token)
            .from('quotes')
            .insert([{
                user_id: req.user.id,
                title,
                config,
                results,
                is_draft
            }])
            .select()
            .single();
            
        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/quotes/:id', requireAuth, async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const { error } = await getUserClient(req.token)
            .from('quotes')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user.id);
            
        if (error) throw error;
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default app;
