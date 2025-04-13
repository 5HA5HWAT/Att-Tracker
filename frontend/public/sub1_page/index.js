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
            
            // Sync with database to check for any new attendance records
            await syncAttendanceWithDatabase();
            
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
            
            // If we found the subject, fetch its attendance records
            if (subjectDataResult) {
                try {
                    const attendanceResponse = await fetch(`/api/v1/user/attendance/${subjectDataResult._id}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (attendanceResponse.ok) {
                        const attendanceData = await attendanceResponse.json();
                        if (attendanceData && attendanceData.attendance) {
                            // Add attendance records to the subject data
                            subjectDataResult.attendance = attendanceData.attendance;
                            console.log('Fetched attendance data:', attendanceData.attendance);
                        }
                    } else {
                        console.warn('Failed to fetch attendance records');
                    }
                } catch (attendanceError) {
                    console.error('Error fetching attendance:', attendanceError);
                }
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
        
        document.getElementById('totalClasses').textContent = totalClasses;
        document.getElementById('presentCount').textContent = presentCount;
        document.getElementById('absentCount').textContent = absentCount;
        
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
    const { labels, presentData, absentData } = generateChartData(period);
    
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
    // Default empty datasets
    let labels = [];
    let presentData = [];
    let absentData = [];
    
    // Get actual dates and attendance from subject data if available
    if (subjectData && subjectData.attendance && Array.isArray(subjectData.attendance)) {
        const attendanceRecords = subjectData.attendance;
        
        if (period === 'week') {
            // Generate current week days (Monday to Sunday)
            const today = new Date();
            const currentDay = today.getDay(); // 0 (Sunday) to 6 (Saturday)
            const startDate = new Date(today);
            // Adjust to previous Monday (or today if it's Monday)
            startDate.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
            
            // Generate the 7 days of the week
            for (let i = 0; i < 7; i++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + i);
                
                // Format date as short day name (Mon, Tue, etc.)
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                labels.push(dayName);
                
                // Format date as ISO string to match with records
                const dateStr = date.toISOString().split('T')[0];
                
                // Look for attendance record for this date
                const record = attendanceRecords.find(r => {
                    const recordDate = new Date(r.date).toISOString().split('T')[0];
                    return recordDate === dateStr;
                });
                
                // Set attendance status
                if (record) {
                    if (record.status === 'present') {
                        presentData.push(1);
                        absentData.push(0);
                    } else if (record.status === 'absent') {
                        presentData.push(0);
                        absentData.push(1);
                    } else {
                        presentData.push(0);
                        absentData.push(0);
                    }
                } else {
                    // No record for this date
                    presentData.push(0);
                    absentData.push(0);
                }
            }
        } else if (period === 'month') {
            // Generate last 4 weeks
            labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
            
            // Group attendance by week
            const now = new Date();
            const fourWeeksAgo = new Date(now);
            fourWeeksAgo.setDate(now.getDate() - 28);
            
            // Initialize counters for each week
            const weeklyData = [
                { present: 0, absent: 0 },
                { present: 0, absent: 0 },
                { present: 0, absent: 0 },
                { present: 0, absent: 0 }
            ];
            
            // Process attendance records
            attendanceRecords.forEach(record => {
                const recordDate = new Date(record.date);
                
                // Only count records from the last 4 weeks
                if (recordDate >= fourWeeksAgo) {
                    // Calculate which week this record belongs to (0-3)
                    const weekIndex = Math.floor((now - recordDate) / (7 * 24 * 60 * 60 * 1000));
                    
                    if (weekIndex >= 0 && weekIndex < 4) {
                        if (record.status === 'present') {
                            weeklyData[3 - weekIndex].present++;
                        } else if (record.status === 'absent') {
                            weeklyData[3 - weekIndex].absent++;
                        }
                    }
                }
            });
            
            // Convert to chart data format
            weeklyData.forEach(week => {
                presentData.push(week.present);
                absentData.push(week.absent);
            });
        } else if (period === 'semester') {
            // Get the last 6 months
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const now = new Date();
            const currentMonth = now.getMonth();
            
            // Create labels for the last 6 months
            for (let i = 5; i >= 0; i--) {
                const monthIndex = (currentMonth - i + 12) % 12;
                labels.unshift(monthNames[monthIndex]);
            }
            
            // Initialize counters for each month
            const monthlyData = Array(6).fill().map(() => ({ present: 0, absent: 0 }));
            
            // Process attendance records
            attendanceRecords.forEach(record => {
                const recordDate = new Date(record.date);
                const recordMonth = recordDate.getMonth();
                const recordYear = recordDate.getFullYear();
                const currentYear = now.getFullYear();
                
                // Calculate months difference
                let monthsDiff = (currentMonth - recordMonth) + (currentYear - recordYear) * 12;
                
                if (monthsDiff >= 0 && monthsDiff < 6) {
                    if (record.status === 'present') {
                        monthlyData[5 - monthsDiff].present++;
                    } else if (record.status === 'absent') {
                        monthlyData[5 - monthsDiff].absent++;
                    }
                }
            });
            
            // Convert to chart data format
            monthlyData.forEach(month => {
                presentData.push(month.present);
                absentData.push(month.absent);
            });
        }
    } else {
        // Fallback to mock data if no real data is available
        console.warn('No attendance data available, using mock data');
        if (period === 'week') {
            labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            presentData = [1, 1, 0, 1, 0, 0, 0];
            absentData = [0, 0, 1, 0, 1, 0, 0];
        } else if (period === 'month') {
            labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
            presentData = [3, 2, 3, 2];
            absentData = [1, 2, 1, 2];
        } else if (period === 'semester') {
            labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
            presentData = [12, 11, 13, 10, 12, 5];
            absentData = [2, 3, 1, 4, 2, 1];
        }
    }
    
    return { labels, presentData, absentData };
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
    const totalClasses = presentCount + absentCount;
    
    // Display attendance counts
    document.getElementById('presentCount').textContent = presentCount;
    document.getElementById('absentCount').textContent = absentCount;
    document.getElementById('totalClasses').textContent = totalClasses;
    
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
}

// Sync with database - check if the database has new attendance records
async function syncAttendanceWithDatabase() {
    try {
        const token = localStorage.getItem('token');
        if (!token || !subjectData || !subjectData._id) {
            console.warn('Cannot sync attendance: Missing token or subject ID');
            return false;
        }
        
        // Get today's date in ISO format (YYYY-MM-DD)
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // Check if we already have today's attendance in our local data
        const hasTodayAttendance = subjectData.attendance && 
            subjectData.attendance.some(record => {
                const recordDate = new Date(record.date).toISOString().split('T')[0];
                return recordDate === todayStr;
            });
        
        // If we already have today's attendance, no need to sync
        if (hasTodayAttendance) {
            console.log('Today\'s attendance already synced');
            return false;
        }
        
        // Attempt to get the latest attendance data
        const response = await fetch(`/api/v1/user/attendance/${subjectData._id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.warn('Failed to sync attendance:', response.statusText);
            return false;
        }
        
        const data = await response.json();
        
        if (data && data.attendance && Array.isArray(data.attendance)) {
            // Update our subject data with the new attendance records
            subjectData.attendance = data.attendance;
            
            // Check if we now have today's attendance
            const updatedTodayAttendance = data.attendance.some(record => {
                const recordDate = new Date(record.date).toISOString().split('T')[0];
                return recordDate === todayStr;
            });
            
            if (updatedTodayAttendance) {
                console.log('Found today\'s attendance in sync');
                // Refresh the UI to show updated data
                const totalClasses = (subjectData.totalClass || 0) + 1;
                const presentCount = (subjectData.totalPresent || 0) + 
                    (data.attendance.find(r => {
                        const recordDate = new Date(r.date).toISOString().split('T')[0];
                        return recordDate === todayStr && r.status === 'present';
                    }) ? 1 : 0);
                
                // Update the UI
                document.getElementById('totalClasses').textContent = totalClasses;
                document.getElementById('presentCount').textContent = presentCount;
                document.getElementById('absentCount').textContent = totalClasses - presentCount;
                
                // Update attendance percentage
                const percentage = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;
                updateAttendanceCircle(percentage);
                
                // Refresh the chart with the current period
                const activeButton = document.querySelector('.period-selector .btn.active');
                if (activeButton) {
                    initializeAttendanceChart(activeButton.dataset.period);
                } else {
                    initializeAttendanceChart('week');
                }
                
                return true;
            }
        }
        
        return false;
    } catch (error) {
        console.error('Error syncing attendance:', error);
        return false;
    }
}
