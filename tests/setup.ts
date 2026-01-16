// Test setup file
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test.example' });

// Set test defaults
process.env.OPENAI_MODEL = 'gpt-4o-mini';
process.env.PORT = '0'; // Random port for testing
process.env.MAX_RETRIES = '1';
process.env.TIMEOUT_MS = '5000';
