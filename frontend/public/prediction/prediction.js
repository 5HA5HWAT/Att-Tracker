document.addEventListener('DOMContentLoaded', function() {
  // API Base URL for the Python server
  const API_BASE_URL = 'http://localhost:5000';
  
  // Default user and subjects (fallback data)
  const DEFAULT_USER = {
    id: "1",
    username: "Shashwat",
    subjects: ["CN", "DBMS", "ATCD"]
  };
  
  const DEFAULT_SUBJECTS = [
    { name: "CN" },
    { name: "DBMS" },
    { name: "ATCD" }
  ];
  
  // User state (will be loaded from database)
  let currentUser = null;
  
  // DOM Elements
  const predictionForm = document.getElementById('predictionForm');
  const subjectSelect = document.getElementById('subjectSelect');
  const datePicker = document.getElementById('datePicker');
  const predictionResult = document.getElementById('predictionResult');
  const predictionContent = document.getElementById('predictionContent');
  const scheduleLink = document.getElementById('scheduleLink');
  const scheduleModal = new bootstrap.Modal(document.getElementById('scheduleModal'));
  const signOutBtn = document.getElementById('signOutBtn');
  const usernameElement = document.getElementById('username');
  
  // Set today as the default date
  datePicker.valueAsDate = new Date();
  
  // Immediately load fallback data first in case API fails
  currentUser = DEFAULT_USER;
  usernameElement.textContent = DEFAULT_USER.username;
  populateSubjectDropdown(DEFAULT_SUBJECTS);
  
  // Initialize the app - fetch user data from database
  initializeApp();
  
  // Event listeners
  predictionForm.addEventListener('submit', handlePrediction);
  scheduleLink.addEventListener('click', handleScheduleClick);
  signOutBtn.addEventListener('click', handleSignOut);
  
  // Initialize the application by fetching user data from database
  async function initializeApp() {
    try {
      // Try to fetch from API
      await fetchUserData();
      await fetchUserSubjects();
    } catch (error) {
      console.error('Error initializing app:', error);
      
      // Already using fallback data, just show a warning
      showWarning('Using offline mode with default data. Some features may be limited.');
    }
  }
  
  // Fetch user data from database API
  async function fetchUserData() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/user?id=1`);
      if (!response.ok) throw new Error('Failed to fetch user data');
      
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch user data');
      
      currentUser = data.user;
      console.log('Fetched user data from database:', currentUser);
      
      // Update UI with user data
      usernameElement.textContent = currentUser.username || 'Guest';
      
      return currentUser;
    } catch (error) {
      console.error('Error fetching user data:', error);
      
      // Already set fallback data, so just throw for general error handling
      throw error;
    }
  }
  
  // Fetch user's subjects from database API
  async function fetchUserSubjects() {
    try {
      // First try user-specific subjects endpoint
      const response = await fetch(`${API_BASE_URL}/api/user/subjects?id=1`);
      if (!response.ok) throw new Error('Failed to fetch user subjects');
      
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch user subjects');
      
      console.log('Fetched user subjects from database:', data.subjects);
      populateSubjectDropdown(data.subjects);
      
    } catch (error) {
      console.error('Error fetching user subjects:', error);
      
      // Already populated with default subjects, so just throw
      throw error;
    }
  }
  
  // Show error message to user
  function showError(message) {
    // Remove any existing alerts
    removeExistingAlerts();
    
    const alertElement = document.createElement('div');
    alertElement.className = 'alert alert-danger mb-3';
    alertElement.innerHTML = `
      <i class="bi bi-exclamation-triangle-fill me-2"></i>
      ${message}
    `;
    if (predictionForm && predictionForm.parentNode) {
      predictionForm.parentNode.insertBefore(alertElement, predictionForm);
    }
  }
  
  // Show warning message to user
  function showWarning(message) {
    // Remove any existing alerts
    removeExistingAlerts();
    
    const alertElement = document.createElement('div');
    alertElement.className = 'alert alert-warning mb-3';
    alertElement.innerHTML = `
      <i class="bi bi-exclamation-triangle-fill me-2"></i>
      ${message}
    `;
    if (predictionForm && predictionForm.parentNode) {
      predictionForm.parentNode.insertBefore(alertElement, predictionForm);
    }
  }
  
  // Remove any existing alerts
  function removeExistingAlerts() {
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
  }
  
  function populateSubjectDropdown(subjects) {
    console.log('Populating dropdown with subjects:', subjects);
    
    if (!subjectSelect) {
      console.error('Subject select element not found');
      return;
    }
    
    // Clear existing options except the placeholder
    while (subjectSelect.options.length > 1) {
      subjectSelect.remove(1);
    }
    
    // Add subject options
    subjects.forEach(subject => {
      // Skip empty subjects
      if (!subject) return;
      
      let subjectName;
      if (typeof subject === 'object') {
        subjectName = subject.name || subject.subject || subject.title || Object.values(subject)[0];
      } else {
        subjectName = subject;
      }
      
      // Skip if we couldn't extract a name
      if (!subjectName) return;
      
      console.log(`Adding subject to dropdown: ${subjectName}`);
      const option = document.createElement('option');
      option.value = subjectName;
      option.textContent = subjectName;
      subjectSelect.appendChild(option);
    });
  }
  
  function handlePrediction(event) {
    event.preventDefault();
    
    // Validate form
    if (!predictionForm.checkValidity()) {
      predictionForm.reportValidity();
      return;
    }
    
    // Get form values
    const subject = subjectSelect.value;
    const date = datePicker.value;
    
    // Additional validation
    if (!subject || subject === "" || subject === "Select a subject") {
      alert("Please select a subject");
      return;
    }
    
    console.log(`Making prediction request for ${subject} on ${date}`);
    
    // Show loading state
    predictionContent.innerHTML = `
      <div class="text-center py-3">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading prediction...</span>
        </div>
        <p class="mt-2 text-muted">Analyzing attendance patterns...</p>
      </div>
    `;
    predictionResult.classList.remove('d-none');
    
    // Prepare request data - make sure values are strings and properly formatted
    const requestData = {
      subject: String(subject).trim(),
      date: String(date),
      userId: currentUser ? currentUser.id : '1'
    };
    
    console.log("Sending prediction request:", requestData);
    
    // Send prediction request to API
    fetch(`${API_BASE_URL}/api/prediction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestData)
    })
    .then(response => {
      console.log("API Response status:", response.status);
      return response.json().then(data => {
        if (!response.ok) {
          console.error("API Error Response:", data);
          throw new Error(data.error || 'Failed to get prediction');
        }
        return data;
      });
    })
    .then(data => {
      console.log("API Success Response:", data);
      displayPredictionResult(data, subject, date);
    })
    .catch(error => {
      console.error('Error getting prediction:', error);
      
      // If API fails, generate a client-side prediction
      const simulatedPrediction = generateFallbackPrediction(subject, date);
      
      // Show a warning instead of error
      showWarning("Could not connect to prediction server. Using estimated prediction.");
      
      // Still display the prediction result
      displayPredictionResult(simulatedPrediction, subject, date);
    });
  }
  
  // Generate a fallback prediction when API is unavailable
  function generateFallbackPrediction(subject, date) {
    // Parse the date
    const dateObj = new Date(date);
    const day = dateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Simple prediction logic based on day and subject
    let likelihood = 0.75; // Default likelihood
    
    // Technical subjects more likely on weekdays
    if (subject === "CN" || subject === "DBMS" || subject === "ATCD") {
      likelihood = day >= 1 && day <= 5 ? 0.85 : 0.45; // Higher on weekdays
    } else {
      likelihood = day >= 1 && day <= 5 ? 0.7 : 0.6;
    }
    
    // Add some randomness
    const random = Math.random();
    const prediction = random < likelihood ? 1 : 0;
    
    return {
      prediction: prediction,
      confidence: Math.round(likelihood * 100) / 100,
      message: prediction === 1 ? "Likely to attend" : "Likely to be absent"
    };
  }
  
  function displayPredictionResult(prediction, subject, date) {
    // Format date for display
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Build the result HTML based on prediction
    const resultClass = prediction.prediction === 1 ? 'prediction-success' : 'prediction-warning';
    const iconClass = prediction.prediction === 1 ? 'bi-check-circle-fill text-success' : 'bi-exclamation-triangle-fill text-warning';
    
    predictionContent.innerHTML = `
      <div class="${resultClass}">
        <div class="prediction-info">
          <i class="bi ${iconClass}"></i>
          <div>
            <h5 class="mb-0">${prediction.message}</h5>
            <p class="mb-0">Subject: <strong>${subject}</strong> on ${formattedDate}</p>
          </div>
        </div>
        <div class="prediction-confidence">
          Confidence: ${(prediction.confidence * 100).toFixed(0)}%
        </div>
      </div>
    `;
    
    // Ensure result card is visible
    predictionResult.classList.remove('d-none');
  }
  
  function handleScheduleClick(event) {
    event.preventDefault();
    scheduleModal.show();
    
    // Load schedule content
    document.getElementById('scheduleLoading').classList.remove('d-none');
    document.getElementById('scheduleContent').classList.add('d-none');
    
    // Simulate loading (in a real app, fetch from backend)
    setTimeout(() => {
      document.getElementById('scheduleLoading').classList.add('d-none');
      
      // Get schedules from API or fallback to empty
      const schedules = {}; // In a real app, fetch this from an API
      
      // Build schedule HTML
      const scheduleContent = document.getElementById('scheduleContent');
      
      if (Object.keys(schedules).length === 0) {
        scheduleContent.innerHTML = `
          <div class="text-center py-3">
            <p class="mb-0 text-muted">No schedule data found. Please create a schedule.</p>
          </div>
        `;
      } else {
        const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        let scheduleHtml = '<div class="row">';
        
        daysOfWeek.forEach(day => {
          const daySchedule = schedules[day.toLowerCase()] || [];
          
          scheduleHtml += `
            <div class="col-md-6 mb-3">
              <div class="card h-100">
                <div class="card-header bg-light">
                  <h6 class="mb-0">${day}</h6>
                </div>
                <div class="card-body">
          `;
          
          if (daySchedule.length === 0) {
            scheduleHtml += `<p class="text-muted mb-0">No classes scheduled</p>`;
          } else {
            scheduleHtml += `<ul class="list-group list-group-flush">`;
            daySchedule.forEach(item => {
              scheduleHtml += `
                <li class="list-group-item border-0 px-0">
                  <strong>${item.subject}</strong> - ${item.time}
                </li>
              `;
            });
            scheduleHtml += `</ul>`;
          }
          
          scheduleHtml += `
                </div>
              </div>
            </div>
          `;
        });
        
        scheduleHtml += '</div>';
        scheduleContent.innerHTML = scheduleHtml;
      }
      
      scheduleContent.classList.remove('d-none');
    }, 1000);
  }
  
  function handleSignOut() {
    // In a real app, make API call to log out
    // For now, just redirect to login page
    window.location.href = '../login/index.html';
  }
});