// Global variables
let subjectData = null;
let attendanceChart = null;

// Get parameters from URL
const urlParams = new URLSearchParams(window.location.search);
const subjectId = urlParams.get('id');
const subjectName = urlParams.get('name');

// Parse JWT token
function parseToken(token) {
    if (!token) return null;
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    try {
        return JSON.parse(window.atob(base64));
    } catch (e) {
        return null;
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', async function() {
    // Show loading state
    const mainContent = document.querySelector('.container');
    const loadingSpinner = document.createElement('div');
    loadingSpinner.className = 'text-center my-5';
    loadingSpinner.innerHTML = `
        <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2">Loading subject details...</p>
    `;
    mainContent.prepend(loadingSpinner);
    
    // Check for token
    const token = localStorage.getItem('token');
    if (!token) {
        showAlert('You need to log in to view this page', 'warning');
        setTimeout(() => {
            window.location.href = '../new_signin_signup/index.html';
        }, 2000);
        return;
    }
    
    // If no subject ID or name is provided, redirect to dashboard
    if (!subjectId && !subjectName) {
        showAlert('No subject specified', 'warning');
        setTimeout(() => {
            window.location.href = '../dashboard/dashboard.html';
        }, 2000);
        return;
    }
    
    try {
        // Fetch subject data
        await fetchSubjectData();
        
        // Remove loading spinner
        loadingSpinner.remove();
        
        // Only initialize components if data was loaded successfully
        if (subjectData) {
            // Initialize components
            initializeCircularProgress();
            initializeAttendanceChart('week');
            loadRecentActivities();
            
            // Set up event listeners
            document.querySelectorAll('.period-selector .btn').forEach(button => {
                button.addEventListener('click', function() {
                    const period = this.dataset.period;
                    document.querySelectorAll('.period-selector .btn').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    this.classList.add('active');
                    initializeAttendanceChart(period);
                });
            });
        }
    } catch (error) {
        // Remove loading spinner
        loadingSpinner.remove();
        
        console.error('Error initializing page:', error);
        showAlert('Error loading subject details. ' + error.message, 'danger');
    }
});

// Fetch subject data from API
async function fetchSubjectData() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No authentication token found');
        }
        
        // Initialize subject data variable
        let subjectDataResult = null;
        
        // Try API call first
        try {
            const response = await fetch('/api/v1/user/subjects', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                // If response is not ok, handle specific status codes
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    window.location.href = '../new_signin_signup/index.html';
                    return;
                }
                throw new Error(`API responded with status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.subjects || !Array.isArray(data.subjects)) {
                throw new Error('Invalid response format');
            }
            
            // Find the subject by ID or name
            if (subjectId) {
                subjectDataResult = data.subjects.find(s => s._id === subjectId);
            } else if (subjectName) {
                subjectDataResult = data.subjects.find(s => s.name === subjectName);
            }
        } catch (apiError) {
            console.error('API Error:', apiError);
            // Continue to fallback methods
        }
        
        // If API didn't work, try sessionStorage
        if (!subjectDataResult) {
            console.log('API lookup failed, trying sessionStorage...');
            try {
                const sessionSubject = sessionStorage.getItem('currentSubject');
                if (sessionSubject) {
                    const parsedSubject = JSON.parse(sessionSubject);
                    
                    // Verify it's the correct subject
                    if ((subjectId && parsedSubject._id === subjectId) || 
                        (subjectName && parsedSubject.name === subjectName)) {
                        console.log('Found matching subject in sessionStorage');
                        subjectDataResult = parsedSubject;
                    }
                }
            } catch (sessionError) {
                console.error('Session storage error:', sessionError);
            }
        }
        
        // If still no data, throw error
        if (!subjectDataResult) {
            throw new Error('Subject not found in API or session storage');
        }
        
        // Set the subject data
        subjectData = subjectDataResult;
        
        // Update UI with subject data
        document.getElementById('subjectTitle').textContent = subjectData.name;
        
        // Use available data or default to 0
        const totalClasses = subjectData.totalClass || 0;
        const presentCount = subjectData.totalPresent || 0;
        const absentCount = totalClasses - presentCount;
        const lateCount = 0; // Not tracking late status currently
        
        document.getElementById('totalClasses').textContent = totalClasses;
        document.getElementById('presentCount').textContent = presentCount;
        document.getElementById('absentCount').textContent = absentCount;
        document.getElementById('lateCount').textContent = lateCount;
        
        // Update hours (assuming 1 class = 1 hour)
        document.getElementById('totalHours').textContent = presentCount;
        
        // For now, set streak to 0 as it's not being tracked yet
        document.getElementById('currentStreak').textContent = 0;
        document.getElementById('bestStreak').textContent = 0;
        
        // Clear sessionStorage after successful load
        try {
            sessionStorage.removeItem('currentSubject');
        } catch (e) {
            console.error('Error clearing sessionStorage:', e);
        }
        
        return subjectData;
    } catch (error) {
        console.error('Error fetching subject data:', error);
        
        // Create an error container
        const container = document.querySelector('.container');
        if (container) {
            container.innerHTML = `
                <div class="error-container">
                    <i class="bi bi-exclamation-triangle-fill error-icon"></i>
                    <h3>Unable to Load Subject</h3>
                    <p>${error.message || 'There was a problem loading the subject details.'}</p>
                    <div class="d-flex gap-2 justify-content-center">
                        <a href="../dashboard/dashboard.html" class="btn btn-primary">Return to Dashboard</a>
                        <button onclick="location.reload()" class="btn btn-outline-secondary">Try Again</button>
                    </div>
                </div>
            `;
        }
        
        // Check if we should redirect based on error type
        if (error.message.includes('authentication') || error.message.includes('401')) {
            showAlert('Authentication failed. Redirecting to login...', 'danger');
            setTimeout(() => {
                localStorage.removeItem('token');
                window.location.href = '../new_signin_signup/index.html';
            }, 2000);
        }
        
        throw error;
    }
}

// Initialize circular progress indicator
function initializeCircularProgress() {
    if (!subjectData) return;
    
    const attendancePercentage = calculateAttendancePercentage();
    updateAttendanceCircle(attendancePercentage);
}

// Calculate attendance percentage
function calculateAttendancePercentage() {
    if (!subjectData || !subjectData.totalClass || subjectData.totalClass === 0) {
        return 0;
    }
    
    const presentCount = subjectData.totalPresent || 0;
    const percentage = (presentCount / subjectData.totalClass) * 100;
    return Math.round(percentage);
}

// Initialize attendance chart
function initializeAttendanceChart(period) {
    const ctx = document.getElementById('attendanceChart').getContext('2d');
    
    // Destroy previous chart if exists
    if (attendanceChart) {
        attendanceChart.destroy();
    }
    
    // Generate data based on selected period
    const { labels, presentData, absentData, lateData } = generateChartData(period);
    
    // Create chart
    attendanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Present',
                    data: presentData,
                    backgroundColor: '#28a745',
                    borderColor: '#28a745',
                    borderWidth: 1
                },
                {
                    label: 'Absent',
                    data: absentData,
                    backgroundColor: '#dc3545',
                    borderColor: '#dc3545',
                    borderWidth: 1
                },
                {
                    label: 'Late',
                    data: lateData,
                    backgroundColor: '#ffc107',
                    borderColor: '#ffc107',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    grid: {
                        display: false
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            }
        }
    });
}

// Generate chart data based on period
function generateChartData(period) {
    // This would normally come from API, using mock data for now
    let labels = [];
    let presentData = [];
    let absentData = [];
    let lateData = [];
    
    if (period === 'week') {
        labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        presentData = [1, 1, 0, 1, 0, 0, 0];
        absentData = [0, 0, 1, 0, 1, 0, 0];
        lateData = [0, 0, 0, 0, 0, 0, 0];
    } else if (period === 'month') {
        // Generate last 4 weeks
        labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
        presentData = [3, 2, 3, 2];
        absentData = [1, 2, 1, 2];
        lateData = [0, 0, 1, 0];
    } else if (period === 'semester') {
        // Generate months
        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        presentData = [12, 11, 13, 10, 12, 5];
        absentData = [2, 3, 1, 4, 2, 1];
        lateData = [1, 1, 0, 0, 1, 0];
    }
    
    return { labels, presentData, absentData, lateData };
}

// Load recent activities
function loadRecentActivities(activities = []) {
    const tableBody = document.querySelector('#recentActivityTable tbody');
    tableBody.innerHTML = '';
    
    if (!activities || activities.length === 0) {
        // Use mock data if no activities provided
        activities = getMockActivities();
    }
    
    if (activities.length === 0) {
        // Display empty state
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="3" class="text-center">
                <div class="empty-state">
                    <i class="fa fa-calendar-times"></i>
                    <p>No activity records found for this subject yet. Activities will appear here as you mark your attendance.</p>
                </div>
            </td>
        `;
        tableBody.appendChild(emptyRow);
        return;
    }
    
    // Sort activities by date, most recent first
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Add activities to table
    activities.forEach(activity => {
        const row = document.createElement('tr');
        
        // Format date
        const formattedDate = formatDate(activity.date);
        
        // Determine badge class based on status
        let badgeClass = '';
        switch(activity.status.toLowerCase()) {
            case 'present':
                badgeClass = 'badge-present';
                break;
            case 'absent':
                badgeClass = 'badge-absent';
                break;
            case 'late':
                badgeClass = 'badge-late';
                break;
            default:
                badgeClass = 'badge-secondary';
        }
        
        row.innerHTML = `
            <td class="activity-date">${formattedDate}</td>
            <td><span class="badge ${badgeClass}">${activity.status}</span></td>
            <td class="activity-notes">${activity.notes || '-'}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Get mock activities for demonstration
function getMockActivities() {
    const today = new Date();
    
    return [
        {
            date: new Date(today.getTime() - (86400000 * 0)),
            status: 'Present',
            notes: 'On time for class'
        },
        {
            date: new Date(today.getTime() - (86400000 * 2)),
            status: 'Late',
            notes: 'Arrived 10 minutes late'
        },
        {
            date: new Date(today.getTime() - (86400000 * 4)),
            status: 'Present',
            notes: 'Participated actively in class discussion'
        },
        {
            date: new Date(today.getTime() - (86400000 * 7)),
            status: 'Absent',
            notes: 'Sick leave'
        },
        {
            date: new Date(today.getTime() - (86400000 * 9)),
            status: 'Present',
            notes: 'Completed all exercises'
        }
    ];
}

// Format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Show alert message
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    alertContainer.appendChild(alert);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => {
            alert.remove();
        }, 150);
    }, 5000);
}

// Update attendance circle with percentage
function updateAttendanceCircle(percentage) {
    const circle = document.querySelector('.percentage-circle circle:nth-child(2)');
    const percentageValue = document.querySelector('.percentage-value');
    const circleContainer = document.querySelector('.percentage-circle-container');
    
    // Calculate the circle's circumference and the offset based on percentage
    const radius = circle.getAttribute('r');
    const circumference = 2 * Math.PI * radius;
    
    // Update the stroke dasharray and dashoffset
    circle.style.strokeDasharray = circumference;
    const offset = circumference - (percentage / 100) * circumference;
    circle.style.strokeDashoffset = offset;
    
    // Update the text value
    percentageValue.textContent = `${percentage}%`;
    
    // Remove existing attendance classes
    circleContainer.classList.remove('attendance-high', 'attendance-medium', 'attendance-low');
    
    // Add appropriate class based on percentage
    if (percentage >= 75) {
        circleContainer.classList.add('attendance-high');
    } else if (percentage >= 50) {
        circleContainer.classList.add('attendance-medium');
    } else {
        circleContainer.classList.add('attendance-low');
    }
}

// Display subject details
function displaySubjectDetails(subject) {
    if (!subject) return;
    
    // Set subject title
    document.getElementById('subjectTitle').textContent = subject.name;
    
    // Calculate attendance stats
    const presentCount = subject.attendanceData?.presentCount || 0;
    const absentCount = subject.attendanceData?.absentCount || 0;
    const lateCount = subject.attendanceData?.lateCount || 0;
    const totalClasses = presentCount + absentCount + lateCount;
    
    // Display attendance counts
    document.getElementById('presentCount').textContent = presentCount;
    document.getElementById('absentCount').textContent = absentCount;
    document.getElementById('lateCount').textContent = lateCount;
    document.getElementById('totalClasses').textContent = totalClasses;
    
    // Calculate total hours
    const totalHours = subject.totalHours || 0;
    document.getElementById('totalHours').textContent = totalHours;
    
    // Calculate and display attendance percentage
    let attendancePercentage = 0;
    if (totalClasses > 0) {
        attendancePercentage = Math.round((presentCount / totalClasses) * 100);
    }
    
    // Use our new function to update the attendance circle
    updateAttendanceCircle(attendancePercentage);
    
    // Update streak
    const currentStreak = subject.streak?.current || 0;
    const bestStreak = subject.streak?.best || 0;
    document.getElementById('currentStreak').textContent = currentStreak;
    document.getElementById('bestStreak').textContent = bestStreak;
    
    // Update streak progress bar percentage
    const streakProgress = bestStreak > 0 ? (currentStreak / bestStreak) * 100 : 0;
    document.querySelector('.streak-progress .progress-bar').style.width = `${streakProgress}%`;
    
    // Initialize attendance chart
    initializeAttendanceChart(subject.attendanceData?.history || []);
    
    // Load recent activities
    loadRecentActivities(subject.activities || []);
}
