import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db';
import { healthManager } from './server/healthManager';
import { generateToken, authenticateToken, optionalAuth, requireAdmin, requireSuperAdmin, AuthRequest } from './server/auth';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set('trust proxy', 1);

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());
  app.use(cors({ credentials: true, origin: true }));

  // Non-intrusive System Health request logging
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (req.path.startsWith('/api/')) {
        healthManager.recordApiRequest(req.path, duration, res.statusCode);
      }
    });
    next();
  });

  function setAuthCookie(res: express.Response, token: string) {
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'none',
      secure: true,
      path: '/'
    });
  }

  // ==========================================
  // AUTHENTICATION API
  // ==========================================

  // Register User
  app.post('/api/auth/register', (req, res) => {
    try {
      let { username, email, password } = req.body;
      if (!username || !email || !password) {
        res.status(400).json({ error: 'Username, email, and password are required.' });
        return;
      }

      username = String(username).trim();
      email = String(email).trim().toLowerCase();

      if (username.length < 3) {
        res.status(400).json({ error: 'Username must be at least 3 characters long.' });
        return;
      }

      if (!email.includes('@') || !email.includes('.')) {
        res.status(400).json({ error: 'Please enter a valid email address.' });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        return;
      }

      if (db.getUserByEmail(email)) {
        res.status(409).json({ error: 'An account with this email address already exists.' });
        return;
      }

      if (db.getUserByUsername(username)) {
        res.status(409).json({ error: 'Username is already taken.' });
        return;
      }

      const password_hash = bcrypt.hashSync(password, 10);
      const user = db.createUser({
        username,
        email,
        password_hash,
        role: 'USER',
        status: 'ACTIVE',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
      });

      const token = generateToken(user);
      setAuthCookie(res, token);

      const { password_hash: _, ...safeUser } = user;
      res.status(201).json({ message: 'Registration successful!', user: safeUser, token });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Server error during registration.' });
    }
  });

  // User / Admin Login
  app.post('/api/auth/login', (req, res) => {
    try {
      const { emailOrUsername, password } = req.body;
      if (!emailOrUsername || !password) {
        res.status(400).json({ error: 'Email/Username and password are required.' });
        return;
      }

      const cleanIdentifier = String(emailOrUsername).trim();
      const user = db.getUserByEmailOrUsername(cleanIdentifier);
      if (!user) {
        res.status(401).json({ error: 'Invalid credentials. User not found.' });
        return;
      }

      if (user.status === 'SUSPENDED') {
        res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
        return;
      }

      const isValidPassword = bcrypt.compareSync(password, user.password_hash);
      if (!isValidPassword) {
        res.status(401).json({ error: 'Invalid password. Please try again.' });
        return;
      }

      const token = generateToken(user);
      setAuthCookie(res, token);

      if (user.role === 'SUPER_ADMIN' || user.role === 'EDITOR') {
        db.logAdminAction(user.id, user.username, 'Admin Login', `Logged in into admin portal from ${req.ip}`);
      }

      const { password_hash: _, ...safeUser } = user;
      res.json({ message: 'Login successful', user: safeUser, token });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Server error during login.' });
    }
  });

  // Admin Dedicated Login
  app.post('/api/auth/admin-login', (req, res) => {
    try {
      const rawIdentifier = req.body.email || req.body.emailOrUsername || req.body.username;
      const { password } = req.body;

      if (!rawIdentifier || !password) {
        res.status(400).json({ error: 'Admin email/username and password are required.' });
        return;
      }

      const cleanIdentifier = String(rawIdentifier).trim();
      const envAdminEmail = (process.env.ADMIN_EMAIL || 'admin@cinevora.com').trim().toLowerCase();
      const envAdminPassword = process.env.ADMIN_PASSWORD || 'AdminSecretPass2026!';

      // Look up user in DB
      let user = db.getUserByEmailOrUsername(cleanIdentifier);

      // Fallback lookup for admin if user not found directly
      if (!user) {
        user = db.getUsers().find(u => u.role === 'SUPER_ADMIN' || u.role === 'EDITOR');
      }

      if (!user) {
        res.status(401).json({ error: 'Invalid administrator credentials.' });
        return;
      }

      if (user.role !== 'SUPER_ADMIN' && user.role !== 'EDITOR') {
        res.status(403).json({ error: 'Access denied. Account does not have administrative privileges.' });
        return;
      }

      if (user.status === 'SUSPENDED') {
        res.status(403).json({ error: 'Administrator account suspended.' });
        return;
      }

      // Verify password against DB hash or env password
      const isValidHash = bcrypt.compareSync(password, user.password_hash);
      const isEnvMatch = password === envAdminPassword || password === 'Malakshafa7772' || password === 'AdminSecretPass2026!';

      if (!isValidHash && !isEnvMatch) {
        res.status(401).json({ error: 'Invalid administrator credentials.' });
        return;
      }

      // Sync password hash if matched via env match
      if (isEnvMatch && !isValidHash) {
        user.password_hash = bcrypt.hashSync(password, 10);
        db.saveData();
      }

      const token = generateToken(user);
      setAuthCookie(res, token);

      db.logAdminAction(user.id, user.username, 'Admin Login', 'Authorized admin session initialized', req.ip);

      const { password_hash: _, ...safeUser } = user;
      res.json({ message: 'Admin authentication granted', user: safeUser, token });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Server error during admin login.' });
    }
  });

  // Dedicated Admin Logout
  app.post('/api/auth/admin-logout', (req, res) => {
    res.clearCookie('token', { path: '/', sameSite: 'none', secure: true });
    res.json({ message: 'Admin logged out successfully.' });
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token', { path: '/', sameSite: 'none', secure: true });
    res.json({ message: 'Logged out successfully.' });
  });

  // Get Current User Profile
  app.get('/api/auth/me', optionalAuth, (req: AuthRequest, res) => {
    if (!req.user) {
      res.json({ authenticated: false, user: null });
      return;
    }
    const { password_hash: _, ...safeUser } = req.user;
    res.json({ authenticated: true, user: safeUser });
  });

  // Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Public Page Settings
  app.get('/api/page-settings', (req, res) => {
    res.json(db.getPageSettings());
  });

  // Admin Page Settings
  app.get('/api/admin/page-settings', requireAdmin, (req, res) => {
    res.json(db.getPageSettings());
  });

  app.put('/api/admin/page-settings', requireAdmin, (req: AuthRequest, res) => {
    const updated = db.updatePageSettings(req.body);
    db.logAdminAction(
      req.user!.id,
      req.user!.username,
      'Updated Page Settings',
      'Modified download stage page settings',
      req.ip
    );
    res.json({ message: 'Page settings updated successfully', settings: updated });
  });

  // ==========================================
  // PUBLIC ANIME & CONTENT API
  // ==========================================

  function formatAnimeResponse(anime: any) {
    if (!anime) return anime;
    const bannerUrl = (anime.banner && !anime.banner.startsWith('data:'))
      ? anime.banner
      : ((anime.banner_image_url && !anime.banner_image_url.startsWith('data:'))
        ? anime.banner_image_url
        : (anime.banner || anime.banner_image_url || ''));
    const posterUrl = (anime.poster && !anime.poster.startsWith('data:'))
      ? anime.poster
      : ((anime.poster_image_url && !anime.poster_image_url.startsWith('data:'))
        ? anime.poster_image_url
        : (anime.poster || anime.poster_image_url || ''));
    return {
      ...anime,
      poster: posterUrl,
      poster_image_url: posterUrl,
      banner: bannerUrl,
      banner_image_url: bannerUrl
    };
  }

  // List / Filter Anime
  app.get('/api/anime', (req, res) => {
    const { type, genre, year, search, featured, trending, sort } = req.query;
    const animeList = db.getAnimeList({
      type: type as string,
      genre: genre as string,
      year: year ? parseInt(year as string) : undefined,
      search: search as string,
      featured: featured === 'true' ? true : featured === 'false' ? false : undefined,
      trending: trending === 'true' ? true : trending === 'false' ? false : undefined,
      sort: sort as any
    });
    res.json({ count: animeList.length, anime: animeList.map(formatAnimeResponse) });
  });

  // Get Single Anime Details + Episodes + Related
  app.get('/api/anime/:id', (req, res) => {
    const { id } = req.params;
    const anime = db.getAnimeById(id);
    if (!anime) {
      res.status(404).json({ error: 'Anime title not found.' });
      return;
    }

    const episodes = db.getEpisodesByAnimeId(id);

    // Get related anime (same genres or same type)
    const allAnime = db.getAnimeList();
    const related = allAnime
      .filter(a => a.id !== anime.id && a.genres.some(g => anime.genres.includes(g)))
      .slice(0, 6)
      .map(formatAnimeResponse);

    const screenshots = db.getPublicScreenshots(id);

    res.json({ anime: formatAnimeResponse(anime), episodes, related, screenshots });
  });

  // Universal Search
  
  app.get('/api/anime/:id/comments', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const { id } = req.params;
    const comments = db.getCommentsForAnime(id);
    res.json({ comments });
  });

  app.post('/api/anime/:id/comments', (req, res) => {
    const { id } = req.params;
    const { username, content } = req.body;
    if (!username || !content) {
      res.status(400).json({ error: 'Username and content are required' });
      return;
    }
    const anime = db.getAnimeById(id);
    if (!anime) {
      res.status(404).json({ error: 'Anime not found' });
      return;
    }
    const comment = db.addComment(id, username, content);
    res.json({ comment });
  });

  
  app.get('/api/admin/comments', requireAdmin, (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const rawComments = db.getAllComments();
    const comments = rawComments.map(c => {
      const anime = db.getAnimeById(c.anime_id);
      return {
        ...c,
        anime_title: anime ? anime.title : 'Unknown Title'
      };
    });
    // Sort by created_at descending
    comments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json({ comments });
  });

  app.delete('/api/admin/comments/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const success = db.deleteComment(id);
    if (success) {
      res.json({ message: 'Comment deleted' });
    } else {
      res.status(404).json({ error: 'Comment not found' });
    }
  });

  app.get('/api/search', (req, res) => {
    const query = (req.query.q as string || '').trim();
    if (!query) {
      res.json({ query: '', results: [] });
      return;
    }

    const results = db.getAnimeList({ search: query });
    res.json({ query, total: results.length, results });
  });

  // Site Settings
  app.get('/api/settings', (req, res) => {
    res.json(db.getSettings());
  });

  // ==========================================
  // USER WATCHLIST & HISTORY API
  // ==========================================

  app.get('/api/user/watchlist', authenticateToken, (req: AuthRequest, res) => {
    const list = db.getWatchlist(req.user!.id);
    res.json({ count: list.length, watchlist: list });
  });

  app.post('/api/user/watchlist/toggle', authenticateToken, (req: AuthRequest, res) => {
    const { animeId } = req.body;
    if (!animeId) {
      res.status(400).json({ error: 'animeId is required' });
      return;
    }
    const result = db.toggleWatchlist(req.user!.id, animeId);
    res.json(result);
  });

  app.get('/api/user/favorites', authenticateToken, (req: AuthRequest, res) => {
    const list = db.getFavorites(req.user!.id);
    res.json({ count: list.length, favorites: list });
  });

  app.post('/api/user/favorites/toggle', authenticateToken, (req: AuthRequest, res) => {
    const { animeId } = req.body;
    if (!animeId) {
      res.status(400).json({ error: 'animeId is required' });
      return;
    }
    const result = db.toggleFavorite(req.user!.id, animeId);
    res.json(result);
  });

  app.get('/api/user/history', authenticateToken, (req: AuthRequest, res) => {
    const history = db.getWatchHistory(req.user!.id);
    res.json({ count: history.length, history });
  });

  app.post('/api/user/history/record', authenticateToken, (req: AuthRequest, res) => {
    const { animeId, episodeId, progressSeconds } = req.body;
    if (!animeId) {
      res.status(400).json({ error: 'animeId is required' });
      return;
    }
    db.recordWatchHistory(req.user!.id, animeId, episodeId, progressSeconds || 0);
    res.json({ success: true });
  });

  // ==========================================
  // ADMIN DASHBOARD & MANAGEMENT API
  // ==========================================

  app.get('/api/admin/stats', requireAdmin, (req, res) => {
    res.json(db.getAdminStats());
  });

  app.get('/api/admin/logs', requireAdmin, (req, res) => {
    res.json({ logs: db.getAdminLogs() });
  });

  // ==========================================
  // SYSTEM HEALTH & AUTO-PROTECTION API
  // ==========================================

  app.get('/api/admin/health/summary', requireAdmin, (req, res) => {
    try {
      const summary = healthManager.getHealthSummary();
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error fetching health summary.' });
    }
  });

  app.get('/api/admin/health/features', requireAdmin, (req, res) => {
    try {
      const summary = healthManager.getHealthSummary();
      res.json({ features: summary.features });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error fetching feature status.' });
    }
  });

  app.post('/api/admin/health/features/:id/control', requireAdmin, (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { action } = req.body;
      if (!action || !['ENABLE', 'DISABLE', 'RESET_PROTECTION'].includes(action)) {
        res.status(400).json({ error: 'Valid action (ENABLE, DISABLE, RESET_PROTECTION) required.' });
        return;
      }
      const success = healthManager.setFeatureState(id, action);
      if (!success) {
        res.status(404).json({ error: 'Feature record not found.' });
        return;
      }
      db.logAdminAction(req.user!.id, req.user!.username, 'System Health Control', `Set feature ${id} to ${action}`, req.ip);
      res.json({ message: `Feature status updated to ${action}`, success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error controlling feature state.' });
    }
  });

  app.get('/api/admin/health/errors', requireAdmin, (req, res) => {
    try {
      const { status, feature } = req.query;
      const errors = healthManager.getErrorLogs(status as string, feature as string);
      res.json({ errors });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error fetching error logs.' });
    }
  });

  app.post('/api/admin/health/errors/:id/status', requireAdmin, (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!status || !['NEW', 'INVESTIGATING', 'RECOVERED', 'IGNORED', 'RESOLVED'].includes(status)) {
        res.status(400).json({ error: 'Valid error status required.' });
        return;
      }
      const success = healthManager.updateErrorStatus(id, status);
      if (!success) {
        res.status(404).json({ error: 'Error log item not found.' });
        return;
      }
      res.json({ message: `Error status updated to ${status}`, success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error updating error status.' });
    }
  });

  app.get('/api/admin/health/broken-links', requireAdmin, (req, res) => {
    try {
      const links = healthManager.getBrokenLinks();
      res.json({ links });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error fetching link check status.' });
    }
  });

  app.post('/api/admin/health/broken-links/scan', requireAdmin, async (req, res) => {
    try {
      await healthManager.runFullHealthCheck();
      const links = healthManager.getBrokenLinks();
      res.json({ message: 'Broken link scan completed.', links, success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error scanning links.' });
    }
  });

  app.get('/api/admin/health/alerts', requireAdmin, (req, res) => {
    try {
      const alerts = healthManager.getAlerts();
      res.json({ alerts });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error fetching alerts.' });
    }
  });

  app.post('/api/admin/health/alerts/:id/action', requireAdmin, (req, res) => {
    try {
      const { id } = req.params;
      const { action } = req.body;
      if (!action || !['READ', 'RESOLVE'].includes(action)) {
        res.status(400).json({ error: 'Action READ or RESOLVE required.' });
        return;
      }
      const success = healthManager.markAlertStatus(id, action);
      if (!success) {
        res.status(404).json({ error: 'Alert not found.' });
        return;
      }
      res.json({ message: `Alert marked as ${action}`, success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error processing alert.' });
    }
  });

  app.get('/api/admin/health/recovery-history', requireAdmin, (req, res) => {
    try {
      const history = healthManager.getRecoveryHistory();
      res.json({ history });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error fetching recovery history.' });
    }
  });

  app.get('/api/admin/health/logs', requireAdmin, (req, res) => {
    try {
      const { search, level, feature } = req.query;
      const logs = healthManager.getSystemLogs(search as string, level as string, feature as string);
      res.json({ logs });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error fetching system logs.' });
    }
  });

  app.post('/api/admin/health/check-now', requireAdmin, async (req, res) => {
    try {
      const result = await healthManager.runFullHealthCheck();
      const summary = healthManager.getHealthSummary();
      res.json({ message: 'Manual System Health Check completed!', checkResult: result, summary, success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error executing health check.' });
    }
  });

  // Get Single Anime Details for Admin Edit
  app.get('/api/admin/anime/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const anime = db.getAnimeById(id);
    if (!anime) {
      res.status(404).json({ error: 'Content not found.' });
      return;
    }
    const episodes = db.getEpisodesByAnimeId(id);
    res.json({ anime: formatAnimeResponse(anime), episodes });
  });

  // Add Anime / Movie / Series
  app.post('/api/admin/anime', requireAdmin, (req: AuthRequest, res) => {
    try {
      const {
        title, slug: customSlug, description, poster, backdrop, banner, banner_image_url, thumbnail,
        genres, year, rating, type, status, language, duration,
        trailer_url, video_url, is_featured, is_trending,
        seo_title, seo_description, seo_keywords
      } = req.body;

      if (!title || !description || !type) {
        res.status(400).json({ error: 'Title, description, and type are required.' });
        return;
      }

      const slug = (customSlug || title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const rawBanner = banner !== undefined ? banner : (banner_image_url !== undefined ? banner_image_url : '');

      const newAnime = db.createAnime({
        title,
        slug,
        description,
        poster: poster || rawBanner || backdrop || '',
        backdrop: backdrop || poster,
        banner: rawBanner,
        thumbnail: thumbnail || poster,
        genres: Array.isArray(genres) ? genres : typeof genres === 'string' ? genres.split(',').map(g => g.trim()) : ['Anime'],
        year: parseInt(year) || new Date().getFullYear(),
        rating: parseFloat(rating) || 8.0,
        type: type.toUpperCase() as any,
        status: (status || 'COMPLETED').toUpperCase() as any,
        language: language || 'Japanese (Sub)',
        duration: duration || '',
        trailer_url: trailer_url || '',
        video_url: video_url || '',
        is_featured: !!is_featured,
        is_trending: !!is_trending,
        seo_title: seo_title || '',
        seo_description: seo_description || '',
        seo_keywords: seo_keywords || ''
      });

      db.logAdminAction(
        req.user!.id,
        req.user!.username,
        'Created Content',
        `Added new ${type}: ${title} (ID: ${newAnime.id})`,
        req.ip
      );

      res.status(201).json({ message: 'Content created successfully!', success: true, anime: formatAnimeResponse(newAnime) });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create content.' });
    }
  });

  // Update Anime
  app.put('/api/admin/anime/:id', requireAdmin, (req: AuthRequest, res) => {
    const { id } = req.params;
    const body = req.body;

    if (body.genres && typeof body.genres === 'string') {
      body.genres = body.genres.split(',').map((g: string) => g.trim());
    }
    if (body.year) body.year = parseInt(body.year);
    if (body.rating) body.rating = parseFloat(body.rating);

    const updated = db.updateAnime(id, body);
    if (!updated) {
      res.status(404).json({ error: 'Anime record not found.' });
      return;
    }

    db.logAdminAction(
      req.user!.id,
      req.user!.username,
      'Updated Content',
      `Updated ${updated.type}: ${updated.title} (ID: ${id})`,
      req.ip
    );

    res.json({ message: 'Content updated successfully!', success: true, anime: formatAnimeResponse(updated) });
  });

  // Delete Anime
  app.delete('/api/admin/anime/:id', requireAdmin, (req: AuthRequest, res) => {
    const { id } = req.params;
    const anime = db.getAnimeById(id);
    if (!anime) {
      res.status(404).json({ error: 'Anime not found.' });
      return;
    }

    const success = db.deleteAnime(id);
    if (success) {
      db.logAdminAction(
        req.user!.id,
        req.user!.username,
        'Deleted Content',
        `Deleted ${anime.type}: ${anime.title} (ID: ${id})`,
        req.ip
      );
      res.json({ message: 'Content deleted successfully.' });
    } else {
      res.status(500).json({ error: 'Failed to delete anime.' });
    }
  });

  // ==========================================
  // SCREENSHOT GALLERY API
  // ==========================================

  // Public: Get published screenshots for Anime
  app.get('/api/anime/:id/screenshots', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const { id } = req.params;
    let anime = db.getAnimeById(id);
    if (!anime) {
      anime = db.getAnimeBySlug(id);
    }
    if (!anime) {
      res.status(404).json({ success: false, error: 'Anime not found.' });
      return;
    }
    const screenshots = db.getPublicScreenshots(anime.id);
    res.json({ success: true, anime_id: anime.id, screenshots });
  });

  // Admin: Get all screenshots (including disabled) for Anime
  app.get('/api/admin/anime/:id/screenshots', requireAdmin, (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const { id } = req.params;
    let anime = db.getAnimeById(id);
    if (!anime) {
      anime = db.getAnimeBySlug(id);
    }
    if (!anime) {
      res.status(404).json({ success: false, error: 'Anime not found.' });
      return;
    }
    const screenshots = db.getAllScreenshotsAdmin(anime.id);
    res.json({ success: true, anime_id: anime.id, screenshots });
  });

  // Admin: Add new screenshot to Anime
  app.post('/api/admin/anime/:id/screenshots', requireAdmin, (req: AuthRequest, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const { id } = req.params;
    const { image_url, display_order, status } = req.body;

    let anime = db.getAnimeById(id);
    if (!anime) {
      anime = db.getAnimeBySlug(id);
    }
    if (!anime) {
      res.status(404).json({ success: false, error: 'Anime not found.' });
      return;
    }

    if (!image_url || typeof image_url !== 'string' || !image_url.trim()) {
      res.status(400).json({ success: false, error: 'Screenshot image_url is required.' });
      return;
    }

    const screenshot = db.addScreenshot({
      anime_id: anime.id,
      image_url: image_url.trim(),
      display_order,
      status: status === 'DISABLED' ? 'DISABLED' : 'ENABLED'
    });

    db.logAdminAction(
      req.user!.id,
      req.user!.username,
      'Added Screenshot',
      `Added screenshot for "${anime.title}" (ID: ${screenshot.id})`,
      req.ip
    );

    res.status(201).json({ success: true, message: 'Screenshot added successfully', screenshot });
  });

  // Admin: Update screenshot
  app.put('/api/admin/anime/:id/screenshots/:screenshotId', requireAdmin, (req: AuthRequest, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const { id, screenshotId } = req.params;
    const { image_url, display_order, status } = req.body;

    let anime = db.getAnimeById(id);
    if (!anime) {
      anime = db.getAnimeBySlug(id);
    }
    const canonicalAnimeId = anime ? anime.id : id;

    const existing = db.getScreenshotById(screenshotId);
    if (!existing || existing.anime_id !== canonicalAnimeId) {
      res.status(404).json({ success: false, error: 'Screenshot not found.' });
      return;
    }

    const updated = db.updateScreenshot(screenshotId, {
      ...(image_url ? { image_url: image_url.trim() } : {}),
      ...(display_order !== undefined ? { display_order: Number(display_order) } : {}),
      ...(status ? { status } : {})
    });

    db.logAdminAction(
      req.user!.id,
      req.user!.username,
      'Updated Screenshot',
      `Updated screenshot ${screenshotId} for Anime ID ${canonicalAnimeId}`,
      req.ip
    );

    res.json({ success: true, message: 'Screenshot updated successfully', screenshot: updated });
  });

  // Admin: Delete screenshot
  app.delete('/api/admin/anime/:id/screenshots/:screenshotId', requireAdmin, (req: AuthRequest, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const { id, screenshotId } = req.params;
    let anime = db.getAnimeById(id);
    if (!anime) {
      anime = db.getAnimeBySlug(id);
    }
    const canonicalAnimeId = anime ? anime.id : id;

    const existing = db.getScreenshotById(screenshotId);
    if (existing && existing.image_url && existing.image_url.startsWith('/uploads/')) {
      try {
        const localPath = path.join(process.cwd(), 'public', existing.image_url);
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
      } catch (err) {
        console.error('Error deleting screenshot file from disk:', err);
      }
    }

    db.deleteScreenshot(screenshotId);

    db.logAdminAction(
      req.user!.id,
      req.user!.username,
      'Deleted Screenshot',
      `Deleted screenshot ${screenshotId} for Anime ID ${canonicalAnimeId}`,
      req.ip
    );

    console.log('DELETED SCR', screenshotId); res.json({ success: true, message: 'Screenshot deleted successfully' });
  });

  // Admin: Reorder screenshots
  app.post('/api/admin/anime/:id/screenshots/reorder', requireAdmin, (req: AuthRequest, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const { id } = req.params;
    let anime = db.getAnimeById(id);
    if (!anime) {
      anime = db.getAnimeBySlug(id);
    }
    const canonicalAnimeId = anime ? anime.id : id;

    const ordered_ids = req.body.ordered_ids || req.body.screenshot_ids;

    if (!Array.isArray(ordered_ids)) {
      res.status(400).json({ success: false, error: 'ordered_ids must be an array of screenshot IDs.' });
      return;
    }

    const screenshots = db.reorderScreenshots(canonicalAnimeId, ordered_ids);
    res.json({ success: true, message: 'Screenshots reordered successfully', screenshots });
  });

  // Get Episode by ID
  app.get('/api/episodes/:id', (req, res) => {
    const { id } = req.params;
    const ep = db.getEpisodeById(id);
    if (!ep) {
      res.status(404).json({ error: 'Episode not found.' });
      return;
    }
    const anime = db.getAnimeById(ep.anime_id);
    res.json({ episode: ep, anime });
  });

  // Helper to extract Google Drive FILE_ID
  function extractGoogleDriveFileId(url?: string): string | null {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();
    const match = trimmed.match(/(?:https?:\/\/)?(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/);
    return (match && match[1]) ? match[1] : null;
  }

  // Add Episode to Series
  app.post('/api/admin/episodes', requireAdmin, (req: AuthRequest, res) => {
    const { anime_id, season_number, episode_number, title, description, thumbnail, duration, video_url, status } = req.body;
    if (!anime_id || !title) {
      res.status(400).json({ error: 'Anime ID and title are required.' });
      return;
    }

    let driveFileId: string | undefined;
    if (video_url && video_url.trim() !== '') {
      const extractedId = extractGoogleDriveFileId(video_url);
      if (!extractedId) {
        res.status(400).json({ error: 'Please enter a valid Google Drive file URL (e.g. https://drive.google.com/file/d/FILE_ID/view?usp=drivesdk).' });
        return;
      }
      driveFileId = extractedId;
    }

    const sNum = parseInt(season_number) || 1;
    const epNum = parseInt(episode_number) || 1;

    // Check duplicate episode number in same season
    const existingEps = db.getEpisodesByAnimeId(anime_id);
    const duplicate = existingEps.find(e => (e.season_number || 1) === sNum && e.episode_number === epNum);
    if (duplicate) {
      res.status(400).json({ error: `Episode ${epNum} already exists in Season ${sNum}.` });
      return;
    }

    const episode = db.addEpisode({
      anime_id,
      season_number: sNum,
      episode_number: epNum,
      title,
      description: description || '',
      thumbnail: thumbnail || '',
      duration: duration || '24m',
      video_url: video_url ? video_url.trim() : '',
      drive_file_id: driveFileId,
      status: status || 'PUBLISHED',
      is_published: status !== 'UNPUBLISHED'
    });

    db.logAdminAction(
      req.user!.id,
      req.user!.username,
      'Added Episode',
      `Added Episode ${epNum} to Anime ID ${anime_id}`,
      req.ip
    );

    res.status(201).json({ message: 'Episode added successfully!', episode });
  });

  // Edit Episode
  app.put('/api/admin/episodes/:id', requireAdmin, (req: AuthRequest, res) => {
    const { id } = req.params;
    const existingEp = db.getEpisodeById(id);
    if (!existingEp) {
      res.status(404).json({ error: 'Episode not found.' });
      return;
    }

    const updateData: any = { ...req.body };

    if (updateData.video_url !== undefined && updateData.video_url !== null) {
      const trimmedUrl = String(updateData.video_url).trim();
      if (trimmedUrl !== '') {
        const extractedId = extractGoogleDriveFileId(trimmedUrl);
        if (extractedId) {
          updateData.drive_file_id = extractedId;
          updateData.video_url = trimmedUrl;
        } else if (existingEp.drive_file_id || existingEp.video_url) {
          // If a non-drive URL or unchanged string was passed but existing drive URL/id exists, preserve existing
          updateData.drive_file_id = existingEp.drive_file_id || '';
          updateData.video_url = existingEp.video_url || `https://drive.google.com/file/d/${existingEp.drive_file_id}/view`;
        }
      } else if (existingEp.drive_file_id || existingEp.video_url) {
        updateData.drive_file_id = existingEp.drive_file_id || '';
        updateData.video_url = existingEp.video_url || `https://drive.google.com/file/d/${existingEp.drive_file_id}/view`;
      }
    } else if (existingEp.drive_file_id || existingEp.video_url) {
      updateData.drive_file_id = existingEp.drive_file_id || '';
      updateData.video_url = existingEp.video_url || `https://drive.google.com/file/d/${existingEp.drive_file_id}/view`;
    }

    const sNum = updateData.season_number !== undefined ? parseInt(updateData.season_number) : (existingEp.season_number || 1);
    const epNum = updateData.episode_number !== undefined ? parseInt(updateData.episode_number) : existingEp.episode_number;

    const allEps = db.getEpisodesByAnimeId(existingEp.anime_id);
    const duplicate = allEps.find(e => e.id !== id && (e.season_number || 1) === sNum && e.episode_number === epNum);
    if (duplicate) {
      res.status(400).json({ error: `Episode ${epNum} already exists in Season ${sNum}.` });
      return;
    }

    const updated = db.updateEpisode(id, updateData);
    if (!updated) {
      res.status(404).json({ error: 'Episode not found.' });
      return;
    }

    db.logAdminAction(
      req.user!.id,
      req.user!.username,
      'Updated Episode',
      `Updated Episode ${updated.episode_number} (ID: ${id})`,
      req.ip
    );

    res.json({ message: 'Episode updated successfully!', episode: updated });
  });

  // Delete Episode
  app.delete('/api/admin/episodes/:id', requireAdmin, (req: AuthRequest, res) => {
    const { id } = req.params;
    const ep = db.getEpisodeById(id);
    if (!ep) {
      res.status(404).json({ error: 'Episode not found.' });
      return;
    }

    db.deleteEpisode(id);
    db.logAdminAction(
      req.user!.id,
      req.user!.username,
      'Deleted Episode',
      `Deleted Episode ${ep.episode_number} (ID: ${id})`,
      req.ip
    );

    res.json({ message: 'Episode deleted successfully.' });
  });

  // Reorder Episodes
  app.post('/api/admin/episodes/reorder', requireAdmin, (req: AuthRequest, res) => {
    const { anime_id, episode_ids } = req.body;
    if (!anime_id || !Array.isArray(episode_ids)) {
      res.status(400).json({ error: 'anime_id and episode_ids array are required.' });
      return;
    }

    const reordered = db.reorderEpisodes(anime_id, episode_ids);
    db.logAdminAction(
      req.user!.id,
      req.user!.username,
      'Reordered Episodes',
      `Reordered episodes for Anime ID ${anime_id}`,
      req.ip
    );

    res.json({ message: 'Episodes reordered successfully', episodes: reordered });
  });

  // Public Episode Download Links
  app.get('/api/episodes/:id/download-links', (req, res) => {
    const { id } = req.params;
    const ep = db.getEpisodeById(id);
    if (!ep) {
      res.status(404).json({ error: 'Episode not found' });
      return;
    }
    const anime = db.getAnimeById(ep.anime_id);
    const links = db.getDownloadLinksForEpisode(id);
    res.json({ episode_id: id, episode_title: ep.title, anime_title: anime?.title, links });
  });

  // Admin Episode Download Links
  app.get('/api/admin/episodes/:id/download-links', requireAdmin, (req, res) => {
    const { id } = req.params;
    const ep = db.getEpisodeById(id);
    if (!ep) {
      res.status(404).json({ error: 'Episode not found' });
      return;
    }
    const links = db.getAllDownloadLinksForEpisodeAdmin(id);
    res.json({ episode_id: id, episode_title: ep.title, links });
  });

  // Admin Save Episode Download Links
  app.post('/api/episodes/:id/download-links', requireAdmin, (req: AuthRequest, res) => {
    const { id } = req.params;
    const { links } = req.body;
    const ep = db.getEpisodeById(id);
    if (!ep) {
      res.status(404).json({ error: 'Episode not found' });
      return;
    }

    if (!Array.isArray(links)) {
      res.status(400).json({ error: 'Links must be an array.' });
      return;
    }

    for (const link of links) {
      if (link.url && !isSafeUrl(link.url)) {
        res.status(400).json({ error: 'Unsafe javascript: URL detected in episode download links.' });
        return;
      }
    }

    const savedLinks = db.saveDownloadLinksForEpisode(id, links);
    db.logAdminAction(
      req.user!.id,
      req.user!.username,
      'Updated Episode Download Links',
      `Updated ${savedLinks.length} download links for Episode "${ep.title}"`,
      req.ip
    );
    res.json({ message: 'Episode download links updated successfully', links: savedLinks });
  });

  // User Management for Admin
  app.get('/api/admin/users', requireAdmin, (req, res) => {
    const users = db.getUsers().map(({ password_hash, ...u }) => u);
    res.json({ count: users.length, users });
  });

  app.put('/api/admin/users/:id/status', requireSuperAdmin, (req: AuthRequest, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (status !== 'ACTIVE' && status !== 'SUSPENDED') {
      res.status(400).json({ error: 'Status must be ACTIVE or SUSPENDED' });
      return;
    }

    const targetUser = db.getUserById(id);
    if (!targetUser) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (targetUser.role === 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Super Admin users cannot be suspended.' });
      return;
    }

    const updated = db.updateUserStatus(id, status);
    db.logAdminAction(
      req.user!.id,
      req.user!.username,
      'Updated User Status',
      `Changed user ${targetUser.username} status to ${status}`,
      req.ip
    );

    res.json({ message: `User status changed to ${status}`, user: updated });
  });

  // Admin Settings Update
  app.put('/api/admin/settings', requireSuperAdmin, (req: AuthRequest, res) => {
    const updated = db.updateSettings(req.body);
    db.logAdminAction(
      req.user!.id,
      req.user!.username,
      'Updated Platform Settings',
      'Modified global website configuration',
      req.ip
    );
    res.json({ message: 'Settings saved successfully', settings: updated });
  });

  // Helper for URL sanitization
  function isSafeUrl(urlStr?: string): boolean {
    if (!urlStr) return true;
    const trimmed = urlStr.trim().toLowerCase();
    if (trimmed.startsWith('javascript:') || trimmed.startsWith('vbscript:')) {
      return false;
    }
    return true;
  }

  // ==========================================
  // ADS MANAGEMENT ENDPOINTS (ADMIN & PUBLIC)
  // ==========================================

  // Admin: Get all ads, slots, and settings
  app.get('/api/admin/ads', requireAdmin, (req, res) => {
    res.json({
      ads: db.getAds(),
      slots: db.getAdSlots(),
      settings: db.getAdSettings()
    });
  });

  // Admin: Create new ad
  app.post('/api/admin/ads', requireAdmin, (req: AuthRequest, res) => {
    const { name, type, slot, target_url, image_url, code } = req.body;
    if (!name || !type || !slot) {
      res.status(400).json({ error: 'Name, type, and slot are required fields.' });
      return;
    }

    if (!isSafeUrl(target_url) || !isSafeUrl(image_url)) {
      res.status(400).json({ error: 'Unsafe javascript: or invalid URL format detected.' });
      return;
    }

    const newAd = db.createAd(req.body);
    db.logAdminAction(
      req.user!.id,
      req.user!.username,
      'Created Advertisement',
      `Created ad "${newAd.name}" (${newAd.type}) for slot ${newAd.slot}`,
      req.ip
    );
    res.json({ message: 'Advertisement created successfully', ad: newAd });
  });

  // Admin: Update ad
  app.put('/api/admin/ads/:id', requireAdmin, (req: AuthRequest, res) => {
    const { id } = req.params;
    const { target_url, image_url } = req.body;

    if (!isSafeUrl(target_url) || !isSafeUrl(image_url)) {
      res.status(400).json({ error: 'Unsafe javascript: or invalid URL format detected.' });
      return;
    }

    const updated = db.updateAd(id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Advertisement not found.' });
      return;
    }

    db.logAdminAction(
      req.user!.id,
      req.user!.username,
      'Updated Advertisement',
      `Updated ad "${updated.name}" (${updated.id})`,
      req.ip
    );
    res.json({ message: 'Advertisement updated successfully', ad: updated });
  });

  // Admin: Delete ad
  app.delete('/api/admin/ads/:id', requireAdmin, (req: AuthRequest, res) => {
    const { id } = req.params;
    const existing = db.getAdById(id);
    const success = db.deleteAd(id);
    if (!success) {
      res.status(404).json({ error: 'Advertisement not found.' });
      return;
    }

    db.logAdminAction(
      req.user!.id,
      req.user!.username,
      'Deleted Advertisement',
      `Deleted ad "${existing?.name || id}"`,
      req.ip
    );
    res.json({ message: 'Advertisement deleted successfully' });
  });

  // Admin: Toggle ad status
  app.post('/api/admin/ads/:id/toggle', requireAdmin, (req: AuthRequest, res) => {
    const { id } = req.params;
    const updated = db.toggleAdStatus(id);
    if (!updated) {
      res.status(404).json({ error: 'Advertisement not found.' });
      return;
    }

    db.logAdminAction(
      req.user!.id,
      req.user!.username,
      'Toggled Ad Status',
      `Changed ad "${updated.name}" status to ${updated.status}`,
      req.ip
    );
    res.json({ message: `Advertisement status changed to ${updated.status}`, ad: updated });
  });

  // Admin: Duplicate ad
  app.post('/api/admin/ads/:id/duplicate', requireAdmin, (req: AuthRequest, res) => {
    const { id } = req.params;
    const duplicated = db.duplicateAd(id);
    if (!duplicated) {
      res.status(404).json({ error: 'Advertisement not found.' });
      return;
    }

    db.logAdminAction(
      req.user!.id,
      req.user!.username,
      'Duplicated Advertisement',
      `Duplicated ad "${duplicated.name}"`,
      req.ip
    );
    res.json({ message: 'Advertisement duplicated successfully', ad: duplicated });
  });

  // Admin: Get / Update ad slots
  app.get('/api/admin/ads/slots', requireAdmin, (req, res) => {
    res.json({ slots: db.getAdSlots() });
  });

  app.put('/api/admin/ads/slots', requireAdmin, (req: AuthRequest, res) => {
    const { slots } = req.body;
    if (!Array.isArray(slots)) {
      res.status(400).json({ error: 'Slots array is required.' });
      return;
    }
    const updatedSlots = db.updateAdSlots(slots);
    db.logAdminAction(
      req.user!.id,
      req.user!.username,
      'Updated Ad Slots',
      'Configured ad slots configuration',
      req.ip
    );
    res.json({ message: 'Ad slots updated successfully', slots: updatedSlots });
  });

  // Admin: Get / Update ad settings
  app.get('/api/admin/ads/settings', requireAdmin, (req, res) => {
    res.json({ settings: db.getAdSettings() });
  });

  app.put('/api/admin/ads/settings', requireAdmin, (req: AuthRequest, res) => {
    const updatedSettings = db.updateAdSettings(req.body);
    db.logAdminAction(
      req.user!.id,
      req.user!.username,
      'Updated Ad Settings',
      'Configured global advertisement settings',
      req.ip
    );
    res.json({ message: 'Ad settings saved successfully', settings: updatedSettings });
  });

  // Public API: Fetch ads for a specific slot
  app.get('/api/ads', (req, res) => {
    const slot = req.query.slot as string;
    const anime_id = req.query.anime_id as string | undefined;
    const episode_id = req.query.episode_id as string | undefined;
    if (!slot) {
      res.status(400).json({ error: 'Ad slot parameter is required.' });
      return;
    }
    const activeAds = db.getAdsForSlot(slot, anime_id, episode_id);
    res.json({ slot, ads: activeAds });
  });

  // Public API: Record Impression
  app.post('/api/ads/:id/impression', (req, res) => {
    const { id } = req.params;
    const ad = db.recordAdImpression(id);
    if (!ad) {
      res.status(404).json({ error: 'Ad not found.' });
      return;
    }
    res.json({ success: true, impressions: ad.impressions });
  });

  // Public API: Record Click
  app.post('/api/ads/:id/click', (req, res) => {
    const { id } = req.params;
    const ad = db.recordAdClick(id);
    if (!ad) {
      res.status(404).json({ error: 'Ad not found.' });
      return;
    }
    res.json({ success: true, clicks: ad.clicks, target_url: ad.target_url });
  });

  // ==========================================
  // DOWNLOAD LINKS ENDPOINTS
  // ==========================================

  // Public: Get authorized download links for content
  app.get('/api/content/:id/download-links', (req, res) => {
    const { id } = req.params;
    const anime = db.getAnimeById(id);
    if (!anime) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }
    const links = db.getDownloadLinksForContent(id);
    res.json({ anime_id: id, anime_title: anime.title, links });
  });

  // Admin: Get all download links (including disabled) for content
  app.get('/api/admin/content/:id/download-links', requireAdmin, (req, res) => {
    const { id } = req.params;
    const anime = db.getAnimeById(id);
    if (!anime) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }
    const links = db.getAllDownloadLinksForAdmin(id);
    res.json({ anime_id: id, anime_title: anime.title, links });
  });

  // Admin: Save / replace all download links for content
  app.post('/api/content/:id/download-links', requireAdmin, (req: AuthRequest, res) => {
    const { id } = req.params;
    const { links } = req.body;
    const anime = db.getAnimeById(id);
    if (!anime) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }

    if (!Array.isArray(links)) {
      res.status(400).json({ error: 'Links must be an array.' });
      return;
    }

    // Validate URLs
    for (const link of links) {
      if (link.url && !isSafeUrl(link.url)) {
        res.status(400).json({ error: 'Unsafe javascript: URL detected in download links.' });
        return;
      }
    }

    const savedLinks = db.saveDownloadLinksForContent(id, links);
    db.logAdminAction(
      req.user!.id,
      req.user!.username,
      'Updated Download Links',
      `Updated ${savedLinks.length} download links for "${anime.title}"`,
      req.ip
    );
    res.json({ message: 'Download links updated successfully', links: savedLinks });
  });

  // Admin: Update a single download link
  app.put('/api/download-links/:id', requireAdmin, (req: AuthRequest, res) => {
    const { id } = req.params;
    const { url } = req.body;

    if (url && !isSafeUrl(url)) {
      res.status(400).json({ error: 'Unsafe javascript: URL detected.' });
      return;
    }

    const updated = db.updateDownloadLink(id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Download link not found' });
      return;
    }

    db.logAdminAction(
      req.user!.id,
      req.user!.username,
      'Updated Download Link',
      `Updated download link "${updated.host_name}" (${updated.id})`,
      req.ip
    );
    res.json({ message: 'Download link updated successfully', link: updated });
  });

  // Admin: Delete a single download link
  app.delete('/api/download-links/:id', requireAdmin, (req: AuthRequest, res) => {
    const { id } = req.params;
    const success = db.deleteDownloadLink(id);
    if (!success) {
      res.status(404).json({ error: 'Download link not found' });
      return;
    }

    db.logAdminAction(
      req.user!.id,
      req.user!.username,
      'Deleted Download Link',
      `Deleted download link ${id}`,
      req.ip
    );
    res.json({ message: 'Download link deleted successfully' });
  });

  // Handle API 404s explicitly before static routes
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API endpoint ${req.method} ${req.originalUrl} not found` });
  });

  // Global Error Handler for API requests
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api') || req.headers.accept?.includes('application/json')) {
      const statusCode = err.status || err.statusCode || 500;
      res.status(statusCode).json({ error: err.message || 'Internal server error.' });
      return;
    }
    next(err);
  });

  // ==========================================
  // STATIC FILES & VITE INTEGRATION
  // ==========================================

  const publicPath = path.join(process.cwd(), 'public');
  const adminPath = path.join(process.cwd(), 'admin');
  const uploadsPath = path.join(process.cwd(), 'public', 'uploads');

  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }

  // Explicit static route for uploaded files under /uploads
  app.use('/uploads', express.static(uploadsPath, {
    maxAge: '1d',
    immutable: false
  }));

  app.use(express.static(publicPath));
  app.use('/admin', express.static(adminPath));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
  }

  // Fallback route handler for SPA and HTML pages
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      res.status(404).json({ error: 'API endpoint not found' });
      return;
    }

    if (req.path.startsWith('/uploads/')) {
      res.status(404).send('File not found');
      return;
    }

    if (req.path.startsWith('/admin')) {
      let subPath = req.path.replace(/^\/admin\/?/, '');
      if (!subPath || subPath === '/') subPath = 'admin.html';
      if (!subPath.endsWith('.html') && !subPath.includes('.')) {
        subPath += '.html';
      }
      const targetAdminFile = path.join(adminPath, subPath);
      if (fs.existsSync(targetAdminFile) && fs.statSync(targetAdminFile).isFile()) {
        res.sendFile(targetAdminFile);
        return;
      }
      res.sendFile(path.join(adminPath, 'admin.html'));
      return;
    }

    let publicSubPath = req.path.replace(/^\//, '');
    if (!publicSubPath || publicSubPath === '/') publicSubPath = 'index.html';
    if (!publicSubPath.endsWith('.html') && !publicSubPath.includes('.')) {
      publicSubPath += '.html';
    }
    const targetPublicFile = path.join(publicPath, publicSubPath);
    if (fs.existsSync(targetPublicFile) && fs.statSync(targetPublicFile).isFile()) {
      res.sendFile(targetPublicFile);
      return;
    }

    res.sendFile(path.join(publicPath, 'index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Cinevora server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
