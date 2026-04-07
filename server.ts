import express from 'express';
import path from 'path';
import app from './app.js';

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
