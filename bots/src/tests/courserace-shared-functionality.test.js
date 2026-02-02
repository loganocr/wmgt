import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RaceLeaderboardService } from '../services/RaceLeaderboardService.js';
import { config } from '../config/config.js';

/**
 * Test suite for verifying shared functionality inherited from CourseLeaderboardService
 * Tests Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 10.2, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7
 */
describe('CourseRace Command - Shared Functionality Verification', () => {
  let service;

  beforeEach(() => {
    service = new RaceLeaderboardService();
    // Clear any cached data
    service.clearCourseCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Course Autocomplete Functionality (Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 10.2)', () => {
    it('should inherit getAvailableCourses method from parent', () => {
      expect(service.getAvailableCourses).toBeDefined();
      expect(typeof service.getAvailableCourses).toBe('function');
    });

    it('should inherit course caching functionality', () => {
      expect(service.courseCache).toBeDefined();
      expect(service.courseCache instanceof Map).toBe(true);
      expect(service.courseCacheExpiry).toBeDefined();
      expect(service.courseCacheTimeout).toBeDefined();
    });

    it('should inherit clearCourseCache method', () => {
      expect(service.clearCourseCache).toBeDefined();
      expect(typeof service.clearCourseCache).toBe('function');
      
      // Test that it works
      service.courseCache.set('TEST', { code: 'TEST', name: 'Test Course' });
      service.courseCacheExpiry = Date.now() + 1000;
      
      service.clearCourseCache();
      
      expect(service.courseCache.size).toBe(0);
      expect(service.courseCacheExpiry).toBeNull();
    });

    it('should inherit getCourseNameFromCode method', () => {
      expect(service.getCourseNameFromCode).toBeDefined();
      expect(typeof service.getCourseNameFromCode).toBe('function');
      
      // Test with a known course code
      const courseName = service.getCourseNameFromCode('ALE');
      expect(courseName).toBeDefined();
      expect(typeof courseName).toBe('string');
    });

    it('should inherit getCourseDifficulty method', () => {
      expect(service.getCourseDifficulty).toBeDefined();
      expect(typeof service.getCourseDifficulty).toBe('function');
      
      // Test difficulty detection
      expect(service.getCourseDifficulty('ALE')).toBe('(Easy)');
      expect(service.getCourseDifficulty('ALH')).toBe('');
    });
  });

  describe('Fallback Courses (Requirements 2.5, 10.2)', () => {
    it('should inherit getFallbackCourses method from parent', () => {
      expect(service.getFallbackCourses).toBeDefined();
      expect(typeof service.getFallbackCourses).toBe('function');
    });

    it('should provide fallback courses when API is unavailable', () => {
      const fallbackCourses = service.getFallbackCourses();
      
      expect(Array.isArray(fallbackCourses)).toBe(true);
      expect(fallbackCourses.length).toBeGreaterThan(0);
      
      // Verify structure of fallback courses
      fallbackCourses.forEach(course => {
        expect(course).toHaveProperty('code');
        expect(course).toHaveProperty('name');
        expect(course).toHaveProperty('difficulty');
        expect(typeof course.code).toBe('string');
        expect(typeof course.name).toBe('string');
        expect(typeof course.difficulty).toBe('string');
      });
    });

    it('should include popular courses in fallback list', () => {
      const fallbackCourses = service.getFallbackCourses();
      const courseCodes = fallbackCourses.map(c => c.code);
      
      // Check for some popular courses
      expect(courseCodes).toContain('ALE');
      expect(courseCodes).toContain('ALH');
      expect(courseCodes).toContain('BBE');
      expect(courseCodes).toContain('BBH');
      expect(courseCodes).toContain('TTE');
      expect(courseCodes).toContain('TTH');
    });

    it('should inherit getSuggestedCourses method', () => {
      expect(service.getSuggestedCourses).toBeDefined();
      expect(typeof service.getSuggestedCourses).toBe('function');
      
      // Test with invalid course code
      const suggestions = service.getSuggestedCourses('XYZ');
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Authentication Token Management (Requirements 11.2, 11.3, 11.4, 11.5, 11.6, 11.7)', () => {
    it('should inherit getAuthToken method from parent', () => {
      expect(service.getAuthToken).toBeDefined();
      expect(typeof service.getAuthToken).toBe('function');
    });

    it('should inherit refreshTokenIfNeeded method from parent', () => {
      expect(service.refreshTokenIfNeeded).toBeDefined();
      expect(typeof service.refreshTokenIfNeeded).toBe('function');
    });

    it('should inherit testAuthentication method from parent', () => {
      expect(service.testAuthentication).toBeDefined();
      expect(typeof service.testAuthentication).toBe('function');
    });

    it('should have access to token management through parent methods', () => {
      // tokenManager is accessed through parent methods like getAuthToken()
      // rather than as a direct instance property
      expect(service.getAuthToken).toBeDefined();
      expect(service.refreshTokenIfNeeded).toBeDefined();
      expect(typeof service.getAuthToken).toBe('function');
      expect(typeof service.refreshTokenIfNeeded).toBe('function');
    });

    it('should inherit retryHandler from BaseAuthenticatedService', () => {
      expect(service.retryHandler).toBeDefined();
      expect(service.retryHandler).toBeTruthy();
    });

    it('should inherit logger from BaseAuthenticatedService', () => {
      expect(service.logger).toBeDefined();
      expect(service.logger).toBeTruthy();
    });

    it('should inherit errorHandler from BaseAuthenticatedService', () => {
      expect(service.errorHandler).toBeDefined();
      expect(service.errorHandler).toBeTruthy();
    });

    it('should inherit authenticatedGet method from BaseAuthenticatedService', () => {
      expect(service.authenticatedGet).toBeDefined();
      expect(typeof service.authenticatedGet).toBe('function');
    });

    it('should inherit authenticatedPost method from BaseAuthenticatedService', () => {
      expect(service.authenticatedPost).toBeDefined();
      expect(typeof service.authenticatedPost).toBe('function');
    });

    it('should inherit handleApiError method from BaseAuthenticatedService', () => {
      expect(service.handleApiError).toBeDefined();
      expect(typeof service.handleApiError).toBe('function');
    });

    it('should inherit getAuthStatus method from BaseAuthenticatedService', () => {
      expect(service.getAuthStatus).toBeDefined();
      expect(typeof service.getAuthStatus).toBe('function');
    });

    it('should inherit getHealthStatus method', () => {
      expect(service.getHealthStatus).toBeDefined();
      expect(typeof service.getHealthStatus).toBe('function');
    });
  });

  describe('Error Handling Methods (Requirements 10.3, 11.5)', () => {
    it('should inherit createCourseNotFoundError method', () => {
      expect(service.createCourseNotFoundError).toBeDefined();
      expect(typeof service.createCourseNotFoundError).toBe('function');
      
      const error = service.createCourseNotFoundError('XYZ');
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('XYZ');
      expect(error.noRetry).toBe(true);
      expect(error.errorType).toBe('COURSE_NOT_FOUND');
    });

    it('should inherit createNoScoresResponse method', () => {
      expect(service.createNoScoresResponse).toBeDefined();
      expect(typeof service.createNoScoresResponse).toBe('function');
      
      const response = service.createNoScoresResponse('ALE');
      expect(response).toHaveProperty('course');
      expect(response).toHaveProperty('entries');
      expect(response).toHaveProperty('isEmpty');
      expect(response.isEmpty).toBe(true);
      expect(response.entries).toEqual([]);
    });

    it('should inherit createApiUnavailableError method', () => {
      expect(service.createApiUnavailableError).toBeDefined();
      expect(typeof service.createApiUnavailableError).toBe('function');
      
      const originalError = new Error('Connection refused');
      const error = service.createApiUnavailableError(originalError, 'test_context');
      expect(error).toBeInstanceOf(Error);
      expect(error.errorType).toBe('API_UNAVAILABLE');
      expect(error.shouldRetry).toBe(true);
    });

    it('should inherit createTokenExpiredError method', () => {
      expect(service.createTokenExpiredError).toBeDefined();
      expect(typeof service.createTokenExpiredError).toBe('function');
      
      const originalError = new Error('Token expired');
      const error = service.createTokenExpiredError(originalError, 'test_context');
      expect(error).toBeInstanceOf(Error);
      expect(error.errorType).toBe('TOKEN_EXPIRED');
      expect(error.shouldRetry).toBe(true);
    });

    it('should inherit createInvalidCredentialsError method', () => {
      expect(service.createInvalidCredentialsError).toBeDefined();
      expect(typeof service.createInvalidCredentialsError).toBe('function');
      
      const originalError = new Error('Invalid credentials');
      const error = service.createInvalidCredentialsError(originalError, 'test_context');
      expect(error).toBeInstanceOf(Error);
      expect(error.errorType).toBe('INVALID_CREDENTIALS');
      expect(error.shouldRetry).toBe(false);
    });

    it('should inherit createRateLimitError method', () => {
      expect(service.createRateLimitError).toBeDefined();
      expect(typeof service.createRateLimitError).toBe('function');
      
      const originalError = new Error('Rate limited');
      originalError.response = { headers: { 'retry-after': '60' } };
      const error = service.createRateLimitError(originalError, 'test_context');
      expect(error).toBeInstanceOf(Error);
      expect(error.errorType).toBe('RATE_LIMITED');
      expect(error.shouldRetry).toBe(true);
    });

    it('should inherit handleAuthenticationError method', () => {
      expect(service.handleAuthenticationError).toBeDefined();
      expect(typeof service.handleAuthenticationError).toBe('function');
    });
  });

  describe('Display Formatting Methods (Requirements 10.4, 10.5)', () => {
    it('should inherit formatLeaderboardData method', () => {
      expect(service.formatLeaderboardData).toBeDefined();
      expect(typeof service.formatLeaderboardData).toBe('function');
    });

    it('should inherit truncateTextDisplay method', () => {
      expect(service.truncateTextDisplay).toBeDefined();
      expect(typeof service.truncateTextDisplay).toBe('function');
      
      // Test truncation
      const longText = 'a'.repeat(3000);
      const truncated = service.truncateTextDisplay(longText, 2000);
      expect(truncated.length).toBeLessThanOrEqual(2000);
    });
  });

  describe('Service Configuration (Requirements 11.1, 11.2, 11.3)', () => {
    it('should use the same API configuration as parent', () => {
      expect(service.apiClient).toBeDefined();
      expect(service.apiClient.defaults.baseURL).toBe(config.api.baseUrl);
      expect(service.apiClient.defaults.timeout).toBe(config.api.timeout);
    });

    it('should have proper service name for logging', () => {
      expect(service.serviceName).toBe('RaceLeaderboardService');
    });

    it('should inherit circuit breaker patterns', () => {
      expect(service.retryHandler).toBeDefined();
      expect(typeof service.retryHandler.executeWithRetry).toBe('function');
      expect(typeof service.retryHandler.shouldRetry).toBe('function');
    });
  });

  describe('Integration with Command Handler', () => {
    it('should be instantiable for use in command handler', () => {
      const newService = new RaceLeaderboardService();
      expect(newService).toBeInstanceOf(RaceLeaderboardService);
      expect(newService.serviceName).toBe('RaceLeaderboardService');
    });

    it('should have all methods required by command handler', () => {
      // Methods used by courserace.js command handler
      expect(service.getRaceLeaderboard).toBeDefined();
      expect(service.getAvailableCourses).toBeDefined();
      expect(service.formatLeaderboardData).toBeDefined();
      expect(service.createLeaderboardEmbed).toBeDefined();
      expect(service.createTextDisplay).toBeDefined();
      expect(service.getCourseNameFromCode).toBeDefined();
      expect(service.getCourseDifficulty).toBeDefined();
    });
  });
});
