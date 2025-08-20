import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SearchManager } from '../../../js/ui/searchManager.js';
import { createMockElement, setupMockDom } from '../../helpers/dom-helper.js';

// Mock the debounce function
vi.mock('../../../js/utils/helpers.js', () => ({
  debounce: (fn) => fn // Replace debounce with a pass-through function for testing
}));

describe('SearchManager', () => {
  let searchManager;
  let mockUiManager;
  let mockElements;

  beforeEach(() => {
    // Setup mock elements
    mockElements = {
      'search-input': createMockElement('search-input', { value: '' }),
      'search-button': createMockElement('search-button'),
      'clear-search-button': createMockElement('clear-search-button')
    };

    // Setup mock DOM
    const mockDom = setupMockDom(mockElements);
    global.document = mockDom.document;
    global.window = mockDom.window;

    // Create mock UI manager
    mockUiManager = {
      resultsManager: {
        currentQuery: '',
        performSearch: vi.fn(),
        renderDefaultResults: vi.fn()
      },
      categoryManager: {
        activeCategory: null
      }
    };

    // Create SearchManager instance
    searchManager = new SearchManager(mockUiManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize event listeners', () => {
      expect(mockElements['search-input'].addEventListener).toHaveBeenCalled();
      expect(mockElements['search-button'].addEventListener).toHaveBeenCalled();
      expect(mockElements['clear-search-button'].addEventListener).toHaveBeenCalled();
    });
  });

  describe('search functionality', () => {
    it('should handle search when input changes', () => {
      // Set up search query
      mockElements['search-input'].value = 'בריאות';
      
      // Trigger input event handler
      const inputHandler = mockElements['search-input'].addEventListener.mock.calls.find(
        call => call[0] === 'input'
      )[1];
      
      inputHandler();
      
      expect(searchManager.currentQuery).toBe('בריאות');
      expect(mockUiManager.resultsManager.currentQuery).toBe('בריאות');
      expect(mockUiManager.resultsManager.performSearch).toHaveBeenCalled();
    });

    it('should handle search when search button is clicked', () => {
      // Set up search query
      mockElements['search-input'].value = 'בריאות';
      
      // Trigger button click handler
      const clickHandler = mockElements['search-button'].addEventListener.mock.calls.find(
        call => call[0] === 'click'
      )[1];
      
      clickHandler();
      
      expect(searchManager.currentQuery).toBe('בריאות');
      expect(mockUiManager.resultsManager.performSearch).toHaveBeenCalled();
    });

    it('should handle search when Enter key is pressed', () => {
      // Set up search query
      mockElements['search-input'].value = 'בריאות';
      
      // Trigger keyup handler with Enter key
      const keyupHandler = mockElements['search-input'].addEventListener.mock.calls.find(
        call => call[0] === 'keyup'
      )[1];
      
      keyupHandler({ key: 'Enter' });
      
      expect(searchManager.currentQuery).toBe('בריאות');
      expect(mockUiManager.resultsManager.performSearch).toHaveBeenCalled();
    });

    it('should ignore non-Enter key presses', () => {
      // Set up search query
      mockElements['search-input'].value = 'בריאות';
      
      // Trigger keyup handler with non-Enter key
      const keyupHandler = mockElements['search-input'].addEventListener.mock.calls.find(
        call => call[0] === 'keyup'
      )[1];
      
      keyupHandler({ key: 'a' });
      
      // The search should not be triggered by non-Enter keys
      expect(mockUiManager.resultsManager.performSearch).not.toHaveBeenCalled();
    });
  });

  describe('clear search functionality', () => {
    it('should clear search input and restore default results', () => {
      // Set up initial state
      mockElements['search-input'].value = 'בריאות';
      searchManager.currentQuery = 'בריאות';
      mockUiManager.resultsManager.currentQuery = 'בריאות';
      
      // Trigger clear button click handler
      const clearHandler = mockElements['clear-search-button'].addEventListener.mock.calls.find(
        call => call[0] === 'click'
      )[1];
      
      clearHandler();
      
      expect(mockElements['search-input'].value).toBe('');
      expect(searchManager.currentQuery).toBe('');
      expect(mockUiManager.resultsManager.currentQuery).toBe('');
      expect(mockUiManager.resultsManager.renderDefaultResults).toHaveBeenCalled();
      expect(mockElements['search-input'].focus).toHaveBeenCalled();
    });

    it('should keep active category results when clearing search', () => {
      // Set up initial state with active category
      mockElements['search-input'].value = 'בריאות';
      searchManager.currentQuery = 'בריאות';
      mockUiManager.resultsManager.currentQuery = 'בריאות';
      mockUiManager.categoryManager.activeCategory = 'health';
      
      // Trigger clear button click handler
      const clearHandler = mockElements['clear-search-button'].addEventListener.mock.calls.find(
        call => call[0] === 'click'
      )[1];
      
      clearHandler();
      
      expect(mockElements['search-input'].value).toBe('');
      expect(searchManager.currentQuery).toBe('');
      expect(mockUiManager.resultsManager.currentQuery).toBe('');
      // Should perform search with category filter only
      expect(mockUiManager.resultsManager.performSearch).toHaveBeenCalled();
      expect(mockUiManager.resultsManager.renderDefaultResults).not.toHaveBeenCalled();
    });

    it('should do nothing when input is already empty and no category is selected', () => {
      // Set up initial state with empty input
      mockElements['search-input'].value = '';
      searchManager.currentQuery = '';
      mockUiManager.resultsManager.currentQuery = '';
      mockUiManager.categoryManager.activeCategory = null;
      
      // Reset mocks to verify no calls
      mockUiManager.resultsManager.performSearch.mockClear();
      mockUiManager.resultsManager.renderDefaultResults.mockClear();
      
      // Trigger clear button click handler
      const clearHandler = mockElements['clear-search-button'].addEventListener.mock.calls.find(
        call => call[0] === 'click'
      )[1];
      
      clearHandler();
      
      // Verify no actions were taken
      expect(mockUiManager.resultsManager.performSearch).not.toHaveBeenCalled();
      expect(mockUiManager.resultsManager.renderDefaultResults).not.toHaveBeenCalled();
    });
  });

  describe('toggle clear button', () => {
    it('should show clear button when search query exists', () => {
      searchManager.currentQuery = 'בריאות';
      searchManager.toggleClearButton();
      
      expect(mockElements['clear-search-button'].classList.remove).toHaveBeenCalledWith('hidden');
    });
    
    it('should hide clear button when search query is empty', () => {
      searchManager.currentQuery = '';
      searchManager.toggleClearButton();
      
      expect(mockElements['clear-search-button'].classList.add).toHaveBeenCalledWith('hidden');
    });
  });
});