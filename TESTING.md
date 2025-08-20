# Testing Documentation for Elderly Services Finder

This document outlines the comprehensive testing strategy implemented for the Elderly Services Finder application. It covers all testing phases from unit tests to end-to-end testing.

## Testing Philosophy

The testing strategy follows these core principles:
- **Thorough Coverage**: Test all critical components and user flows
- **Isolation**: Test components in isolation with proper mocks
- **Realistic Simulation**: Mimic real-world usage in E2E tests
- **Performance**: Tests are designed to run efficiently
- **Maintainability**: Tests are modular and well-documented

## Testing Architecture

The testing architecture consists of several layers:

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test interactions between components
3. **API Tests**: Verify server endpoints and responses
4. **End-to-End Tests**: Test complete user flows in a browser environment
5. **PWA Tests**: Verify PWA-specific features like offline support

## Test Tools

- **Vitest**: Unit and integration testing
- **Happy DOM**: DOM testing environment
- **Playwright**: End-to-end testing
- **Fake IndexedDB**: Mock IndexedDB for storage tests

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (during development)
npm run test:watch

# Run tests once (for CI/CD)
npm run test:run

# Run tests with coverage
npm run test:coverage

# Run E2E tests (requires app to be running)
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in debug mode
npm run test:e2e:debug
```

## Test Structure

```
tests/
├── helpers/              # Test helper utilities
│   └── dom-helper.js     # DOM testing utilities
├── unit/                 # Unit tests
│   ├── services/         # Tests for service modules
│   │   ├── dataService.test.js
│   │   └── storageService.test.js
│   └── ui/              # Tests for UI components
│       ├── uiManager.test.js
│       ├── searchManager.test.js
│       ├── categoryManager.test.js
│       ├── resultsManager.test.js
│       └── modalManager.test.js
├── integration/          # Integration tests
│   └── api-endpoints.test.js
├── e2e/                  # End-to-end tests
│   ├── search-flow.spec.js
│   └── pwa-features.spec.js
└── README.md             # Testing documentation
```

## Testing Approaches

### Unit Testing

- **Service Tests**: Verify data processing, storage, and retrieval
- **UI Component Tests**: Test UI managers and components in isolation
- **Mocking**: External dependencies are mocked with Vi
- **Edge Cases**: Tests cover success paths and error scenarios

### Integration Testing

- **API Integration**: Test Express server endpoints
- **Server-Client Integration**: Verify server and client components work together
- **Mock API Responses**: Use mock data for consistent testing

### End-to-End Testing

- **User Flows**: Test complete user interactions
- **PWA Features**: Test offline functionality, service worker, and caching
- **Cross-browser Testing**: Test in multiple browsers with Playwright
- **Responsive Testing**: Test on different screen sizes

## Important Notes on E2E Tests

The E2E tests are configured to be skipped during regular test runs because:
1. They require the application to be running
2. They need a populated database with test data

To run E2E tests properly:
1. Start the development server: `npm run dev`
2. Run E2E tests separately: `npm run test:e2e`

## CI/CD Integration

Tests are integrated with GitHub Actions workflows:
- Tests run automatically on pull requests and pushes to the main branch
- Tests run before deployment
- Test failures prevent deployment

## Common Testing Issues and Fixes

### 1. DOM Testing Issues

- **Solved by**: Creating detailed mock implementations in `dom-helper.js`
- **Example**: Mock elements with functional classList implementations

### 2. Firebase/Firestore Mocking

- **Solved by**: Creating simplified mock versions of Firebase modules
- **Example**: Mock Firebase initialization and data retrieval

### 3. Environment-Dependent Tests

- **Solved by**: Simplifying tests to focus on core functionality
- **Example**: Testing sort functionality without relying on locale-specific behavior

### 4. Service Worker Tests

- **Solved by**: Using Playwright's ability to control browser contexts
- **Example**: Testing offline functionality with `context.setOffline(true)`

## Continuous Improvement

The testing strategy is continuously improved by:
- Monitoring test coverage
- Identifying flaky tests
- Refactoring tests for better performance
- Adding new tests for new features