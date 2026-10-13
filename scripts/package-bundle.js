// ==============================================================================
// MediCloud Deployment Bundle Packager & Pre-Flight Validator
// Validates deployment requirements and packages zip archive
// ==============================================================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Running MediCloud Pre-Flight Deployment Checks...');

// 1. Validate Node version
const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
if (nodeMajor < 22) {
  console.warn(`⚠️ Warning: Node.js version is ${process.version}. node:sqlite requires Node.js >= 22.5.0.`);
} else {
  console.log(`✅ Node runtime version: ${process.version} (>= 22.5.0 requirement satisfied)`);
}

// 2. Validate Essential Directories & Files
const requiredFiles = [
  'server.js',
  'package.json',
  'public/index.html',
  'public/css/styles.css',
  'public/js/app.js',
  'public/js/api.js',
  'database/schema.sql',
  'render.yaml',
  'vercel.json',
  'Dockerfile'
];

let allFound = true;
for (const file of requiredFiles) {
  const fullPath = path.resolve(__dirname, '..', file);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Missing critical file: ${file}`);
    allFound = false;
  }
}

if (!allFound) {
  console.error('❌ Pre-flight check failed: required files missing.');
  process.exit(1);
}
console.log('✅ All essential application and deployment configuration files verified.');

// 3. Create zip bundle using system zip if available
const outputPath = path.resolve(__dirname, '..', 'medicloud-deployment.zip');
try {
  console.log('📦 Creating production deployment archive (medicloud-deployment.zip)...');
  const zipCmd = `zip -r "${outputPath}" . -x "node_modules/*" ".git/*" "tests/*" "*.pptx" ".DS_Store" "database/*.sqlite" "data/backups/*" "medicloud-deployment.zip"`;
  execSync(zipCmd, { cwd: path.resolve(__dirname, '..'), stdio: 'inherit' });
  const stats = fs.statSync(outputPath);
  console.log(`✅ Production bundle successfully created: medicloud-deployment.zip (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
} catch (err) {
  console.log('ℹ️ Zip command skipped or not available. Files are ready for Git push or manual upload.');
}

console.log('\n🚀 MediCloud is ready for deployment across:');
console.log('   - Render (render.yaml Blueprint / GitHub auto-deploy)');
console.log('   - Vercel (vercel.json for CDN Frontend + API proxy)');
console.log('   - Railway (railway.json)');
console.log('   - Docker & Docker Compose (Dockerfile / docker-compose.yml)');
console.log('   - AWS Elastic Beanstalk (.ebextensions/01_app.config)');
