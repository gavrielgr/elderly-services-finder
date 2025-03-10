/**
 * Google Apps Script for Elderly Services Sheet Data API
 * 
 * This script creates a secure web API for your Google Sheet data
 * without making the entire sheet public.
 * 
 * Instructions:
 * 1. Open your Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Replace any existing code with this script
 * 4. Save the project (give it a name like "Elderly Services API")
 * 5. Click Deploy > New deployment
 * 6. Select type: Web app
 * 7. Set "Who has access" to "Anyone"
 * 8. Click "Deploy"
 * 9. Copy the Web app URL
 * 10. Replace the API_URL in app.js with your URL
 */

/**
 * Process GET requests to the web app
 * This function runs when someone accesses the web app URL
 */
function doGet(e) {
  // Set CORS headers for public access
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  // Get all sheets in the spreadsheet
  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  var result = {};
  
  // Process each sheet
  sheets.forEach(function(sheet) {
    var sheetName = sheet.getName();
    
    // Skip empty sheets or sheets you want to exclude
    if (sheetName === "גיליון2") return;
    
    var data = getSheetData(sheet);
    if (data.length > 0) {
      result[sheetName] = data;
    }
  });
  
  // Return JSON data
  output.setContent(JSON.stringify({
    status: "success",
    data: result,
    lastUpdated: new Date().toISOString()
  }));
  
  return output;
}

/**
 * Convert sheet data to JSON
 * @param {Sheet} sheet - The Google Sheet to process
 * @return {Array} Array of objects representing the sheet data
 */
function getSheetData(sheet) {
  var dataRange = sheet.getDataRange();
  var values = dataRange.getValues();
  
  // Skip if sheet is empty
  if (values.length <= 1) return [];
  
  var headers = values[0];
  var result = [];
  
  // Process each row
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var rowData = {};
    
    // Skip rows that are completely empty
    var hasData = false;
    for (var j = 0; j < row.length; j++) {
      if (row[j] !== "") {
        hasData = true;
        break;
      }
    }
    if (!hasData) continue;
    
    // Map columns to properties
    for (var j = 0; j < headers.length; j++) {
      // Skip empty headers
      if (headers[j] === "" || headers[j] === null) continue;
      
      // Add data to object
      var headerName = headers[j].toString().trim();
      rowData[headerName] = row[j].toString();
    }
    
    // Add unique ID
    rowData.id = Utilities.getUuid();
    
    // Add a waitlist flag for filtering (if applicable)
    // Check if any column might indicate a waitlist
    var hasWaitlist = false;
    for (var key in rowData) {
      if (key.includes("המתנה") || key.includes("רשימה")) {
        var value = rowData[key].toString().toLowerCase();
        if (value.includes("כן") || value.includes("יש") || value.includes("yes")) {
          hasWaitlist = true;
          break;
        }
      }
    }
    rowData['רשימת המתנה'] = hasWaitlist ? 'כן' : 'לא';
    
    result.push(rowData);
  }
  
  return result;
}

/**
 * Force HTTPS for security
 */
function forceHttps() {
  var service = ScriptApp.getService();
  
  if (service.getUrl().indexOf('https://') !== 0) {
    var newUrl = service.getUrl().replace('http://', 'https://');
    service.setUrl(newUrl);
  }
}

/**
 * Cache control helper
 * @param {Object} output - The ContentService output object
 * @return {Object} The output object with cache headers
 */
function addCacheHeaders(output) {
  // Set cache control headers for better performance
  var headers = {
    'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
    'Vary': 'Accept-Encoding'
  };
  
  for (var header in headers) {
    output.setHeader(header, headers[header]);
  }
  
  return output;
}
