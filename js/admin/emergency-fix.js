// Emergency fix script to manually populate the service form
// Add this to your admin.html or paste in the browser console

function emergencyFormFix() {
  console.log("Running emergency form fix...");
  
  // Hard-coded service data from your JSON
  const serviceData = {
    "id": "a4476cce-25e2-4bad-bcff-54f44147a430",
    "name": "20-80",
    "description": "אפליקציית 20-80 תאפשר לכם לסייע לגיל השלישי ליד הבית או המשרד, בכל זמן שתבחרו.",
    "contact": {
      "phone": [],
      "addresses": [],
      "email": [{"address":"office@2080.org.il","description":""}],
      "website": [{"url":"https://www.2080.org.il/","description":""}]
    },
    "categoryId": "elderly-services",
    "category": "elderly-services",
    "metadata": {
      "notes": "העמותה מייצרת חיבורים בין דוריים בין צעירים לוותיקים באמצעות פלטפורמות טכנולוגיות מתקדמות. העמותה מאמינה בחיבורים הדדיים, בהם שני הצדדים מקבלים ערך אמיתי מהמפגש, חיבורים בהם הצעיר מביא מכוחו ומרצו עבור האזרח הותיק והאזרח הותיק ממביא מניסיון חייו העצום ערך אמיתי לצעיר",
      "updated": "2025-04-20T13:56:38.535Z"
    }
  };
  
  // Function to safely set form field values
  function setField(id, value) {
    const field = document.getElementById(id);
    if (field) {
      field.value = value || '';
      console.log(`Set ${id} = "${value}"`);
      return true;
    } else {
      console.warn(`Field ${id} not found`);
      return false;
    }
  }
  
  // Actually fill the form fields
  setField('serviceId', serviceData.id);
  setField('serviceName', serviceData.name);
  setField('serviceDescription', serviceData.description);
  
  // Handle category (try both possible field names)
  const categoryValue = serviceData.category || serviceData.categoryId || '';
  let categorySet = setField('serviceCategory', categoryValue);
  if (!categorySet) categorySet = setField('category', categoryValue);
  
  // List all form fields for debugging
  console.log('Form fields found:');
  const formFields = document.querySelectorAll('form input, form textarea, form select');
  formFields.forEach(field => {
    console.log(`Field: ${field.id || field.name || 'unnamed'}, Type: ${field.type}`);
  });
  
  // Email - find container and add fields
  const emailsContainer = document.getElementById('emailsContainer');
  if (emailsContainer) {
    emailsContainer.innerHTML = ''; // Clear existing
    
    if (serviceData.contact && serviceData.contact.email && serviceData.contact.email.length > 0) {
      serviceData.contact.email.forEach(email => {
        // Use the global addEmailEntry function if available
        if (typeof window.addEmailEntry === 'function') {
          window.addEmailEntry(email.address, email.description);
          console.log('Added email:', email.address);
        } else {
          // Manual email entry creation
          const entryDiv = document.createElement('div');
          entryDiv.className = 'input-group mb-2';
          entryDiv.innerHTML = `
            <input type="email" class="form-control email-address" value="${email.address}" placeholder="כתובת אימייל">
            <input type="text" class="form-control email-description" value="${email.description || ''}" placeholder="תיאור (לא חובה)">
            <button type="button" class="btn btn-outline-danger">
              <i class="bi bi-trash"></i>
            </button>
          `;
          emailsContainer.appendChild(entryDiv);
          console.log('Manually added email:', email.address);
        }
      });
    } else {
      console.log('No emails to add');
    }
  } else {
    console.warn('emailsContainer not found');
  }
  
  // Website - find container and add fields
  const websitesContainer = document.getElementById('websitesContainer');
  if (websitesContainer) {
    websitesContainer.innerHTML = ''; // Clear existing
    
    if (serviceData.contact && serviceData.contact.website && serviceData.contact.website.length > 0) {
      serviceData.contact.website.forEach(website => {
        // Use the global addWebsiteEntry function if available
        if (typeof window.addWebsiteEntry === 'function') {
          window.addWebsiteEntry(website.url, website.description);
          console.log('Added website:', website.url);
        } else {
          // Manual website entry creation
          const entryDiv = document.createElement('div');
          entryDiv.className = 'input-group mb-2';
          entryDiv.innerHTML = `
            <input type="url" class="form-control website-url" value="${website.url}" placeholder="כתובת אתר">
            <input type="text" class="form-control website-description" value="${website.description || ''}" placeholder="תיאור (לא חובה)">
            <button type="button" class="btn btn-outline-danger">
              <i class="bi bi-trash"></i>
            </button>
          `;
          websitesContainer.appendChild(entryDiv);
          console.log('Manually added website:', website.url);
        }
      });
    } else {
      console.log('No websites to add');
    }
  } else {
    console.warn('websitesContainer not found');
  }
  
  // Phone - find container and add empty field if needed
  const phonesContainer = document.getElementById('phonesContainer');
  if (phonesContainer) {
    if (phonesContainer.children.length === 0) {
      if (typeof window.addPhoneEntry === 'function') {
        window.addPhoneEntry();
        console.log('Added empty phone entry');
      }
    }
  } else {
    console.warn('phonesContainer not found');
  }
  
  console.log("Emergency form fix complete");
}

// Run immediately
emergencyFormFix(); 