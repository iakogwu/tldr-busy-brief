import request from 'supertest';
import { app } from '../../server/index';

describe('MCP Server Integration Tests', () => {
  describe('Health Endpoint', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('model');
      expect(response.body).toHaveProperty('hasApiKey');
    });
  });

  describe('Explain Endpoint', () => {
    it('should reject requests with missing input', async () => {
      const response = await request(app)
        .post('/explain')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Missing required field: input');
      expect(response.body).toHaveProperty('code', 'MISSING_INPUT');
    });

    it('should reject requests with short input', async () => {
      const response = await request(app)
        .post('/explain')
        .send({ input: 'short' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Input must be at least 20 characters long');
      expect(response.body).toHaveProperty('code', 'INPUT_TOO_SHORT');
    });

    it('should reject requests with non-string input', async () => {
      const response = await request(app)
        .post('/explain')
        .send({ input: 123 })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Input must be a string');
      expect(response.body).toHaveProperty('code', 'INVALID_INPUT_TYPE');
    });

    it('should reject requests with overly long input', async () => {
      const longInput = 'a'.repeat(100001);
      const response = await request(app)
        .post('/explain')
        .send({ input: longInput })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Input must be less than 100,000 characters');
      expect(response.body).toHaveProperty('code', 'INPUT_TOO_LONG');
    });

    it('should handle valid input format', async () => {
      // Mock the OpenAI API call by setting invalid API key
      process.env.OPENAI_API_KEY = 'test-key';
      
      const validInput = 'Team meeting tomorrow at 3pm about Q4 project deadline. Alex will send the agenda by tomorrow 3pm. Need to prepare slides and review budget numbers before the call.';
      
      const response = await request(app)
        .post('/explain')
        .send({ input: validInput });

      // Should return 401 for invalid API key, but 400 for validation errors
      expect([401, 502]).toContain(response.status);
    });
  });

  describe('404 Handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/unknown')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Endpoint not found');
      expect(response.body).toHaveProperty('code', 'NOT_FOUND');
    });
  });
});
