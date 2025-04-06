import { initializeRepositories, repositoryFactory } from '../repositories/init.js';

/**
 * Repository Pattern Demo
 * This demonstrates how to use the new repository pattern
 */
export async function demoRepositories() {
    try {
        // Initialize repositories
        await initializeRepositories();
        
        // Get repositories
        const serviceRepo = repositoryFactory.getServiceRepository();
        const categoryRepo = repositoryFactory.getCategoryRepository();
        
        console.log('Repository demo starting...');
        
        // Demo: Get all categories
        console.log('Fetching all categories...');
        const categories = await categoryRepo.getAll();
        console.log(`Found ${categories.length} categories`);
        
        // Demo: Get all services
        console.log('Fetching all services...');
        const services = await serviceRepo.getAll();
        console.log(`Found ${services.length} services`);
        
        // Demo: Get services by category
        if (categories.length > 0) {
            const categoryId = categories[0].id;
            console.log(`Fetching services for category: ${categories[0].name} (${categoryId})`);
            const categoryServices = await serviceRepo.getByCategory(categoryId);
            console.log(`Found ${categoryServices.length} services in this category`);
        }
        
        // Demo: Search services
        const searchQuery = 'שירות';
        console.log(`Searching for services with query: ${searchQuery}`);
        const searchResults = await serviceRepo.search(searchQuery);
        console.log(`Found ${searchResults.length} services matching query`);
        
        console.log('Repository demo completed successfully');
    } catch (error) {
        console.error('Repository demo failed:', error);
    }
} 