# Testing Guide for Elderly Services Finder

## Quick Start

To run the tests for this project, use the following commands:

```bash
# Install dependencies first
npm install

# Run tests in watch mode
npm run test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage
```

## Test Types

The project includes multiple types of tests:

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test component interactions
3. **End-to-End Tests**: Test complete user flows

## E2E Tests

End-to-End tests require the application to be running:

```bash
# First terminal: Start the application
npm run dev

# Second terminal: Run E2E tests
npm run test:e2e
```

## Test Documentation

For more detailed information about the testing approach, see:

- [TESTING.md](./TESTING.md) - Complete testing documentation
- [FIXES.md](./FIXES.md) - Documentation of fixes made to tests
- [SUMMARY.md](./SUMMARY.md) - Summary of test implementation

## Test Directory Structure

```
tests/
├── e2e/                # End-to-End tests with Playwright
│   ├── pwa-features.spec.js
│   └── search-flow.spec.js
│
├── fixtures/           # Test data
│   └── seed-data.js
│
├── helpers/            # Test helper functions
│   ├── dom-helper.js
│   ├── firebase-helper.js
│   └── test-server.js
│
├── __mocks__/          # Mock implementations
│   └── data-service.js
│
├── integration/        # Integration tests
│   └── api-endpoints.test.js
│
├── unit/               # Unit tests
│   ├── firebase.test.js
│   ├── services/
│   │   ├── dataService.test.js
│   │   ├── dataService.simplified.test.js
│   │   └── storageService.test.js
│   ├── ui/
│   │   ├── categoryManager.test.js
│   │   ├── modalManager.test.js
│   │   ├── resultsManager.test.js
│   │   ├── searchManager.test.js
│   │   └── uiManager.test.js
│   └── utils/
│       └── sample.test.js
│
├── FIXES.md            # Test fixes documentation
├── README.md           # This file
├── SUMMARY.md          # Implementation summary
├── TESTING.md          # Testing approach documentation
└── setup.js            # Test setup file
```

## CI/CD Integration

Tests are integrated with GitHub Actions workflows:

- Tests run automatically on pull requests
- Tests run on pushes to main branch
- Coverage reports are generated

## Special Considerations

### Firebase Tests

Firebase tests require Firebase Emulators to be running when the `FIREBASE_EMULATOR` environment variable is set to `true`. Otherwise, these tests are skipped.

### Hebrew/RTL Tests

Some tests specifically verify Hebrew text handling and RTL (Right-to-Left) layout. These are important for ensuring the application works correctly with Hebrew content.

### PWA Tests

PWA tests verify service worker registration, offline functionality, and caching behavior. These tests are skipped by default since they require a running application.

## Adding New Tests

When adding new tests:

1. Follow the naming conventions
2. Place in the appropriate directory
3. Use existing helper functions
4. Run the tests to verify they pass