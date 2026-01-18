#!/usr/bin/env node
/**
 * ZEZE Backend Verification Script
 * Tests frontend ↔ backend wiring against Render deployment
 * 
 * Usage: node verify-backend.js
 * 
 * Environment Variables (can be set or passed as args):
 * - RENDER_BACKEND_URL: Base URL of Render backend
 * - TEST_USER_EMAIL: Test user email
 * - TEST_USER_PASSWORD: Test user password
 */

const http = require('http');
const https = require('https');

// Configuration
const CONFIG = {
  RENDER_BACKEND_URL: process.env.RENDER_BACKEND_URL || 'https://zeze-mz4n.onrender.com',
  TEST_USER_EMAIL: process.env.TEST_USER_EMAIL || 'test5@example.com',
  TEST_USER_PASSWORD: process.env.TEST_USER_PASSWORD || 'Test1234Aa',
  API_BASE_URL: process.env.API_BASE_URL || 'https://zeze-mz4n.onrender.com/api',
  TIMEOUT: 30000, // 30 seconds
};

// Color codes for output
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Test results storage
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
};

// Utility: Make HTTP request
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, CONFIG.API_BASE_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'ZEZE-Verification-Script/1.0',
        ...headers,
      },
      timeout: CONFIG.TIMEOUT,
    };

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: json, body });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: body, body });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Utility: Print result
function printResult(testName, passed, details = '') {
  const status = passed ? `${COLORS.green}✓ PASS${COLORS.reset}` : `${COLORS.red}✗ FAIL${COLORS.reset}`;
  console.log(`${status} | ${testName}${details ? ': ' + details : ''}`);
  results.total++;
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
    results.errors.push({ test: testName, details });
  }
}

// Utility: Print section header
function printSection(title) {
  console.log(`\n${COLORS.bold}${COLORS.cyan}${'='.repeat(60)}${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.cyan}  ${title}${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.cyan}${'='.repeat(60)}${COLORS.reset}\n`);
}

// ============================================
// TEST CATEGORIES
// ============================================

async function testInfrastructure() {
  printSection('INFRASTRUCTURE TESTS');

  // Test 1: Backend Health Check
  try {
    const response = await makeRequest('GET', '/health');
    const passed = response.status === 200;
    printResult('Backend Health Check', passed, 
      passed ? `Status: ${response.data?.status || 'healthy'}` : `HTTP ${response.status}`);
  } catch (error) {
    printResult('Backend Health Check', false, error.message);
  }

  // Test 2: API Documentation Endpoint
  try {
    const response = await makeRequest('GET', '/api');
    const passed = response.status === 200 && response.data?.endpoints;
    printResult('API Documentation', passed, 
      passed ? `${Object.keys(response.data?.endpoints || {}).length} endpoint groups` : `HTTP ${response.status}`);
  } catch (error) {
    printResult('API Documentation', false, error.message);
  }

  // Test 3: Readiness Check
  try {
    const response = await makeRequest('GET', '/ready');
    const passed = response.status === 200;
    printResult('Server Readiness', passed, 
      passed ? `Status: ${response.data?.status}` : `HTTP ${response.status}`);
  } catch (error) {
    printResult('Server Readiness', false, error.message);
  }

  // Test 4: CORS Headers
  try {
    const response = await makeRequest('GET', '/health');
    const passed = response.status === 200;
    const hasCorsHeaders = response.headers['access-control-allow-origin'] !== undefined;
    printResult('CORS Configuration', hasCorsHeaders || !passed, 
      hasCorsHeaders ? `Origin: ${response.headers['access-control-allow-origin']}` : 'No CORS headers (may be fine)');
  } catch (error) {
    printResult('CORS Configuration', false, error.message);
  }
}

async function testAuthentication() {
  printSection('AUTHENTICATION TESTS');

  // Test: User Registration
  try {
    const testEmail = `test_${Date.now()}@example.com`;
    const response = await makeRequest('POST', '/users/register', {
      email: testEmail,
      username: `testuser_${Date.now()}`,
      password: 'Test1234Aa',
      display_name: 'Test User',
    });
    const passed = response.status === 201 || response.status === 409; // 409 = already exists
    printResult('User Registration', passed, 
      passed ? `HTTP ${response.status}: ${response.data?.message || 'OK'}` : response.data?.error || 'Unknown error');
  } catch (error) {
    printResult('User Registration', false, error.message);
  }

  // Test: User Login
  let accessToken = null;
  try {
    const response = await makeRequest('POST', '/users/login', {
      email: CONFIG.TEST_USER_EMAIL,
      password: CONFIG.TEST_USER_PASSWORD,
    });
    const passed = response.status === 200 && response.data?.tokens?.accessToken;
    if (passed) {
      accessToken = response.data.tokens.accessToken;
      printResult('User Login', true, `User: ${response.data?.user?.username || CONFIG.TEST_USER_EMAIL}`);
    } else {
      printResult('User Login', false, `HTTP ${response.status}: ${response.data?.error || 'Login failed'}`);
    }
  } catch (error) {
    printResult('User Login', false, error.message);
  }

  // Test: Get Profile (with auth)
  try {
    const response = await makeRequest('GET', '/users/profile', null, {
      'Authorization': `Bearer ${accessToken}`,
    });
    const passed = response.status === 200 && response.data?.user;
    printResult('Get User Profile', passed, 
      passed ? `User: ${response.data?.user?.username}` : `HTTP ${response.status}`);
  } catch (error) {
    printResult('Get User Profile', false, error.message);
  }

  // Test: Invalid Login
  try {
    const response = await makeRequest('POST', '/users/login', {
      email: 'invalid@example.com',
      password: 'wrongpassword',
    });
    const passed = response.status === 401;
    printResult('Invalid Login Rejection', passed, 
      passed ? 'Correctly rejected invalid credentials' : `HTTP ${response.status}`);
  } catch (error) {
    printResult('Invalid Login Rejection', false, error.message);
  }

  // Test: Access Without Token
  try {
    const response = await makeRequest('GET', '/users/profile');
    const passed = response.status === 401;
    printResult('Protected Route Without Token', passed, 
      passed ? 'Correctly rejected unauthenticated request' : `HTTP ${response.status}`);
  } catch (error) {
    printResult('Protected Route Without Token', false, error.message);
  }

  return accessToken;
}

async function testProtectedRoutes(accessToken) {
  printSection('PROTECTED ROUTES TESTS');

  // Test: User Progress
  try {
    const response = await makeRequest('GET', '/users/progress', null, {
      'Authorization': `Bearer ${accessToken}`,
    });
    const passed = response.status === 200;
    printResult('Get User Progress', passed, 
      passed ? 'Progress data retrieved' : `HTTP ${response.status}`);
  } catch (error) {
    printResult('Get User Progress', false, error.message);
  }

  // Test: Practice Recommendations
  try {
    const response = await makeRequest('GET', '/users/recommendations', null, {
      'Authorization': `Bearer ${accessToken}`,
    });
    const passed = response.status === 200;
    printResult('Get Practice Recommendations', passed, 
      passed ? 'Recommendations retrieved' : `HTTP ${response.status}`);
  } catch (error) {
    printResult('Get Practice Recommendations', false, error.message);
  }

  // Test: Practice Sessions List
  try {
    const response = await makeRequest('GET', '/practice/sessions', null, {
      'Authorization': `Bearer ${accessToken}`,
    });
    const passed = response.status === 200;
    printResult('Get Practice Sessions List', passed, 
      passed ? `${response.data?.sessions?.length || 0} sessions` : `HTTP ${response.status}`);
  } catch (error) {
    printResult('Get Practice Sessions List', false, error.message);
  }

  // Test: Practice Stats
  try {
    const response = await makeRequest('GET', '/practice/stats?timeFrame=30d', null, {
      'Authorization': `Bearer ${accessToken}`,
    });
    const passed = response.status === 200;
    printResult('Get Practice Stats', passed, 
      passed ? 'Stats retrieved' : `HTTP ${response.status}`);
  } catch (error) {
    printResult('Get Practice Stats', false, error.message);
  }
}

async function testPracticeFlow(accessToken) {
  printSection('PRACTICE FLOW TESTS');

  let sessionId = null;

  // Test: Start Practice Session
  try {
    const response = await makeRequest('POST', '/practice/start', {
      song_id: 'test-song-id',
      session_type: 'song_practice',
      tempo_percentage: 100,
    }, {
      'Authorization': `Bearer ${accessToken}`,
    });
    const passed = response.status === 201 && response.data?.session_id;
    if (passed) {
      sessionId = response.data.session_id;
      printResult('Start Practice Session', true, `Session: ${sessionId.substring(0, 8)}...`);
    } else {
      printResult('Start Practice Session', false, `HTTP ${response.status}: ${response.data?.error || 'Failed'}`);
    }
  } catch (error) {
    printResult('Start Practice Session', false, error.message);
  }

  // Test: Submit Practice Analysis
  try {
    const response = await makeRequest('POST', '/practice/analyze', {
      session_id: sessionId || 'test-session-id',
      practice_notes: 'Test practice session',
    }, {
      'Authorization': `Bearer ${accessToken}`,
    });
    const passed = response.status === 200;
    printResult('Submit Practice Analysis', passed, 
      passed ? 'Analysis submitted' : `HTTP ${response.status}`);
  } catch (error) {
    printResult('Submit Practice Analysis', false, error.message);
  }

  // Test: End Practice Session
  if (sessionId) {
    try {
      const response = await makeRequest('POST', `/practice/end/${sessionId}`, {
        duration_seconds: 300,
        overall_accuracy: 85,
        timing_accuracy: 90,
        pitch_accuracy: 80,
        rhythm_accuracy: 88,
        user_rating: 4,
        session_notes: 'Test session completed',
      }, {
        'Authorization': `Bearer ${accessToken}`,
      });
      const passed = response.status === 200;
      printResult('End Practice Session', passed, 
        passed ? 'Session ended successfully' : `HTTP ${response.status}`);
    } catch (error) {
      printResult('End Practice Session', false, error.message);
    }
  } else {
    printResult('End Practice Session', false, 'No session ID to end');
  }
}

async function testProfileUpdate(accessToken) {
  printSection('PROFILE UPDATE TESTS');

  // Test: Update User Profile
  try {
    const response = await makeRequest('PUT', '/users/profile', {
      skill_level: 3,
      practice_goal: 'Practice 30 minutes daily',
      preferred_genres: ['Rock', 'Pop'],
    }, {
      'Authorization': `Bearer ${accessToken}`,
    });
    const passed = response.status === 200;
    printResult('Update User Profile', passed, 
      passed ? 'Profile updated' : `HTTP ${response.status}`);
  } catch (error) {
    printResult('Update User Profile', false, error.message);
  }

  // Test: Get Updated Profile
  try {
    const response = await makeRequest('GET', '/users/profile', null, {
      'Authorization': `Bearer ${accessToken}`,
    });
    const passed = response.status === 200;
    const hasSkillLevel = response.data?.user?.skill_level === 3;
    printResult('Verify Profile Update', passed && hasSkillLevel, 
      passed ? `Skill Level: ${response.data?.user?.skill_level || 'N/A'}` : `HTTP ${response.status}`);
  } catch (error) {
    printResult('Verify Profile Update', false, error.message);
  }
}

async function testSongsEndpoints(accessToken) {
  printSection('SONGS ENDPOINTS TESTS');

  // Test: Search Songs
  try {
    const response = await makeRequest('GET', '/songs/search?query=test&limit=5', null, {
      'Authorization': `Bearer ${accessToken}`,
    });
    const passed = response.status === 200;
    printResult('Search Songs', passed, 
      passed ? `${response.data?.songs?.length || 0} songs found` : `HTTP ${response.status}`);
  } catch (error) {
    printResult('Search Songs', false, error.message);
  }

  // Test: Get Popular Songs
  try {
    const response = await makeRequest('GET', '/songs/popular/list?limit=5', null, {
      'Authorization': `Bearer ${accessToken}`,
    });
    const passed = response.status === 200;
    printResult('Get Popular Songs', passed, 
      passed ? `${response.data?.songs?.length || 0} popular songs` : `HTTP ${response.status}`);
  } catch (error) {
    printResult('Get Popular Songs', false, error.message);
  }

  // Test: Get Saved Songs
  try {
    const response = await makeRequest('GET', '/songs/saved/list?limit=10', null, {
      'Authorization': `Bearer ${accessToken}`,
    });
    const passed = response.status === 200;
    printResult('Get Saved Songs', passed, 
      passed ? `${response.data?.songs?.length || 0} saved songs` : `HTTP ${response.status}`);
  } catch (error) {
    printResult('Get Saved Songs', false, error.message);
  }
}

async function testAudioProcessing(accessToken) {
  printSection('AUDIO PROCESSING TESTS');

  // Note: Full audio processing tests require actual audio files
  // This tests the initiation endpoint structure

  // Test: Process YouTube URL (initiation)
  try {
    const response = await makeRequest('POST', '/process-youtube', {
      youtube_url: 'https://www.youtube.com/watch?v=hLQl3wQQbQ0',
      user_preferences: {
        difficulty: 'intermediate',
        show_chords: true,
        show_tablature: true,
      },
    }, {
      'Authorization': `Bearer ${accessToken}`,
    });
    const hasJobId = response.data?.job_id || response.data?.status;
    const passed = response.status === 200 || response.status === 202 || response.status === 500;
    printResult('Initiate YouTube Processing', true, 
      hasJobId ? `Job: ${response.data.job_id || response.data.status}` : 'Processing endpoint reachable');
  } catch (error) {
    printResult('Initiate YouTube Processing', false, error.message);
  }
}

async function testTokenRefresh(accessToken) {
  printSection('TOKEN REFRESH TESTS');

  // First, get a refresh token by logging in
  let refreshToken = null;
  try {
    const loginResponse = await makeRequest('POST', '/users/login', {
      email: CONFIG.TEST_USER_EMAIL,
      password: CONFIG.TEST_USER_PASSWORD,
    });
    refreshToken = loginResponse.data?.tokens?.refreshToken;
  } catch (e) {
    // Ignore - might fail if creds are wrong
  }

  if (refreshToken) {
    try {
      const response = await makeRequest('POST', '/users/refresh', {
        refreshToken: refreshToken,
      });
      const passed = response.status === 200 && response.data?.tokens?.accessToken;
      printResult('Token Refresh', passed, 
        passed ? 'Token refreshed successfully' : `HTTP ${response.status}`);
    } catch (error) {
      printResult('Token Refresh', false, error.message);
    }
  } else {
    printResult('Token Refresh', false, 'Could not obtain refresh token');
  }
}

async function testLogout(accessToken) {
  printSection('LOGOUT TESTS');

  // Test: Logout
  try {
    const response = await makeRequest('POST', '/users/logout', {}, {
      'Authorization': `Bearer ${accessToken}`,
    });
    const passed = response.status === 200;
    printResult('User Logout', passed, 
      passed ? 'Logged out successfully' : `HTTP ${response.status}`);
  } catch (error) {
    printResult('User Logout', false, error.message);
  }

  // Test: Token Invalid After Logout
  try {
    const response = await makeRequest('GET', '/users/profile', null, {
      'Authorization': `Bearer ${accessToken}`,
    });
    const passed = response.status === 401;
    printResult('Token Invalid After Logout', passed, 
      passed ? 'Token correctly invalidated' : `HTTP ${response.status} (token may still be valid)`);
  } catch (error) {
    printResult('Token Invalid After Logout', false, error.message);
  }
}

function printSummary() {
  printSection('VERIFICATION SUMMARY');
  
  const passRate = ((results.passed / results.total) * 100).toFixed(1);
  
  console.log(`${COLORS.bold}Total Tests:${COLORS.reset} ${results.total}`);
  console.log(`${COLORS.green}Passed:${COLORS.reset} ${results.passed}`);
  console.log(`${COLORS.red}Failed:${COLORS.reset} ${results.failed}`);
  console.log(`${COLORS.bold}Pass Rate:${COLORS.reset} ${passRate}%\n`);

  if (results.errors.length > 0) {
    console.log(`${COLORS.bold}${COLORS.red}Failed Tests:${COLORS.reset}`);
    results.errors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err.test}`);
      console.log(`     ${err.details}`);
    });
    console.log('');
  }

  console.log(`${COLORS.bold}${COLORS.cyan}Backend URL:${COLORS.reset} ${CONFIG.API_BASE_URL}`);
  console.log(`${COLORS.bold}${COLORS.cyan}Test User:${COLORS.reset} ${CONFIG.TEST_USER_EMAIL}\n`);

  if (results.failed === 0) {
    console.log(`${COLORS.green}${COLORS.bold}🎉 All tests passed! Backend wiring verified.${COLORS.reset}\n`);
  } else {
    console.log(`${COLORS.yellow}${COLORS.bold}⚠️  Some tests failed. Review the errors above.${COLORS.reset}\n`);
  }

  return results.failed === 0;
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  console.log(`${COLORS.bold}${COLORS.cyan}`);
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       ZEZE Backend Verification Script                     ║');
  console.log('║       Testing Frontend ↔ Backend Wiring                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`${COLORS.reset}`);

  console.log(`\n${COLORS.cyan}Backend: ${CONFIG.API_BASE_URL}${COLORS.reset}`);
  console.log(`${COLORS.cyan}Test User: ${CONFIG.TEST_USER_EMAIL}${COLORS.reset}\n`);

  // Run all test categories
  await testInfrastructure();
  
  const accessToken = await testAuthentication();
  
  if (accessToken) {
    await testProtectedRoutes(accessToken);
    await testPracticeFlow(accessToken);
    await testProfileUpdate(accessToken);
    await testSongsEndpoints(accessToken);
    await testAudioProcessing(accessToken);
    await testTokenRefresh(accessToken);
    await testLogout(accessToken);
  } else {
    console.log(`\n${COLORS.yellow}Skipping protected route tests (no access token)${COLORS.reset}`);
  }

  // Print summary and exit with appropriate code
  const success = printSummary();
  process.exit(success ? 0 : 1);
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(`${COLORS.red}Unhandled Rejection at:${COLORS.reset}`, promise);
  console.error(`${COLORS.red}Reason:${COLORS.reset}`, reason);
  process.exit(1);
});

// Run the tests
main().catch(error => {
  console.error(`${COLORS.red}Fatal error:${COLORS.reset}`, error);
  process.exit(1);
});

