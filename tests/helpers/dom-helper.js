import { vi } from 'vitest'

/**
 * Create a mock DOM element with all necessary properties and methods
 * @param {String} id - ID for the element
 * @param {Object} overrides - Properties to override in the mock
 * @returns {Object} Mock DOM element
 */
export function createMockElement(id, overrides = {}) {
  return {
    id,
    innerHTML: '',
    textContent: '',
    value: '',
    style: {},
    title: '',
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      toggle: vi.fn(),
      contains: vi.fn().mockImplementation((className) => {
        return (this._classes || []).includes(className);
      }),
      _classes: []
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    appendChild: vi.fn(),
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(() => []),
    focus: vi.fn(),
    setAttribute: vi.fn(),
    getAttribute: vi.fn(),
    ...overrides
  };
}

/**
 * Setup mock DOM environment for UI tests
 * @param {Object} elements - Map of element IDs to their mock implementations
 * @returns {Object} Mock document object
 */
export function setupMockDom(elements = {}) {
  // Create default document with basic functions
  const document = {
    getElementById: vi.fn((id) => elements[id] || null),
    querySelector: vi.fn((selector) => null),
    querySelectorAll: vi.fn((selector) => []),
    createElement: vi.fn((tag) => createMockElement(`created-${tag}`)),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    documentElement: {
      setAttribute: vi.fn(),
      getAttribute: vi.fn().mockImplementation(() => 'light'),
      style: {}
    },
    body: {
      appendChild: vi.fn(),
      classList: {
        add: vi.fn(),
        remove: vi.fn()
      }
    }
  };

  // Create mock window
  const window = {
    localStorage: {
      getItem: vi.fn(),
      setItem: vi.fn()
    },
    location: { 
      origin: 'http://localhost:5173',
      href: 'http://localhost:5173/'
    },
    scrollTo: vi.fn(),
    scrollY: 0,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  };

  // Create mock navigator
  const navigator = {
    onLine: true,
    serviceWorker: {
      register: vi.fn(() => Promise.resolve())
    }
  };

  // Return the mock environment
  return { document, window, navigator };
}

/**
 * Creates an event with custom detail
 * @param {String} name - Event name
 * @param {Object} detail - Event detail
 * @returns {Event} Custom event
 */
export function createCustomEvent(name, detail) {
  return {
    type: name,
    detail
  };
}

/**
 * Simulate events like 'online' or 'offline'
 * @param {String} eventName - Name of the event to simulate
 */
export function simulateConnectionEvent(eventName) {
  const event = new Event(eventName);
  window.dispatchEvent(event);
}

/**
 * Create test data for UI testing
 */
export function createTestData() {
  return {
    services: [
      {
        id: 'service-1',
        name: 'מרכז רפואי הדסה',
        description: 'בית חולים מוביל בישראל',
        category: 'health',
        city: 'ירושלים'
      },
      {
        id: 'service-2',
        name: 'בית ספר לגיל הזהב',
        description: 'מרכז פעילות לגיל השלישי',
        category: 'education',
        city: 'תל אביב'
      }
    ],
    categories: [
      { id: 'health', name: 'בריאות', description: 'שירותי בריאות' },
      { id: 'education', name: 'חינוך', description: 'שירותי חינוך' }
    ],
    interestAreas: [
      { id: 'elderly-care', name: 'טיפול בקשישים' },
      { id: 'activities', name: 'פעילויות פנאי' }
    ],
    lastUpdated: new Date().toISOString()
  };
}