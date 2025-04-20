// Netlify function to test Firebase connectivity
const handler = async (event) => {
  try {
    // Create HTML response with embedded test script
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Firebase Test (Netlify Function)</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; max-width: 800px; margin: 0 auto; }
    button { padding: 10px 16px; margin: 10px 0; background: #0070f3; color: white; border: none; border-radius: 4px; cursor: pointer; }
    button:hover { background: #0051a2; }
    pre { background: #f1f1f1; padding: 10px; border-radius: 4px; overflow-x: auto; }
    .result { margin-top: 20px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
    .success { color: green; }
    .error { color: red; }
  </style>
</head>
<body>
  <h1>Firebase Connectivity Test (Netlify Function)</h1>
  <p>This test runs from a Netlify function (/.netlify/functions/firebase-test)</p>
  
  <div>
    <button onclick="testFirebaseConfig()">Test Config API</button>
    <button onclick="loadScripts()">Load Firebase Scripts</button>
  </div>
  
  <div class="result" id="result">
    <p>Click a button to run a test</p>
  </div>
  
  <script>
    const resultDiv = document.getElementById('result');
    
    // Function to show test results
    function showResult(message, isError = false) {
      if (typeof message === 'object') {
        // Handle objects by creating formatted JSON
        resultDiv.innerHTML = '<pre class="' + (isError ? 'error' : 'success') + '">' + 
          JSON.stringify(message, null, 2) + '</pre>';
      } else {
        // Handle string messages
        resultDiv.innerHTML = '<p class="' + (isError ? 'error' : 'success') + '">' + message + '</p>';
      }
    }
    
    // Test accessing the Firebase config endpoint
    async function testFirebaseConfig() {
      try {
        showResult('Testing /api/config endpoint...');
        
        const response = await fetch('/api/config');
        if (!response.ok) {
          throw new Error('API returned: ' + response.status + ' ' + response.statusText);
        }
        
        const data = await response.json();
        
        // Redact sensitive information
        const sanitizedData = { ...data };
        if (sanitizedData.apiKey) sanitizedData.apiKey = '***REDACTED***';
        if (sanitizedData.appId) sanitizedData.appId = '***REDACTED***';
        if (sanitizedData.messagingSenderId) sanitizedData.messagingSenderId = '***REDACTED***';
        
        showResult({
          status: 'Firebase config endpoint working!',
          config: sanitizedData
        });
      } catch (error) {
        showResult('Error testing config: ' + error.message, true);
        console.error(error);
      }
    }
    
    // Load Firebase scripts dynamically
    function loadScripts() {
      try {
        showResult('Loading Firebase scripts...');
        
        // Function to load a script and report results
        function loadScript(url) {
          return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = () => resolve(url);
            script.onerror = () => reject(new Error('Failed to load ' + url));
            document.head.appendChild(script);
          });
        }
        
        // Load Firebase App
        loadScript('https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js')
          .then(() => {
            showResult('Firebase App script loaded successfully!');
            
            // Now try to load Firestore
            return loadScript('https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js');
          })
          .then(() => {
            showResult('Firestore script loaded successfully! See console for details.');
            console.log('Firebase scripts loaded. Testing global objects:');
            console.log('firebase:', typeof firebase !== 'undefined');
            
            if (typeof firebase !== 'undefined') {
              console.log('Firebase version:', firebase.SDK_VERSION);
            }
          })
          .catch(error => {
            showResult('Error loading scripts: ' + error.message, true);
            console.error(error);
          });
      } catch (error) {
        showResult('Error in script loader: ' + error.message, true);
        console.error(error);
      }
    }
  </script>
</body>
</html>
    `;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
      body: html,
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error', message: error.message }),
    };
  }
};

module.exports = { handler }; 