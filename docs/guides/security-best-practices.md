# Security Best Practices Guide

## Overview

This guide provides comprehensive security best practices for implementing the ChitLaq Authentication API. It covers client-side security, server-side security, and operational security measures.

## Table of Contents

1. [Client-Side Security](#client-side-security)
2. [Server-Side Security](#server-side-security)
3. [Token Management](#token-management)
4. [Data Protection](#data-protection)
5. [Network Security](#network-security)
6. [Monitoring and Logging](#monitoring-and-logging)
7. [Compliance and Privacy](#compliance-and-privacy)
8. [Incident Response](#incident-response)
9. [Security Checklist](#security-checklist)

## Client-Side Security

### Token Storage

#### Secure Storage Options

**React Native (Expo SecureStore)**
```javascript
import * as SecureStore from 'expo-secure-store';

// Store tokens securely
await SecureStore.setItemAsync('accessToken', token);
const token = await SecureStore.getItemAsync('accessToken');

// Delete tokens on logout
await SecureStore.deleteItemAsync('accessToken');
```

**Web (HttpOnly Cookies)**
```javascript
// Server sets HttpOnly cookies
res.cookie('accessToken', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 3600000 // 1 hour
});
```

**Mobile (Keychain/Keystore)**
```javascript
// iOS Keychain
import { setItem, getItem, deleteItem } from 'react-native-keychain';

await setItem('accessToken', token);
const token = await getItem('accessToken');
await deleteItem('accessToken');
```

#### ❌ Avoid These Storage Methods

```javascript
// ❌ Never store tokens in localStorage
localStorage.setItem('accessToken', token);

// ❌ Never store tokens in sessionStorage
sessionStorage.setItem('accessToken', token);

// ❌ Never store tokens in global variables
window.accessToken = token;
```

### Input Validation

#### Client-Side Validation

```javascript
// Email validation
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const universityDomains = ['university.edu', 'college.edu'];
  
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
  
  const domain = email.split('@')[1];
  if (!universityDomains.includes(domain)) {
    throw new Error('University email required');
  }
  
  return true;
}

// Password validation
function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (password.length < minLength) {
    throw new Error('Password must be at least 8 characters');
  }
  
  if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
    throw new Error('Password must contain uppercase, lowercase, number, and special character');
  }
  
  return true;
}
```

### HTTPS Implementation

#### Force HTTPS

```javascript
// Redirect HTTP to HTTPS
if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
  location.replace(`https:${location.href.substring(location.protocol.length)}`);
}
```

#### Content Security Policy

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline';
               img-src 'self' data: https:;
               connect-src 'self' https://api.chitlaq.com;">
```

### Error Handling

#### Secure Error Handling

```javascript
// Don't expose sensitive information in errors
try {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  
  if (!response.ok) {
    const error = await response.json();
    // Show user-friendly message, not technical details
    throw new Error(error.message || 'Login failed');
  }
  
  return await response.json();
} catch (error) {
  // Log error for debugging (server-side)
  console.error('Login error:', error);
  
  // Show user-friendly message
  showError('Unable to log in. Please try again.');
}
```

## Server-Side Security

### Authentication Middleware

```javascript
// JWT verification middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Access token required' 
    });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        error: 'Invalid or expired token' 
      });
    }
    
    req.user = user;
    next();
  });
};
```

### Rate Limiting

```javascript
// Rate limiting middleware
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);
```

### Input Sanitization

```javascript
// Input sanitization
const validator = require('validator');
const xss = require('xss');

const sanitizeInput = (req, res, next) => {
  // Sanitize string inputs
  if (req.body.email) {
    req.body.email = validator.normalizeEmail(req.body.email);
  }
  
  if (req.body.firstName) {
    req.body.firstName = xss(req.body.firstName.trim());
  }
  
  if (req.body.lastName) {
    req.body.lastName = xss(req.body.lastName.trim());
  }
  
  next();
};
```

### Password Security

```javascript
// Password hashing
const bcrypt = require('bcrypt');

const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Password strength validation
const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return {
    isValid: password.length >= minLength && 
             hasUpperCase && hasLowerCase && 
             hasNumbers && hasSpecialChar,
    requirements: {
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar
    }
  };
};
```

## Token Management

### JWT Security

```javascript
// JWT configuration
const jwtConfig = {
  accessToken: {
    expiresIn: '1h',
    algorithm: 'HS256',
    issuer: 'chitlaq.com',
    audience: 'chitlaq-api'
  },
  refreshToken: {
    expiresIn: '30d',
    algorithm: 'HS256',
    issuer: 'chitlaq.com',
    audience: 'chitlaq-api'
  }
};

// Token generation
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { 
      userId: user.id, 
      email: user.email,
      universityId: user.universityId 
    },
    process.env.JWT_SECRET,
    jwtConfig.accessToken
  );
  
  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    jwtConfig.refreshToken
  );
  
  return { accessToken, refreshToken };
};
```

### Token Rotation

```javascript
// Refresh token rotation
const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Check if token exists in database
    const session = await Session.findOne({ 
      refreshToken, 
      isActive: true 
    });
    
    if (!session) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid refresh token' 
      });
    }
    
    // Generate new tokens
    const user = await User.findById(decoded.userId);
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
    
    // Update session with new refresh token
    session.refreshToken = newRefreshToken;
    session.lastUsed = new Date();
    await session.save();
    
    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: 3600
      }
    });
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      error: 'Invalid refresh token' 
    });
  }
};
```

### Session Management

```javascript
// Session tracking
const createSession = async (userId, userAgent, ipAddress) => {
  const session = new Session({
    userId,
    userAgent,
    ipAddress,
    isActive: true,
    createdAt: new Date(),
    lastUsed: new Date()
  });
  
  await session.save();
  return session;
};

// Multi-device session management
const getActiveSessions = async (userId) => {
  return await Session.find({ 
    userId, 
    isActive: true 
  }).sort({ lastUsed: -1 });
};

// Terminate specific session
const terminateSession = async (sessionId, userId) => {
  await Session.updateOne(
    { _id: sessionId, userId },
    { isActive: false, terminatedAt: new Date() }
  );
};
```

## Data Protection

### Encryption

```javascript
// Data encryption at rest
const crypto = require('crypto');

const encrypt = (text) => {
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, key);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
};

const decrypt = (encryptedData) => {
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
  const decipher = crypto.createDecipher(algorithm, key);
  
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};
```

### Data Anonymization

```javascript
// PII anonymization for logs
const anonymizeLogData = (data) => {
  const anonymized = { ...data };
  
  // Anonymize email
  if (anonymized.email) {
    const [local, domain] = anonymized.email.split('@');
    anonymized.email = `${local.substring(0, 2)}***@${domain}`;
  }
  
  // Anonymize IP address
  if (anonymized.ipAddress) {
    const parts = anonymized.ipAddress.split('.');
    anonymized.ipAddress = `${parts[0]}.${parts[1]}.xxx.xxx`;
  }
  
  return anonymized;
};
```

### Database Security

```javascript
// Database connection security
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ssl: true,
      sslValidate: true,
      authSource: 'admin',
      retryWrites: true,
      w: 'majority'
    });
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

// Row Level Security (RLS) policies
const createRLSPolicies = async () => {
  // Users can only access their own data
  await db.query(`
    CREATE POLICY user_data_policy ON users
    FOR ALL TO authenticated
    USING (id = current_user_id());
  `);
  
  // Admins can access all data
  await db.query(`
    CREATE POLICY admin_data_policy ON users
    FOR ALL TO admin
    USING (true);
  `);
};
```

## Network Security

### HTTPS Configuration

```javascript
// HTTPS server configuration
const https = require('https');
const fs = require('fs');

const httpsOptions = {
  key: fs.readFileSync('path/to/private-key.pem'),
  cert: fs.readFileSync('path/to/certificate.pem'),
  ca: fs.readFileSync('path/to/ca-bundle.pem'),
  secureProtocol: 'TLSv1_2_method',
  ciphers: [
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES256-SHA384',
    'ECDHE-RSA-AES128-SHA256'
  ].join(':'),
  honorCipherOrder: true
};

const server = https.createServer(httpsOptions, app);
```

### Security Headers

```javascript
// Security headers middleware
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.chitlaq.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));
```

### CORS Configuration

```javascript
// CORS configuration
const cors = require('cors');

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://chitlaq.com',
      'https://app.chitlaq.com',
      'https://admin.chitlaq.com'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
};

app.use(cors(corsOptions));
```

## Monitoring and Logging

### Security Event Logging

```javascript
// Security event logger
const winston = require('winston');

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/security.log',
      level: 'info'
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Log security events
const logSecurityEvent = (event, details) => {
  securityLogger.info({
    event,
    details: anonymizeLogData(details),
    timestamp: new Date().toISOString(),
    severity: getEventSeverity(event)
  });
};

// Usage
logSecurityEvent('LOGIN_SUCCESS', {
  userId: user.id,
  email: user.email,
  ipAddress: req.ip,
  userAgent: req.get('User-Agent')
});
```

### Threat Detection

```javascript
// Brute force detection
const detectBruteForce = async (ipAddress, email) => {
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;
  
  const attempts = await LoginAttempt.find({
    ipAddress,
    email,
    timestamp: { $gte: new Date(Date.now() - windowMs) },
    success: false
  });
  
  if (attempts.length >= maxAttempts) {
    // Block IP address
    await BlockedIP.create({
      ipAddress,
      reason: 'BRUTE_FORCE',
      blockedAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    });
    
    logSecurityEvent('BRUTE_FORCE_DETECTED', {
      ipAddress,
      email,
      attempts: attempts.length
    });
    
    return true;
  }
  
  return false;
};
```

### Audit Trail

```javascript
// Audit trail middleware
const auditTrail = (action) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log audit event
      AuditLog.create({
        userId: req.user?.id,
        action,
        resource: req.originalUrl,
        method: req.method,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestBody: sanitizeRequestBody(req.body),
        responseStatus: res.statusCode,
        timestamp: new Date()
      });
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

// Usage
app.post('/auth/login', auditTrail('LOGIN_ATTEMPT'), loginController);
app.post('/auth/register', auditTrail('REGISTRATION_ATTEMPT'), registerController);
```

## Compliance and Privacy

### GDPR Compliance

```javascript
// Data subject rights
const handleDataSubjectRequest = async (req, res) => {
  const { userId, requestType } = req.body;
  
  switch (requestType) {
    case 'DATA_EXPORT':
      const userData = await exportUserData(userId);
      res.json({ success: true, data: userData });
      break;
      
    case 'DATA_DELETION':
      await deleteUserData(userId);
      res.json({ success: true, message: 'Data deleted successfully' });
      break;
      
    case 'DATA_RECTIFICATION':
      const { corrections } = req.body;
      await updateUserData(userId, corrections);
      res.json({ success: true, message: 'Data updated successfully' });
      break;
  }
};

// Data retention policy
const enforceDataRetention = async () => {
  const retentionPeriod = 7 * 365 * 24 * 60 * 60 * 1000; // 7 years
  const cutoffDate = new Date(Date.now() - retentionPeriod);
  
  // Delete old audit logs
  await AuditLog.deleteMany({
    timestamp: { $lt: cutoffDate }
  });
  
  // Delete old sessions
  await Session.deleteMany({
    lastUsed: { $lt: cutoffDate }
  });
};
```

### FERPA Compliance

```javascript
// Educational data protection
const protectEducationalData = (userData) => {
  const protectedFields = [
    'studentId',
    'enrollmentStatus',
    'academicRecords',
    'disabilityStatus'
  ];
  
  const sanitized = { ...userData };
  protectedFields.forEach(field => {
    if (sanitized[field]) {
      delete sanitized[field];
    }
  });
  
  return sanitized;
};

// Access control for educational data
const checkEducationalDataAccess = (userId, requesterId) => {
  // Only allow access to own data or admin access
  return userId === requesterId || isAdmin(requesterId);
};
```

## Incident Response

### Security Incident Handling

```javascript
// Security incident creation
const createSecurityIncident = async (incidentData) => {
  const incident = await SecurityIncident.create({
    ...incidentData,
    status: 'OPEN',
    severity: calculateSeverity(incidentData),
    createdAt: new Date()
  });
  
  // Notify security team
  await notifySecurityTeam(incident);
  
  // Log incident
  logSecurityEvent('SECURITY_INCIDENT_CREATED', {
    incidentId: incident.id,
    type: incident.type,
    severity: incident.severity
  });
  
  return incident;
};

// Incident response workflow
const handleSecurityIncident = async (incidentId, action) => {
  const incident = await SecurityIncident.findById(incidentId);
  
  switch (action) {
    case 'INVESTIGATE':
      incident.status = 'INVESTIGATING';
      incident.investigatedAt = new Date();
      break;
      
    case 'RESOLVE':
      incident.status = 'RESOLVED';
      incident.resolvedAt = new Date();
      break;
      
    case 'ESCALATE':
      incident.severity = 'CRITICAL';
      await notifySecurityTeam(incident);
      break;
  }
  
  await incident.save();
  
  // Log incident update
  logSecurityEvent('SECURITY_INCIDENT_UPDATED', {
    incidentId,
    action,
    newStatus: incident.status
  });
};
```

### Breach Response

```javascript
// Data breach response
const handleDataBreach = async (breachData) => {
  // Create breach incident
  const incident = await createSecurityIncident({
    type: 'DATA_BREACH',
    severity: 'CRITICAL',
    description: breachData.description,
    affectedUsers: breachData.affectedUsers,
    dataTypes: breachData.dataTypes
  });
  
  // Notify affected users
  for (const userId of breachData.affectedUsers) {
    await notifyUserOfBreach(userId, incident);
  }
  
  // Notify authorities (if required)
  if (breachData.requiresNotification) {
    await notifyAuthorities(incident);
  }
  
  // Implement containment measures
  await implementContainmentMeasures(incident);
  
  return incident;
};
```

## Security Checklist

### Pre-Production Checklist

- [ ] **Authentication**
  - [ ] JWT tokens properly configured
  - [ ] Token expiration set appropriately
  - [ ] Refresh token rotation implemented
  - [ ] Password hashing using bcrypt
  - [ ] Rate limiting on auth endpoints

- [ ] **Authorization**
  - [ ] Role-based access control implemented
  - [ ] Resource-level permissions configured
  - [ ] Admin access properly restricted
  - [ ] API endpoints protected

- [ ] **Data Protection**
  - [ ] Sensitive data encrypted at rest
  - [ ] PII anonymized in logs
  - [ ] Database connections secured
  - [ ] Backup encryption enabled

- [ ] **Network Security**
  - [ ] HTTPS enforced
  - [ ] Security headers configured
  - [ ] CORS properly configured
  - [ ] Firewall rules implemented

- [ ] **Monitoring**
  - [ ] Security event logging enabled
  - [ ] Threat detection configured
  - [ ] Audit trail implemented
  - [ ] Alerting system set up

- [ ] **Compliance**
  - [ ] GDPR compliance measures
  - [ ] FERPA compliance measures
  - [ ] Data retention policies
  - [ ] Privacy policy updated

### Production Monitoring

- [ ] **Daily Checks**
  - [ ] Review security logs
  - [ ] Check for failed login attempts
  - [ ] Monitor rate limiting triggers
  - [ ] Verify backup integrity

- [ ] **Weekly Checks**
  - [ ] Review access patterns
  - [ ] Check for suspicious activity
  - [ ] Update security patches
  - [ ] Review incident reports

- [ ] **Monthly Checks**
  - [ ] Security audit
  - [ ] Penetration testing
  - [ ] Compliance review
  - [ ] Disaster recovery test

### Incident Response Plan

- [ ] **Detection**
  - [ ] Automated monitoring alerts
  - [ ] Manual incident reporting
  - [ ] User-reported issues
  - [ ] Third-party notifications

- [ ] **Response**
  - [ ] Incident classification
  - [ ] Containment measures
  - [ ] Evidence collection
  - [ ] Stakeholder notification

- [ ] **Recovery**
  - [ ] System restoration
  - [ ] Data recovery
  - [ ] Service resumption
  - [ ] Post-incident review

## Security Tools and Resources

### Recommended Tools

- **Authentication**: Auth0, Firebase Auth, AWS Cognito
- **Monitoring**: Datadog, New Relic, Splunk
- **Security Scanning**: OWASP ZAP, Nessus, Qualys
- **Log Management**: ELK Stack, Fluentd, Logstash
- **Incident Response**: PagerDuty, Opsgenie, VictorOps

### Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [GDPR Compliance Guide](https://gdpr.eu/)
- [FERPA Compliance Guide](https://www2.ed.gov/policy/gen/guid/fpco/ferpa/index.html)
- [Security Best Practices](https://cheatsheetseries.owasp.org/)

## Support and Training

### Security Training

- **Developer Training**: Secure coding practices
- **Operations Training**: Security monitoring and incident response
- **User Training**: Security awareness and best practices
- **Management Training**: Security governance and compliance

### Security Support

- **Security Team**: security@chitlaq.com
- **Incident Response**: security-incident@chitlaq.com
- **Compliance**: compliance@chitlaq.com
- **Training**: security-training@chitlaq.com

## Conclusion

Implementing comprehensive security measures is essential for protecting user data and maintaining trust. This guide provides a foundation for secure implementation, but security is an ongoing process that requires continuous monitoring, updates, and improvement.

Remember:
- Security is everyone's responsibility
- Implement defense in depth
- Monitor and respond to threats
- Stay updated with security best practices
- Regular security audits and testing
