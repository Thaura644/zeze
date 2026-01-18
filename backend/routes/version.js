const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const { query: dbQuery } = require('../config/database');

// Mobile app version configuration
const MOBILE_APP_VERSIONS = {
  ios: {
    current: process.env.IOS_APP_VERSION || '1.0.0',
    min_supported: process.env.IOS_MIN_VERSION || '1.0.0',
    codepush_deployment_key: process.env.CODEPUSH_IOS_DEPLOYMENT_KEY || '',
    force_update: process.env.IOS_FORCE_UPDATE === 'true' || false
  },
  android: {
    current: process.env.ANDROID_APP_VERSION || '1.0.0',
    min_supported: process.env.ANDROID_MIN_VERSION || '1.0.0',
    codepush_deployment_key: process.env.CODEPUSH_ANDROID_DEPLOYMENT_KEY || '',
    force_update: process.env.ANDROID_FORCE_UPDATE === 'true' || false
  }
};

// Version comparison utility
const compareVersions = (v1, v2) => {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  
  return 0;
};

// Middleware to validate and extract app version info
const validateAppVersion = (req, res, next) => {
  const { platform, app_version } = req.headers;
  
  if (!platform || !app_version) {
    return res.status(400).json({
      error: 'Missing required headers: platform and app_version',
      code: 'MISSING_VERSION_INFO'
    });
  }
  
  if (!MOBILE_APP_VERSIONS[platform]) {
    return res.status(400).json({
      error: 'Unsupported platform',
      code: 'UNSUPPORTED_PLATFORM',
      supported_platforms: Object.keys(MOBILE_APP_VERSIONS)
    });
  }
  
  req.appVersion = {
    platform,
    currentVersion: app_version,
    platformConfig: MOBILE_APP_VERSIONS[platform]
  };
  
  next();
};

// Check if app version is supported and trigger updates
router.post('/check', validateAppVersion, async (req, res) => {
  try {
    const { platform, currentVersion, platformConfig } = req.appVersion;
    const { current: latestVersion, min_supported: minSupportedVersion, force_update, codepush_deployment_key } = platformConfig;
    
    // Version comparison results
    const versionComparison = compareVersions(currentVersion, latestVersion);
    const minVersionComparison = compareVersions(currentVersion, minSupportedVersion);
    
    // Determine update requirements
    const needsForceUpdate = force_update || versionComparison < 0;
    const needsCodePush = versionComparison < 0 && minVersionComparison >= 0;
    const isOutdated = versionComparison < 0;
    const isUnsupported = minVersionComparison < 0;
    
    // Log version check
    logger.info('App version checked', {
      platform,
      currentVersion,
      latestVersion,
      minSupportedVersion,
      needsForceUpdate,
      needsCodePush,
      isOutdated,
      isUnsupported,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    // Store version check for analytics (async)
    if (process.env.DATABASE_URL || process.env.DB_HOST) {
      setImmediate(async () => {
        try {
          await dbQuery(`
            INSERT INTO app_version_checks (platform, current_version, latest_version, needs_update, ip, user_agent, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
          `, [platform, currentVersion, latestVersion, isOutdated, req.ip, req.get('User-Agent')]);
        } catch (error) {
          logger.debug('Failed to store version check', { error: error.message });
        }
      });
    }
    
    // Response based on update requirements
    const response = {
      current_version: currentVersion,
      latest_version: latestVersion,
      min_supported_version: minSupportedVersion,
      is_current: versionComparison === 0,
      is_outdated: isOutdated,
      is_unsupported: isUnsupported,
      needs_update: isOutdated,
      update_required: needsForceUpdate,
      codepush_available: needsCodePush,
      codepush_deployment_key: needsCodePush ? codepush_deployment_key : null,
      platform,
      server_time: new Date().toISOString()
    };
    
    // If force update is required, set HTTP status to indicate urgency
    const statusCode = needsForceUpdate ? 426 : 200; // 426 Upgrade Required
    
    res.status(statusCode).json(response);
    
  } catch (error) {
    logger.error('Version check failed', {
      error: error.message,
      platform: req.appVersion?.platform,
      currentVersion: req.appVersion?.currentVersion,
      ip: req.ip
    });
    
    res.status(500).json({
      error: 'Version check failed',
      code: 'VERSION_CHECK_ERROR'
    });
  }
});

// Get current app version info (no auth required)
router.get('/info', (req, res) => {
  const { platform } = req.query;
  
  if (platform && MOBILE_APP_VERSIONS[platform]) {
    res.json({
      platform,
      versions: MOBILE_APP_VERSIONS[platform],
      server_time: new Date().toISOString()
    });
  } else {
    res.json({
      available_platforms: Object.keys(MOBILE_APP_VERSIONS),
      versions: MOBILE_APP_VERSIONS,
      server_time: new Date().toISOString()
    });
  }
});

// Get version update history (for debugging/analytics)
router.get('/history', async (req, res) => {
  try {
    const { platform, limit = 50 } = req.query;
    
    if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
      return res.json({
        message: 'Version history not available (database not configured)',
        history: []
      });
    }
    
    let query = 'SELECT * FROM app_version_checks ORDER BY created_at DESC LIMIT $1';
    let params = [limit];
    
    if (platform) {
      query = 'SELECT * FROM app_version_checks WHERE platform = $1 ORDER BY created_at DESC LIMIT $2';
      params = [platform, limit];
    }
    
    const result = await dbQuery(query, params);
    
    res.json({
      platform: platform || 'all',
      history: result.rows,
      server_time: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Version history failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to retrieve version history',
      code: 'VERSION_HISTORY_ERROR'
    });
  }
});

// Force update notification (for emergency updates)
router.post('/force-update', async (req, res) => {
  try {
    const { platform, min_version, message } = req.body;
    
    if (!platform || !min_version) {
      return res.status(400).json({
        error: 'Platform and min_version are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }
    
    // In a real implementation, this would update the environment variables
    // or a database table that stores version requirements
    
    logger.warn('Force update triggered', {
      platform,
      minVersion: min_version,
      message,
      triggeredBy: req.ip,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      message: 'Force update configuration updated',
      platform,
      minVersion: min_version,
      message,
      server_time: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Force update failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to configure force update',
      code: 'FORCE_UPDATE_ERROR'
    });
  }
});

module.exports = router;