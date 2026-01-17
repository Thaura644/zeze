const request = require('supertest');
const { app } = require('../server');

describe('API Health Checks', () => {
  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('database');
      expect(response.body.services).toHaveProperty('redis');
    });
  });

  describe('GET /ready', () => {
    it('should return ready status', async () => {
      const response = await request(app)
        .get('/ready')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ready');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /metrics', () => {
    it('should return metrics in Prometheus format', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/plain/);
      expect(response.text).toContain('zeze_connected_clients');
      expect(response.text).toContain('zeze_memory_usage_bytes');
    });
  });
});

describe('Root Endpoint', () => {
  it('should return API information', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('status', 'running');
    expect(response.body).toHaveProperty('version');
    expect(response.body).toHaveProperty('documentation', '/api');
  });
});

describe('API Documentation', () => {
  it('should return API documentation', async () => {
    const response = await request(app)
      .get('/api')
      .expect(200);

    expect(response.body).toHaveProperty('name', 'ZEZE Backend API');
    expect(response.body).toHaveProperty('endpoints');
    expect(response.body.endpoints).toHaveProperty('authentication');
    expect(response.body.endpoints).toHaveProperty('audio_processing');
    expect(response.body.endpoints).toHaveProperty('practice');
    expect(response.body.endpoints).toHaveProperty('songs');
    expect(response.body).toHaveProperty('websocket');
  });
});

describe('Error Handling', () => {
  it('should handle 404 for unknown endpoints', async () => {
    const response = await request(app)
      .get('/unknown-endpoint')
      .expect(404);

    expect(response.body).toHaveProperty('error', 'Endpoint not found');
    expect(response.body).toHaveProperty('code', 'NOT_FOUND');
  });

  it('should handle invalid HTTP methods', async () => {
    const response = await request(app)
      .patch('/health')
      .expect(404);

    expect(response.body).toHaveProperty('error', 'Endpoint not found');
  });
});

describe('CORS', () => {
  it('should include CORS headers', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.headers).toHaveProperty('access-control-allow-origin');
    expect(response.headers).toHaveProperty('access-control-allow-methods');
    expect(response.headers).toHaveProperty('access-control-allow-headers');
  });
});

describe('Rate Limiting', () => {
  it('should allow normal requests', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status');
  });

  it('should handle requests within limits', async () => {
    const promises = Array(10).fill().map(() => 
      request(app).get('/health')
    );

    const responses = await Promise.all(promises);
    
    // All should succeed under the limit
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });
  });
});

describe('Security Headers', () => {
  it('should include security headers', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.headers).toHaveProperty('x-content-type-options');
    expect(response.headers).toHaveProperty('x-frame-options');
    expect(response.headers).toHaveProperty('x-xss-protection');
  });
});