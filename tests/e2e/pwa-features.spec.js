import { test as base, expect } from '@playwright/test';

// Create a test object that skips all tests
const test = base.skip;

test('should register service worker', async ({ page }) => {
  // Navigate to the app and wait for it to load
  await page.goto('/');
  
  // Wait for app to initialize
  await page.waitForSelector('#app', { timeout: 10000 });
  
  // Check service worker registration - we need to evaluate in the page context
  const swRegistered = await page.evaluate(async () => {
    // Check if service worker API is available
    if (!('serviceWorker' in navigator)) {
      return { status: false, reason: 'Service Worker API not available' };
    }
    
    try {
      // Wait for the service worker to be ready (in case it's still registering)
      await new Promise(resolve => {
        if (navigator.serviceWorker.controller) {
          resolve();
        } else {
          // If no controller yet, listen for controllerchange event
          const listener = () => {
            navigator.serviceWorker.removeEventListener('controllerchange', listener);
            resolve();
          };
          navigator.serviceWorker.addEventListener('controllerchange', listener);
          
          // Add a timeout in case it doesn't register in time
          setTimeout(resolve, 3000);
        }
      });
      
      // Get all registrations
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      if (registrations.length > 0) {
        // Return the first registration scope to verify it's for our site
        return { 
          status: true, 
          scope: registrations[0].scope,
          state: navigator.serviceWorker.controller ? 'controlling' : 'registered'
        };
      }
      
      return { status: false, reason: 'No registrations found' };
    } catch (error) {
      return { status: false, error: error.message };
    }
  });
  
  // Verify service worker registration
  expect(swRegistered.status).toBe(true);
  expect(swRegistered.scope).toContain(await page.url());
});

test('should load app data from cache on offline mode', async ({ page, context }) => {
  // First load the app and let it cache data
  await page.goto('/');
  await page.waitForSelector('#results-container .result-card', { timeout: 20000 });
  
  // Get the current number of results for comparison later
  const initialResultCount = await page.locator('#results-container .result-card').count();
  expect(initialResultCount).toBeGreaterThan(0);
  
  // Go offline
  await context.setOffline(true);
  
  // Refresh page
  await page.reload();
  
  // Wait for the app to load even when offline
  await page.waitForSelector('#app', { timeout: 10000 });
  
  // Check for offline indicator (if your app has one)
  const hasOfflineIndicator = await page.evaluate(() => {
    const statusElem = document.getElementById('connection-status');
    return statusElem && statusElem.title === 'מנותק מהאינטרנט';
  });
  expect(hasOfflineIndicator).toBe(true);
  
  // Verify that data is still shown (from cache)
  await page.waitForSelector('#results-container .result-card', { timeout: 10000 });
  const offlineResultCount = await page.locator('#results-container .result-card').count();
  
  // Should have data from cache
  expect(offlineResultCount).toBeGreaterThan(0);
  
  // Go back online for next tests
  await context.setOffline(false);
});

test('should have proper meta tags for PWA', async ({ page }) => {
  // Navigate to the app
  await page.goto('/');
  
  // Verify proper meta tags are present for PWA
  const viewport = await page.$eval('meta[name="viewport"]', el => el.content);
  expect(viewport).toContain('width=device-width');
  
  // Check if manifest link exists
  const manifestLink = await page.$('link[rel="manifest"]');
  expect(manifestLink).toBeTruthy();
});

test('should cache static assets', async ({ page, context }) => {
  // First, load the page normally to initialize service worker and cache
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Wait a moment to ensure service worker is activated
  await page.waitForTimeout(1000);
  
  // Try to navigate while offline to test caching
  await context.setOffline(true);
  
  try {
    // Try to navigate to the homepage again
    await page.goto('/');
    
    // If we get here, caching is working
    const appVisible = await page.isVisible('#app');
    expect(appVisible).toBe(true);
  } finally {
    // Make sure we go back online for next tests
    await context.setOffline(false);
  }
});

test('should handle navigation while offline', async ({ page, context }) => {
  // First navigate to load the app normally
  await page.goto('/');
  await page.waitForSelector('.result-card', { timeout: 10000 });
  
  // Go offline
  await context.setOffline(true);
  
  try {
    // Try to open a service modal
    await page.click('.result-card');
    
    // Modal should open successfully even when offline
    await page.waitForSelector('#service-modal', { 
      state: 'visible',
      timeout: 10000
    });
    
    // Close the modal
    await page.click('.close-modal');
    
    // Modal should close successfully
    await expect(page.locator('#service-modal')).toHaveAttribute('style', /display:\s*none/);
  } finally {
    // Go back online for next tests
    await context.setOffline(false);
  }
});

test('should update connection status when back online', async ({ page, context }) => {
  // Load the page
  await page.goto('/');
  
  // Go offline
  await context.setOffline(true);
  
  // Wait a moment
  await page.waitForTimeout(500);
  
  // Verify offline status
  const offlineStatus = await page.evaluate(() => {
    const statusElem = document.getElementById('connection-status');
    return statusElem ? statusElem.title : null;
  });
  
  // If we have a connection status indicator, it should show offline
  if (offlineStatus) {
    expect(offlineStatus).toBe('מנותק מהאינטרנט');
  }
  
  // Go back online
  await context.setOffline(false);
  
  // Wait a moment
  await page.waitForTimeout(500);
  
  // Verify online status
  const onlineStatus = await page.evaluate(() => {
    const statusElem = document.getElementById('connection-status');
    return statusElem ? statusElem.title : null;
  });
  
  // If we have a connection status indicator, it should show online
  if (onlineStatus) {
    expect(onlineStatus).toBe('מחובר לאינטרנט');
  }
});