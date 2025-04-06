# Repository Pattern

This directory implements the Repository pattern for data access in the application.

## Overview

The Repository pattern provides a clean separation between the data layer and the business logic of the application. It allows us to:

1. Abstract away data source details (Firestore, local storage, etc.)
2. Provide a consistent interface for data operations
3. Simplify testing by allowing for easy mocking of data access
4. Easily swap implementations for different environments

## Structure

- `interfaces/`: Contains the interface definitions for each repository type
- `firebase/`: Contains Firebase-specific implementations of the repository interfaces
- `RepositoryFactory.js`: Factory that provides repository instances
- `init.js`: Initialization module for setting up repositories

## Usage

### Basic Usage

```javascript
import { initializeRepositories, repositoryFactory } from './repositories/init.js';

// Initialize repositories
await initializeRepositories();

// Get a repository instance
const serviceRepo = repositoryFactory.getServiceRepository();
const categoryRepo = repositoryFactory.getCategoryRepository();

// Use repositories
const services = await serviceRepo.getAll();
const categories = await categoryRepo.getAll();
```

### Integration with Services

You can pass repositories to services:

```javascript
import { DataService } from './services/DataService.js';

const dataService = new DataService(
    repositoryFactory.getServiceRepository(),
    repositoryFactory.getCategoryRepository()
);
```

## Extending

### Adding New Repository Types

1. Create a new interface in `interfaces/`
2. Implement the interface in `firebase/`
3. Update the provider in `FirebaseRepositoryProvider.js`
4. Add a convenience method in `RepositoryFactory.js`

### Creating Alternative Implementations

To create a mock implementation for testing:

1. Create a new directory, e.g., `mock/`
2. Implement the interfaces with mock data
3. Create a mock provider
4. Update the initialization to use the mock provider

## Benefits

- **Decoupling**: Business logic is separated from data access
- **Testability**: Repositories can be mocked for testing
- **Caching**: Caching strategies can be implemented at the repository level
- **Consistency**: All data access follows the same patterns
- **Flexibility**: New data sources can be added without changing the business logic 