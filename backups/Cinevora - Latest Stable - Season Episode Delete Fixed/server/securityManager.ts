import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { healthManager } from './healthManager';

export type SecurityStatus = 'NORMAL' | 'WARNING' | 'CRITICAL';
export type IncidentSeverity = 'CRITICAL' | 'WARNING' | 'INFO';
export type IncidentStatus = 'NEW' | 'MONITORING' | 'MITIGATED' | 'RECOVERED' | 'RESOLVED';

export interface SecurityIncident {
  id: string;
  timestamp: string;
  feature: string;
  severity: IncidentSeverity;
  reason: string;
  detectionSource: string;
  actionTaken: string;
  status: IncidentStatus;
  recoveryTime: string | null;
}

export interface BlockedSource {
  id: string;
  clientIdentifier: string; // Sanitized IP
  reason: string;
  endpoint: string;
  startTime: string;
  expiryTime: string;
  violationsCount: number;
  status: 'ACTIVE' | 'EXPIRED' | 'MANUALLY_CLEARED';
}

export interface SecurityLog {
  id: string;
  timestamp: string;
  eventType: 'RATE_LIMITED' | 'FAILED_LOGIN' | 'SUSPICIOUS_REQUEST' | 'UPLOAD_BLOCKED' | 'BOT_DETECTED' | 'XSS_PREVENTED' | 'PATH_TRAVERSAL_PREVENTED' | 'API_ABUSE';
  severity: IncidentSeverity;
  endpoint: string;
  feature: string;
  status: number;
  reason: string;
  clientIdentifier: string;
  userAgent: string;
  actionTaken: string;
}

export interface SecuritySettings {
  rateLimitEnabled: boolean;
  rateLimitRpm: number;
  loginProtectionEnabled: boolean;
  maxFailedLoginAttempts: number;
  loginCooldownMinutes: number;
  suspiciousRequestThreshold: number;
  uploadMaxMb: number;
  securityAlertsEnabled: boolean;
}

// In-memory bucket counter for rate limiting
interface RateLimitBucket {
  count: number;
  windowStart: number;
}

// Failed login tracker per client
interface LoginFailureTracker {
  count: number;
  firstFailedAt: number;
  lastFailedAt: number;
  cooldownUntil: number;
}

class SecurityManager {
  private dataFilePath = path.join(process.cwd(), 'health_security_state.json');

  // Stats Counters
  private failedLoginCount = 0;
  private blockedRequestsCount = 0;
  private rateLimitedRequestsCount = 0;
  private suspiciousRequestsCount = 0;
  private uploadSecurityEventsCount = 0;
  private apiAbuseEventsCount = 0;
  private lastSecurityCheckTime = new Date().toISOString();

  // Settings
  private settings: SecuritySettings = {
    rateLimitEnabled: true,
    rateLimitRpm: 120,
    loginProtectionEnabled: true,
    maxFailedLoginAttempts: 5,
    loginCooldownMinutes: 10,
    suspiciousRequestThreshold: 10,
    uploadMaxMb: 5,
    securityAlertsEnabled: true
  };

  // State Collections
  private incidents: SecurityIncident[] = [];
  private blockedSources: Map<string, BlockedSource> = new Map();
  private securityLogs: SecurityLog[] = [];

  // In-memory transient rate limiting & brute force trackers
  private rateLimitBuckets: Map<string, RateLimitBucket> = new Map();
  private loginTrackers: Map<string, LoginFailureTracker> = new Map();

  constructor() {
    this.loadStateFromDisk();
    this.startCleanupTimer();
  }

  private startCleanupTimer() {
    // Run lightweight cleanup every 2 minutes
    setInterval(() => {
      this.cleanupExpiredTrackers();
    }, 2 * 60 * 1000);
  }

  private cleanupExpiredTrackers() {
    const now = Date.now();
    // Clean expired rate limit buckets (older than 2 mins)
    for (const [key, bucket] of this.rateLimitBuckets.entries()) {
      if (now - bucket.windowStart > 2 * 60 * 1000) {
        this.rateLimitBuckets.delete(key);
      }
    }
    // Clean expired login trackers (older than 30 mins)
    for (const [key, tracker] of this.loginTrackers.entries()) {
      if (now - tracker.lastFailedAt > 30 * 60 * 1000) {
        this.loginTrackers.delete(key);
      }
    }
    // Update status of expired blocked sources
    for (const block of this.blockedSources.values()) {
      if (block.status === 'ACTIVE' && new Date(block.expiryTime).getTime() <= now) {
        block.status = 'EXPIRED';
      }
    }
  }

  private loadStateFromDisk() {
    try {
      if (fs.existsSync(this.dataFilePath)) {
        const raw = fs.readFileSync(this.dataFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.settings) this.settings = { ...this.settings, ...parsed.settings };
        if (Array.isArray(parsed.incidents)) this.incidents = parsed.incidents;
        if (Array.isArray(parsed.blockedSources)) {
          for (const item of parsed.blockedSources) {
            this.blockedSources.set(item.id, item);
          }
        }
        if (Array.isArray(parsed.securityLogs)) this.securityLogs = parsed.securityLogs;
        if (typeof parsed.failedLoginCount === 'number') this.failedLoginCount = parsed.failedLoginCount;
        if (typeof parsed.blockedRequestsCount === 'number') this.blockedRequestsCount = parsed.blockedRequestsCount;
        if (typeof parsed.rateLimitedRequestsCount === 'number') this.rateLimitedRequestsCount = parsed.rateLimitedRequestsCount;
        if (typeof parsed.suspiciousRequestsCount === 'number') this.suspiciousRequestsCount = parsed.suspiciousRequestsCount;
        if (typeof parsed.uploadSecurityEventsCount === 'number') this.uploadSecurityEventsCount = parsed.uploadSecurityEventsCount;
        if (typeof parsed.apiAbuseEventsCount === 'number') this.apiAbuseEventsCount = parsed.apiAbuseEventsCount;
      }
    } catch (err) {
      console.error('Error loading security state from disk:', err);
    }
  }

  private saveStateToDisk() {
    try {
      const payload = {
        settings: this.settings,
        failedLoginCount: this.failedLoginCount,
        blockedRequestsCount: this.blockedRequestsCount,
        rateLimitedRequestsCount: this.rateLimitedRequestsCount,
        suspiciousRequestsCount: this.suspiciousRequestsCount,
        uploadSecurityEventsCount: this.uploadSecurityEventsCount,
        apiAbuseEventsCount: this.apiAbuseEventsCount,
        lastSecurityCheckTime: this.lastSecurityCheckTime,
        incidents: this.incidents.slice(0, 50),
        blockedSources: Array.from(this.blockedSources.values()).slice(0, 100),
        securityLogs: this.securityLogs.slice(0, 300)
      };
      fs.writeFileSync(this.dataFilePath, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving security state to disk:', err);
    }
  }

  // Sanitizer helper to ensure IPs / client IDs are clean and secrets are scrubbed
  public sanitizeClientIp(ipStr?: string): string {
    if (!ipStr || typeof ipStr !== 'string') return '127.0.0.1';
    let clean = ipStr.trim();
    if (clean.startsWith('::ffff:')) {
      clean = clean.replace('::ffff:', '');
    }
    if (clean === '::1' || clean === '127.0.0.1' || clean === 'localhost') {
      return '127.0.0.1';
    }
    return clean;
  }

  // Sanitize text parameters to ensure no passwords or tokens are logged
  public sanitizeLogMessage(text: string): string {
    if (!text) return '';
    return text
      .replace(/(password|pass|pwd|token|secret|authorization|bearer|cookie)=[^& ]+/gi, '$1=[REDACTED]')
      .replace(/"(password|pass|pwd|token|secret|authorization)"\s*:\s*"[^"]+"/gi, '"$1":"[REDACTED]"');
  }

  // Log Security Event
  public logSecurityEvent(params: {
    eventType: SecurityLog['eventType'];
    severity: IncidentSeverity;
    endpoint: string;
    feature: string;
    status: number;
    reason: string;
    req: Request;
    actionTaken: string;
  }) {
    const clientIp = this.sanitizeClientIp(params.req.ip || (params.req.headers['x-forwarded-for'] as string));
    const rawUserAgent = params.req.headers['user-agent'] || 'Unknown User Agent';
    const userAgent = String(rawUserAgent).substring(0, 150);

    const logEntry: SecurityLog = {
      id: `sec_log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      eventType: params.eventType,
      severity: params.severity,
      endpoint: params.endpoint,
      feature: params.feature,
      status: params.status,
      reason: this.sanitizeLogMessage(params.reason),
      clientIdentifier: clientIp,
      userAgent,
      actionTaken: params.actionTaken
    };

    this.securityLogs.unshift(logEntry);
    if (this.securityLogs.length > 300) {
      this.securityLogs = this.securityLogs.slice(0, 300);
    }

    if (params.severity === 'CRITICAL' || params.severity === 'WARNING') {
      this.triggerSecurityAlert(params.severity, `${params.eventType}: ${params.reason}`, params.feature);
    }

    this.saveStateToDisk();
  }

  // Create or update temporary block record
  public recordTemporaryBlock(clientIp: string, endpoint: string, reason: string, durationMinutes: number = 5) {
    this.blockedRequestsCount++;
    const now = Date.now();
    const expiryMs = now + durationMinutes * 60 * 1000;
    const blockKey = `block_${clientIp.replace(/[^a-zA-Z0-9]/g, '_')}`;

    const existing = this.blockedSources.get(blockKey);
    if (existing) {
      existing.violationsCount++;
      existing.expiryTime = new Date(expiryMs).toISOString();
      existing.status = 'ACTIVE';
      existing.reason = reason;
      existing.endpoint = endpoint;
    } else {
      const newBlock: BlockedSource = {
        id: blockKey,
        clientIdentifier: clientIp,
        reason,
        endpoint,
        startTime: new Date(now).toISOString(),
        expiryTime: new Date(expiryMs).toISOString(),
        violationsCount: 1,
        status: 'ACTIVE'
      };
      this.blockedSources.set(blockKey, newBlock);
    }

    this.saveStateToDisk();
  }

  public isSourceBlocked(clientIp: string): { blocked: boolean; blockInfo?: BlockedSource } {
    const blockKey = `block_${clientIp.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const block = this.blockedSources.get(blockKey);
    if (block && block.status === 'ACTIVE') {
      const now = Date.now();
      if (new Date(block.expiryTime).getTime() > now) {
        return { blocked: true, blockInfo: block };
      } else {
        block.status = 'EXPIRED';
      }
    }
    return { blocked: false };
  }

  public clearBlockedSource(blockId: string): boolean {
    const block = this.blockedSources.get(blockId);
    if (block) {
      block.status = 'MANUALLY_CLEARED';
      this.saveStateToDisk();
      return true;
    }
    return false;
  }

  // Record Incident
  public createSecurityIncident(feature: string, severity: IncidentSeverity, reason: string, detectionSource: string, actionTaken: string): SecurityIncident {
    const incident: SecurityIncident = {
      id: `sec_inc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      feature,
      severity,
      reason,
      detectionSource,
      actionTaken,
      status: 'NEW',
      recoveryTime: null
    };

    this.incidents.unshift(incident);
    if (this.incidents.length > 50) {
      this.incidents = this.incidents.slice(0, 50);
    }

    this.triggerSecurityAlert(severity, `Security Incident [${feature}]: ${reason}`, feature);
    this.saveStateToDisk();
    return incident;
  }

  public updateIncidentStatus(incidentId: string, status: IncidentStatus): boolean {
    const inc = this.incidents.find(i => i.id === incidentId);
    if (inc) {
      inc.status = status;
      if (status === 'RESOLVED' || status === 'RECOVERED') {
        inc.recoveryTime = new Date().toISOString();
      }
      this.saveStateToDisk();
      return true;
    }
    return false;
  }

  private triggerSecurityAlert(severity: IncidentSeverity, message: string, featureId?: string) {
    if (!this.settings.securityAlertsEnabled) return;
    try {
      healthManager.addAlert(
        severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
        'Security Event Alert',
        message,
        featureId
      );
    } catch (err) {
      console.error('Error dispatching security alert to healthManager:', err);
    }
  }

  // ==========================================
  // RATE LIMITING CORE
  // ==========================================
  public checkRateLimit(req: Request, routeGroup: string, maxRequestsPerMinute: number): { allowed: boolean; currentCount: number; limit: number; resetSeconds: number } {
    if (!this.settings.rateLimitEnabled) {
      return { allowed: true, currentCount: 1, limit: maxRequestsPerMinute, resetSeconds: 0 };
    }

    const clientIp = this.sanitizeClientIp(req.ip || (req.headers['x-forwarded-for'] as string));
    const key = `${routeGroup}_${clientIp}`;
    const now = Date.now();
    const windowMs = 60 * 1000;

    let bucket = this.rateLimitBuckets.get(key);
    if (!bucket || now - bucket.windowStart >= windowMs) {
      bucket = { count: 1, windowStart: now };
      this.rateLimitBuckets.set(key, bucket);
      return { allowed: true, currentCount: 1, limit: maxRequestsPerMinute, resetSeconds: 60 };
    }

    bucket.count++;
    const resetSeconds = Math.ceil((bucket.windowStart + windowMs - now) / 1000);

    if (bucket.count > maxRequestsPerMinute) {
      this.rateLimitedRequestsCount++;
      this.apiAbuseEventsCount++;

      // Record temporary rate limit block for 2 minutes
      this.recordTemporaryBlock(clientIp, req.path, `Exceeded ${routeGroup} rate limit (${bucket.count}/${maxRequestsPerMinute} rpm)`, 2);

      this.logSecurityEvent({
        eventType: 'RATE_LIMITED',
        severity: 'WARNING',
        endpoint: req.path,
        feature: routeGroup,
        status: 429,
        reason: `Rate limit exceeded (${bucket.count}/${maxRequestsPerMinute} req/min)`,
        req,
        actionTaken: 'HTTP 429 Rate Limit Applied'
      });

      return { allowed: false, currentCount: bucket.count, limit: maxRequestsPerMinute, resetSeconds };
    }

    return { allowed: true, currentCount: bucket.count, limit: maxRequestsPerMinute, resetSeconds };
  }

  // ==========================================
  // LOGIN BRUTE-FORCE PROTECTION CORE
  // ==========================================
  public recordLoginFailure(req: Request, identifier: string): { blocked: boolean; attempts: number; cooldownSeconds: number } {
    this.failedLoginCount++;
    const clientIp = this.sanitizeClientIp(req.ip || (req.headers['x-forwarded-for'] as string));
    const now = Date.now();

    let tracker = this.loginTrackers.get(clientIp);
    if (!tracker) {
      tracker = { count: 1, firstFailedAt: now, lastFailedAt: now, cooldownUntil: 0 };
      this.loginTrackers.set(clientIp, tracker);
    } else {
      tracker.count++;
      tracker.lastFailedAt = now;
    }

    const maxAttempts = this.settings.maxFailedLoginAttempts; // Default 5

    this.logSecurityEvent({
      eventType: 'FAILED_LOGIN',
      severity: tracker.count >= maxAttempts ? 'CRITICAL' : 'WARNING',
      endpoint: req.path,
      feature: 'Admin Auth',
      status: 401,
      reason: `Failed admin login attempt #${tracker.count} for user/IP`,
      req,
      actionTaken: tracker.count >= maxAttempts ? 'Temporary Login Cooldown Block' : 'Log & Delay Cooldown'
    });

    if (tracker.count >= maxAttempts) {
      const cooldownMinutes = this.settings.loginCooldownMinutes; // Default 10m
      tracker.cooldownUntil = now + cooldownMinutes * 60 * 1000;

      this.recordTemporaryBlock(clientIp, req.path, `Repeated failed admin logins (${tracker.count} attempts)`, cooldownMinutes);

      this.createSecurityIncident(
        'Admin Auth',
        'CRITICAL',
        `Repeated admin login failures (${tracker.count} attempts from ${clientIp})`,
        'Brute-Force Login Guard',
        `Temporarily rate-limited login attempts for ${clientIp} for ${cooldownMinutes} minutes`
      );

      return { blocked: true, attempts: tracker.count, cooldownSeconds: cooldownMinutes * 60 };
    } else if (tracker.count >= 3) {
      // 3 seconds artificial delay for moderate failures
      return { blocked: false, attempts: tracker.count, cooldownSeconds: 3 };
    }

    return { blocked: false, attempts: tracker.count, cooldownSeconds: 0 };
  }

  public recordLoginSuccess(req: Request) {
    const clientIp = this.sanitizeClientIp(req.ip || (req.headers['x-forwarded-for'] as string));
    this.loginTrackers.delete(clientIp);
  }

  public isLoginInCooldown(req: Request): { inCooldown: boolean; remainingSeconds: number } {
    if (!this.settings.loginProtectionEnabled) return { inCooldown: false, remainingSeconds: 0 };
    const clientIp = this.sanitizeClientIp(req.ip || (req.headers['x-forwarded-for'] as string));
    const tracker = this.loginTrackers.get(clientIp);
    const now = Date.now();
    if (tracker && tracker.cooldownUntil > now) {
      const remainingSeconds = Math.ceil((tracker.cooldownUntil - now) / 1000);
      return { inCooldown: true, remainingSeconds };
    }
    return { inCooldown: false, remainingSeconds: 0 };
  }

  // ==========================================
  // SUSPICIOUS REQUEST INSPECTOR
  // ==========================================
  public inspectRequestForThreats(req: Request): { suspicious: boolean; reason?: string; httpStatus?: number } {
    const pathLower = (req.path || '').toLowerCase();
    const queryStr = (req.url || '').toLowerCase();

    // 1. Invalid or dangerous HTTP methods
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
    if (!validMethods.includes(req.method.toUpperCase())) {
      this.suspiciousRequestsCount++;
      return { suspicious: true, reason: `Invalid HTTP method: ${req.method}`, httpStatus: 405 };
    }

    // 2. Path Traversal or Null Byte injection
    if (pathLower.includes('..') || pathLower.includes('%2e%2e') || queryStr.includes('%00') || pathLower.includes('%00')) {
      this.suspiciousRequestsCount++;
      return { suspicious: true, reason: 'Path traversal or null byte pattern detected', httpStatus: 400 };
    }

    // 3. Automated Vulnerability Scanning Probes
    const scannerPatterns = [
      '/phpmyadmin', '/wp-login.php', '/wp-admin', '/.git', '/.env',
      '/config.json', '/eval(', '/actuator', '/etc/passwd', '/proc/self'
    ];
    for (const pattern of scannerPatterns) {
      if (pathLower.includes(pattern)) {
        this.suspiciousRequestsCount++;
        return { suspicious: true, reason: `Probe for restricted path: ${pattern}`, httpStatus: 403 };
      }
    }

    // 4. Excessive SQLi / XSS Attack Vectors in Query string
    const scriptPattern = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    const sqlInjectPattern = /(union\s+select|select\s+.*\s+from|insert\s+into|delete\s+from|drop\s+table)/gi;

    if (scriptPattern.test(queryStr)) {
      this.suspiciousRequestsCount++;
      return { suspicious: true, reason: 'XSS script injection vector detected in query string', httpStatus: 400 };
    }

    if (sqlInjectPattern.test(queryStr)) {
      this.suspiciousRequestsCount++;
      return { suspicious: true, reason: 'SQL injection vector detected in query string', httpStatus: 400 };
    }

    return { suspicious: false };
  }

  // ==========================================
  // INPUT VALIDATIONS
  // ==========================================
  public validateCommentInput(username?: string, content?: string): { isValid: boolean; error?: string; cleanUsername?: string; cleanContent?: string } {
    if (!username || !content) {
      return { isValid: false, error: 'Username and comment text are required.' };
    }

    const cleanName = String(username).trim();
    let cleanText = String(content).trim();

    if (cleanName.length < 2 || cleanName.length > 50) {
      return { isValid: false, error: 'Username must be between 2 and 50 characters.' };
    }

    if (cleanText.length < 1 || cleanText.length > 1000) {
      return { isValid: false, error: 'Comment must be between 1 and 1000 characters.' };
    }

    // Basic HTML escaping for comment content protection
    cleanText = cleanText
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    return { isValid: true, cleanUsername: cleanName, cleanContent: cleanText };
  }

  public validateScreenshotUpload(req: Request, fileObj: { originalname?: string; mimetype?: string; size?: number }): { isValid: boolean; error?: string } {
    if (!fileObj) {
      return { isValid: false, error: 'No file provided for upload.' };
    }

    const maxBytes = this.settings.uploadMaxMb * 1024 * 1024;
    if (fileObj.size && fileObj.size > maxBytes) {
      this.uploadSecurityEventsCount++;
      this.logSecurityEvent({
        eventType: 'UPLOAD_BLOCKED',
        severity: 'WARNING',
        endpoint: req.path,
        feature: 'Screenshot Upload',
        status: 400,
        reason: `Uploaded file size (${(fileObj.size / 1024 / 1024).toFixed(2)}MB) exceeds max limit of ${this.settings.uploadMaxMb}MB`,
        req,
        actionTaken: 'Rejected Oversized File'
      });
      return { isValid: false, error: `File exceeds maximum allowed size of ${this.settings.uploadMaxMb}MB.` };
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (fileObj.mimetype && !allowedMimeTypes.includes(fileObj.mimetype.toLowerCase())) {
      this.uploadSecurityEventsCount++;
      this.logSecurityEvent({
        eventType: 'UPLOAD_BLOCKED',
        severity: 'WARNING',
        endpoint: req.path,
        feature: 'Screenshot Upload',
        status: 400,
        reason: `Invalid MIME type: ${fileObj.mimetype}`,
        req,
        actionTaken: 'Rejected Non-Image MIME Type'
      });
      return { isValid: false, error: 'Invalid file format. Only JPG, PNG, WEBP, and GIF images are allowed.' };
    }

    const name = (fileObj.originalname || '').toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const hasValidExt = allowedExtensions.some(ext => name.endsWith(ext));
    if (name && !hasValidExt) {
      this.uploadSecurityEventsCount++;
      return { isValid: false, error: 'Invalid file extension. Allowed extensions: .jpg, .jpeg, .png, .webp, .gif' };
    }

    if (name.includes('..') || name.includes('/') || name.includes('\\')) {
      this.uploadSecurityEventsCount++;
      return { isValid: false, error: 'Malicious filename detected.' };
    }

    return { isValid: true };
  }

  public validateGoogleDriveUrl(url?: string): { isValid: boolean; fileId?: string; error?: string } {
    if (!url || typeof url !== 'string' || !url.trim()) {
      return { isValid: true, fileId: undefined };
    }

    const trimmed = url.trim();
    if (!trimmed.includes('google.com')) {
      return { isValid: false, error: 'URL must be a valid Google Drive or Google Docs link.' };
    }

    const match = trimmed.match(/(?:https?:\/\/)?(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/);
    if (!match || !match[1]) {
      return { isValid: false, error: 'Unable to extract valid Google Drive File ID. Format: https://drive.google.com/file/d/FILE_ID/view' };
    }

    return { isValid: true, fileId: match[1] };
  }

  // ==========================================
  // GETTERS & SETTINGS MANAGEMENT
  // ==========================================
  public getSecuritySummary() {
    this.lastSecurityCheckTime = new Date().toISOString();

    const activeIncidentsList = this.incidents.filter(i => i.status === 'NEW' || i.status === 'MONITORING');
    const activeBlocksList = Array.from(this.blockedSources.values()).filter(b => b.status === 'ACTIVE' && new Date(b.expiryTime).getTime() > Date.now());

    let overallStatus: SecurityStatus = 'NORMAL';
    if (activeIncidentsList.length > 0 || activeBlocksList.length > 5 || this.failedLoginCount > 15) {
      overallStatus = 'CRITICAL';
    } else if (activeBlocksList.length > 0 || this.suspiciousRequestsCount > 5 || this.rateLimitedRequestsCount > 10) {
      overallStatus = 'WARNING';
    }

    return {
      securityStatus: overallStatus,
      lastSecurityCheck: this.lastSecurityCheckTime,
      malwareScanningStatus: 'Malware scanning unavailable on current hosting environment',
      metrics: {
        failedLoginAttempts: this.failedLoginCount,
        blockedRequests: this.blockedRequestsCount,
        rateLimitedRequests: this.rateLimitedRequestsCount,
        suspiciousRequests: this.suspiciousRequestsCount,
        activeIncidentsCount: activeIncidentsList.length,
        blockedIpsCount: activeBlocksList.length,
        protectedFeaturesCount: healthManager.getHealthSummary().protectedFeaturesCount,
        uploadSecurityEvents: this.uploadSecurityEventsCount,
        apiAbuseEvents: this.apiAbuseEventsCount
      },
      settings: this.settings,
      recentIncidents: this.incidents.slice(0, 10),
      activeBlockedSources: activeBlocksList,
      recentSecurityLogs: this.securityLogs.slice(0, 20)
    };
  }

  public getIncidents(statusFilter?: string) {
    if (statusFilter && statusFilter !== 'ALL') {
      return this.incidents.filter(i => i.status === statusFilter);
    }
    return this.incidents;
  }

  public getBlockedSources() {
    this.cleanupExpiredTrackers();
    return Array.from(this.blockedSources.values());
  }

  public getSecurityLogs(query?: { search?: string; severity?: string; eventType?: string }) {
    let list = [...this.securityLogs];
    if (query?.severity && query.severity !== 'ALL') {
      list = list.filter(l => l.severity === query.severity);
    }
    if (query?.eventType && query.eventType !== 'ALL') {
      list = list.filter(l => l.eventType === query.eventType);
    }
    if (query?.search) {
      const q = query.search.toLowerCase();
      list = list.filter(l =>
        l.reason.toLowerCase().includes(q) ||
        l.endpoint.toLowerCase().includes(q) ||
        l.clientIdentifier.toLowerCase().includes(q)
      );
    }
    return list;
  }

  public getSettings() {
    return this.settings;
  }

  public updateSettings(newSettings: Partial<SecuritySettings>) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveStateToDisk();
    return this.settings;
  }
}

export const securityManager = new SecurityManager();

// ==========================================
// EXPRESS MIDDLEWARES
// ==========================================

export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
}

export function securityRequestInspectorMiddleware(req: Request, res: Response, next: NextFunction) {
  // Check if source IP is actively blocked
  const clientIp = securityManager.sanitizeClientIp(req.ip || (req.headers['x-forwarded-for'] as string));
  const blockCheck = securityManager.isSourceBlocked(clientIp);

  if (blockCheck.blocked) {
    res.status(403).json({
      error: 'Access temporarily restricted due to automated security protection policy.',
      reason: blockCheck.blockInfo?.reason,
      retryAfter: blockCheck.blockInfo?.expiryTime
    });
    return;
  }

  // Inspect request for suspicious attack vectors
  if (req.path.startsWith('/api/')) {
    const inspection = securityManager.inspectRequestForThreats(req);
    if (inspection.suspicious) {
      securityManager.logSecurityEvent({
        eventType: 'SUSPICIOUS_REQUEST',
        severity: 'WARNING',
        endpoint: req.path,
        feature: 'Security Inspector',
        status: inspection.httpStatus || 400,
        reason: inspection.reason || 'Suspicious request pattern',
        req,
        actionTaken: 'Request Blocked by Security Inspector'
      });

      res.status(inspection.httpStatus || 400).json({ error: inspection.reason || 'Bad Request' });
      return;
    }
  }

  next();
}

// Endpoint-specific Rate Limit Factory Middleware
export function createEndpointRateLimiter(routeGroup: string, maxRequestsPerMinute: number = 120) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = securityManager.checkRateLimit(req, routeGroup, maxRequestsPerMinute);
    res.setHeader('X-RateLimit-Limit', result.limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, result.limit - result.currentCount));
    res.setHeader('X-RateLimit-Reset', result.resetSeconds);

    if (!result.allowed) {
      res.status(429).json({
        error: `Too many requests on ${routeGroup}. Please slow down and try again shortly.`,
        retryAfterSeconds: result.resetSeconds
      });
      return;
    }

    next();
  };
}
