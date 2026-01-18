# ZEZE Backend Verification - TODO List

## Documentation Created
- [x] VERIFICATION_PLAN.md - Comprehensive verification plan with all tests
- [x] verify-backend.js - Automated verification script
- [x] .env.example - Environment configuration template
- [x] API_MAPPING.md - Frontend to backend endpoint mapping
- [x] VERIFICATION_REPORT_TEMPLATE.md - Report template for test results

## Pre-Verification Checklist
- [ ] 1. Set EXPO_PUBLIC_API_URL in frontend environment
- [ ] 2. Ensure backend is deployed and accessible on Render
- [ ] 3. Verify test user credentials work
- [ ] 4. Set backend environment variables in Render dashboard

## Phase 1: Infrastructure Verification
- [ ] 1.1 Backend Health Check
- [ ] 1.2 API Documentation Endpoint
- [ ] 1.3 Server Readiness
- [ ] 1.4 CORS Configuration

## Phase 2: Authentication Verification
- [ ] 2.1 User Registration
- [ ] 2.2 User Login
- [ ] 2.3 Get User Profile
- [ ] 2.4 Invalid Login Rejection
- [ ] 2.5 Protected Route Without Token
- [ ] 2.6 Token Refresh
- [ ] 2.7 User Logout

## Phase 3: Protected Routes Verification
- [ ] 3.1 Get User Progress
- [ ] 3.2 Get Practice Recommendations
- [ ] 3.3 Get Practice Sessions List
- [ ] 3.4 Get Practice Stats

## Phase 4: Practice Flow Verification
- [ ] 4.1 Start Practice Session
- [ ] 4.2 Submit Practice Analysis
- [ ] 4.3 End Practice Session

## Phase 5: Profile Update Verification
- [ ] 5.1 Update User Profile
- [ ] 5.2 Verify Profile Update

## Phase 6: Songs Endpoints Verification
- [ ] 6.1 Search Songs
- [ ] 6.2 Get Popular Songs
- [ ] 6.3 Get Saved Songs

## Phase 7: Audio Processing Verification
- [ ] 7.1 Initiate YouTube Processing
- [ ] 7.2 Poll Processing Status
- [ ] 7.3 Retrieve Processing Results

## Phase 8: Screen Relationship Verification
- [ ] 8.1 Login → Home Navigation
- [ ] 8.2 Home → Profile Navigation
- [ ] 8.3 Home → Player Navigation
- [ ] 8.4 Home → Learning Navigation
- [ ] 8.5 Player → Home Navigation
- [ ] 8.6 Profile → Home Navigation
- [ ] 8.7 Auth Context Persistence

## Phase 9: Redux State Verification
- [ ] 9.1 userSlice State Management
- [ ] 9.2 profileSlice State Management
- [ ] 9.3 songsSlice State Management
- [ ] 9.4 playerSlice State Management

## Phase 10: Error Handling Verification
- [ ] 10.1 401 Error Handling
- [ ] 10.2 403 Error Handling
- [ ] 10.3 404 Error Handling
- [ ] 10.4 429 Rate Limiting
- [ ] 10.5 500 Server Error Handling

## Running the Verification Script

### Quick Start
```bash
# Install dependencies (if not already installed)
npm install

# Run the verification script
node verify-backend.js

# With custom credentials
RENDER_BACKEND_URL=https://zeze-mz4n.onrender.com \
TEST_USER_EMAIL=test5@example.com \
TEST_USER_PASSWORD=Test1234Aa \
node verify-backend.js
```

### Expected Output
```
============================================================
  ZEZE Backend Verification Script
  Testing Frontend ↔ Backend Wiring
============================================================

Backend: https://zeze-mz4n.onrender.com/api
Test User: test5@example.com

============================================================
  INFRASTRUCTURE TESTS
============================================================

✓ PASS | Backend Health Check: Status: healthy
✓ PASS | API Documentation: 5 endpoint groups
✓ PASS | Server Readiness: Status: ready
...

============================================================
  VERIFICATION SUMMARY
============================================================

Total Tests: 25
Passed: 24
Failed: 1
Pass Rate: 96.0%

...
```

## Next Steps After Verification

### If All Tests Pass
1. [ ] Mark all TODO items complete
2. [ ] Sign off on deployment
3. [ ] Update FRONTEND_STATUS.md

### If Tests Fail
1. [ ] Review failed test details
2. [ ] Check backend logs on Render
3. [ ] Fix issues and re-run verification
4. [ ] Update this TODO with remediation steps

## Backend Configuration for Render

Required Environment Variables (Render Dashboard):
```
JWT_SECRET=[generate-secure-random-string]
JWT_EXPIRES_IN=7d
JWT_REFRESH_REFRESH_EXPIRES_IN=30d
DATABASE_URL=[your-postgresql-url]
REDIS_URL=[your-redis-url]
NODE_ENV=production
PORT=3001
```

## Frontend Configuration for Render

Required Environment (app.config.js or .env):
```
EXPO_PUBLIC_API_URL=https://zeze-mz4n.onrender.com/api
```

---

*Last Updated: January 2025*
*Run `node verify-backend.js` to execute automated tests*

