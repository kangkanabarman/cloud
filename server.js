// ==============================================================================
// MediCloud — Cloud-Based Hospital Management System (Server Entry Point)
// Academic Cloud Computing FT-III Case Study
// ==============================================================================

const path = require('path');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const { performance } = require('perf_hooks');

const config = require('./src/config');
const { initDatabase } = require('./src/db/init');
const { seedDatabase } = require('./src/db/seed');
const metrics = require('./src/utils/metrics');
const { apiLimiter } = require('./src/middleware/rateLimiter');
const { errorHandler } = require('./src/middleware/errorHandler');

// Route Handlers
const authRoutes = require('./src/routes/auth');
const patientsRoutes = require('./src/routes/patients');
const doctorsRoutes = require('./src/routes/doctors');
const appointmentsRoutes = require('./src/routes/appointments');
const medicalRecordsRoutes = require('./src/routes/medicalRecords');
const usersRoutes = require('./src/routes/users');
const auditRoutes = require('./src/routes/audit');
const backupRoutes = require('./src/routes/backup');
const healthRoutes = require('./src/routes/health');
const evaluationRoutes = require('./src/routes/evaluation');

// Initialize Database & Seeds on startup
try {
  initDatabase();
  seedDatabase();
} catch (err) {
  console.error('Database initialization warning on boot:', err.message);
}

const app = express();

// Security Headers with Helmet
// Allow inline script/styles for SPA view rendering with Google Fonts
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", '*']
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// CORS Policy (Supports wildcard reflection or explicit origin whitelist)
const corsOrigin = process.env.CORS_ORIGIN
  ? (process.env.CORS_ORIGIN.includes(',') ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) : process.env.CORS_ORIGIN)
  : true;

app.use(cors({
  origin: corsOrigin,
  credentials: true
}));

// Body Parsing & Cookie Parser
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Trust first proxy for ALB / Reverse Proxy / Cloud PaaS in production
if (config.isProduction || process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// Session Configuration
app.use(
  session({
    name: config.session.name,
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: config.session.sameSite,
      secure: config.session.secure,
      maxAge: config.session.maxAge
    }
  })
);

// Performance & Telemetry Tracking Middleware
app.use((req, res, next) => {
  const start = performance.now();
  res.on('finish', () => {
    const duration = performance.now() - start;
    metrics.recordRequest(duration, res.statusCode);
  });
  next();
});

// Serve Static Frontend Assets
app.use(express.static(path.join(__dirname, 'public')));

// Public Health Check Endpoint (Bypasses API rate limiter for ALB health monitoring)
app.use('/api/health', healthRoutes);

// Apply Rate Limiter to remaining API routes
app.use('/api', apiLimiter);

// Mount API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/doctors', doctorsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/medical-records', medicalRecordsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/evaluation', evaluationRoutes);

// SPA Fallback for Client-Side Routing
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

// Centralized Error Handling
app.use(errorHandler);

// Start Server if invoked directly
if (require.main === module) {
  const server = app.listen(config.port, () => {
    console.log(`=============================================================`);
    console.log(`🏥 MediCloud — Hospital Management System`);
    console.log(`   Academic Cloud Computing FT-III Case Study`);
    console.log(`   Environment: ${config.env}`);
    console.log(`   Server Port: ${config.port}`);
    console.log(`   Local URL:   http://localhost:${config.port}`);
    console.log(`   Health Check: http://localhost:${config.port}/api/health`);
    console.log(`=============================================================`);
  });

  // Graceful Shutdown
  const shutdown = () => {
    console.log('\nShutting down gracefully...');
    server.close(() => {
      console.log('MediCloud server terminated.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

module.exports = app;
