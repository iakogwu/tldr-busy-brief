import { Request, Response, NextFunction } from 'express';

// Simple Bearer Token Middleware
// In a real OAuth setup, you would verify the JWT signature here using 'jose'.
// For v1 Production, we verify against a server-side secret to prevent unauthorized usage.

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Allow health checks and public assets without auth
    if (req.path === '/health' || req.path === '/widget/index.html' || req.path === '/style.css') {
        return next();
    }

    // SSE Handshake usually happens via GET. 
    // MCP SDK might allow passing token in query param or headers.
    // For now, we'll implement a permissive mode for Dev, and strict for Prod.

    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    const expectedSecret = process.env.AUTH_SECRET;

    if (!expectedSecret) {
        // If no secret is set, we default to OPEN (but warn).
        // This allows local dev to work without config.
        if (process.env.NODE_ENV === 'production') {
            console.warn("Security Warning: AUTH_SECRET not set in Production.");
        }
        return next();
    }

    if (token === expectedSecret) {
        return next();
    }

    // If we are here, auth failed.
    console.warn(`Unauthorized access attempt from ${req.ip}`);
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
};
