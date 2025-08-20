# Testing Documentation

## Overview

This document provides information about the testing strategy and approach used in the Elderly Services Finder project. The testing framework is designed to validate functionality across different components, including core services, UI components, API endpoints, and PWA features.

## Test Structure

The tests are organized into the following categories:

### 1. Unit Tests (`/tests/unit/`)
- **Services**: Tests for core services like DataService and StorageService
- **UI Components**: Tests for UI managers (UIManager, SearchManager, etc.)
- **Utilities**: Tests for helper functions and utilities

### 2. Integration Tests (`/tests/integration/`)
- **API Endpoints**: Tests for Express server endpoints
- **Firebase Integration**: Tests for Firestore interactions

### 3. End-to-End Tests (`/tests/e2e/`)
- **Search Flow**: Tests for search functionality and user interactions
- **PWA Features**: Tests for service worker, offline capabilities, and PWA features

## Testing Technologies

- **Vitest**: Main testing framework for unit and integration tests
- **Happy-DOM**: DOM environment for UI component testing
- **Playwright**: End-to-end testing framework
- **Supertest**: HTTP assertions for API testing
- **Fake-IndexedDB**: Mock implementation for IndexedDB testing

## Running Tests

### Unit and Integration Tests
```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage
```

### End-to-End Tests
**Important**: The application must be running to execute E2E tests.

```bash
# Start the application
npm run dev

# In a separate terminal, run E2E tests
npm run test:e2e
```

## Test Files

### Key Test Files

- **Unit Tests**
  - `/tests/unit/services/dataService.test.js`: Tests for main data service
  - `/tests/unit/services/storageService.test.js`: Tests for IndexedDB storage
  - `/tests/unit/ui/uiManager.test.js`: Tests for main UI management
  - `/tests/unit/ui/searchManager.test.js`: Tests for search functionality
  - `/tests/unit/ui/categoryManager.test.js`: Tests for category handling
  - `/tests/unit/ui/resultsManager.test.js`: Tests for search results display
  - `/tests/unit/ui/modalManager.test.js`: Tests for modal dialog functionality

- **Integration Tests**
  - `/tests/integration/api-endpoints.test.js`: Tests for API endpoints

- **E2E Tests**
  - `/tests/e2e/search-flow.spec.js`: User journey tests for search functionality
  - `/tests/e2e/pwa-features.spec.js`: Tests for PWA features

### Helper Files

- `/tests/helpers/dom-helper.js`: Utilities for DOM testing
- `/tests/helpers/firebase-helper.js`: Firebase emulator setup for testing
- `/tests/helpers/test-server.js`: Express server setup for API testing
- `/tests/__mocks__/data-service.js`: Mock implementation of DataService

## Testing Approaches

### DOM Testing
UI component tests use a combination of:
- Mock DOM elements with Happy-DOM
- Event simulation
- State verification

### Firebase Testing
Firebase tests can run in two modes:
- Using Firebase emulators (for integration tests)
- Using mock implementations (for unit tests)

### API Testing
API tests use Supertest to:
- Make HTTP requests to endpoints
- Verify response status codes
- Validate response content

### PWA Testing
PWA tests use Playwright to:
- Test service worker registration
- Verify offline functionality
- Check caching behavior
- Test installation flow

## Hebrew/RTL Testing

The test suite includes specific tests for:
- Hebrew text rendering
- RTL layout validation
- Mixed language content handling
- Hebrew search functionality

## CI/CD Integration

Tests are integrated with the CI/CD pipeline:
- Unit and integration tests run on all pull requests
- E2E tests run on main branch changes
- Test coverage reports are generated

## Adding New Tests

When adding new tests:
1. Follow the existing naming convention
2. Place in the appropriate directory based on test type
3. Use the existing helpers and utilities
4. For UI tests, use the DOM helper utilities
5. For E2E tests, ensure they are properly skipped during regular test runs

## Common Issues and Solutions

- **Firebase Emulator Connection**: Ensure emulators are running before tests
- **ESM URL Imports**: Use the mock implementations for services with URL imports
- **E2E Test Failures**: Remember to start the application before running E2E tests
- **Slow Tests**: Consider using more focused test selectors
- **IndexedDB Test Isolation**: Clear IndexedDB between tests