document.addEventListener('DOMContentLoaded', function() {
    // Get elements
    const subjectGrid = document.getElementById('subjectGrid');
    const emptyState = document.getElementById('emptyState');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const scheduleLink = document.getElementById('scheduleLink');
    const scheduleModal = new bootstrap.Modal(document.getElementById('scheduleModal'));
    const scheduleContent = document.getElementById('scheduleContent');
    const scheduleLoading = document.getElementById('scheduleLoading');
    const username = document.getElementById('username');
    const signOutBtn = document.getElementById('signOutBtn');
    
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    // If no token, redirect to login
    if (!token) {
        window.location.href = '../new_signin_signup/index.html';
        return;
    }
    
    // Display username
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
        username.textContent = storedUsername;
    }
    
    // Handle sign out
    signOutBtn.addEventListener('click', function() {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        window.location.href = '../landing_page/index.html';
    });
    
    // Fetch dashboard data from API
    fetchDashboardData();
    
    // Handle schedule link click
    scheduleLink.addEventListener('click', function(e) {
        e.preventDefault();
        fetchSchedule();
        scheduleModal.show();
    });
    
    // Function to fetch dashboard data
    function fetchDashboardData() {
        // Show loading indicator
        loadingIndicator.classList.remove('d-none');
        subjectGrid.classList.add('d-none');
        emptyState.classList.add('d-none');
        
        fetch('/api/v1/user/dashboard', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch dashboard data');
            }
            return response.json();
        })
        .then(data => {
            // Hide loading indicator
            loadingIndicator.classList.add('d-none');
            
            console.log('Dashboard data:', data);
            
            // Display subjects - explicitly handle empty case
            if (!data.subjects || data.subjects.length === 0) {
                console.log('No subjects found, showing empty state');
                showEmptyState();
            } else {
                console.log(`Found ${data.subjects.length} subjects:`, data.subjects);
                displaySubjects(data.subjects);
            }
            
            // Store username
            if (data.user && data.user.username) {
                localStorage.setItem('username', data.user.username);
                username.textContent = data.user.username;
            }
        })
        .catch(error => {
            console.error('Error fetching dashboard data:', error);
            
            // Hide loading indicator
            loadingIndicator.classList.add('d-none');
            
            // Show empty state on error
            showEmptyState();
        });
    }
    
    // Function to display subjects
    function displaySubjects(subjects) {
        if (!subjects || subjects.length === 0) {
            console.log('displaySubjects: No subjects to display');
            showEmptyState();
            return;
        }
        
        // Hide empty state and show subject grid
        emptyState.classList.add('d-none');
        subjectGrid.classList.remove('d-none');
        
        // Clear existing subjects
        subjectGrid.innerHTML = '';
        
        // Icons for different subjects
        const subjectIcons = [
            'bi-book', 'bi-calculator', 'bi-globe', 'bi-palette', 
            'bi-laptop', 'bi-graph-up', 'bi-briefcase', 'bi-lightbulb',
            'bi-gear', 'bi-box'
        ];
        
        // Colors for different subjects
        const subjectColors = [
            'primary', 'success', 'warning', 'danger', 
            'info', 'dark', 'secondary'
        ];
        
        // Add subjects to grid
        subjects.forEach((subject, index) => {
            // Make sure subject has the required properties
            if (!subject || !subject.name) {
                console.log('Skipping invalid subject:', subject);
                return;
            }
            
            const totalClass = subject.totalClass || 0;
            const totalPresent = subject.totalPresent || 0;
            
            const attendancePercentage = totalClass > 0 
                ? Math.round((totalPresent / totalClass) * 100) 
                : 0;
            
            // Get attendance status class
            const attendanceClass = getAttendanceClass(attendancePercentage);
            
            // Choose icon and color based on index
            const iconClass = subjectIcons[index % subjectIcons.length];
            const colorClass = subjectColors[index % subjectColors.length];
            
            // Create subject card
            const subjectCard = document.createElement('a');
            subjectCard.href = `../sub1_page/index.html?id=${subject._id}`;
            subjectCard.className = `subject-card card p-4 text-center`;
            
            // Add custom styling based on subject
            subjectCard.style.backgroundColor = getSubjectBackgroundColor(index);
            subjectCard.style.borderLeft = `4px solid ${getSubjectBorderColor(index)}`;
            
            // Create card content
            subjectCard.innerHTML = `
                <div class="subject-icon">
                    <i class="bi ${iconClass}" style="color: ${getSubjectBorderColor(index)};"></i>
                </div>
                <h5 class="card-title fw-semibold">${subject.name}</h5>
                <div class="attendance-indicator">
                    <div class="attendance-percentage" style="color: ${getAttendanceColor(attendancePercentage)}">
                        ${attendancePercentage}%
                    </div>
                    <div class="attendance-details">
                        <span>${totalPresent}/${totalClass}</span> classes attended
                    </div>
                </div>
            `;
            
            subjectGrid.appendChild(subjectCard);
        });
        
        // Double-check we actually added subjects to the grid
        if (subjectGrid.children.length === 0) {
            console.log('No valid subjects were added to the grid');
            showEmptyState();
        }
    }
    
    // Function to show empty state
    function showEmptyState() {
        subjectGrid.classList.add('d-none');
        emptyState.classList.remove('d-none');
    }
    
    // Function to get attendance color class based on percentage
    function getAttendanceClass(percentage) {
        if (percentage >= 75) return 'good';
        if (percentage >= 50) return 'warning';
        return 'danger';
    }
    
    // Function to get attendance color based on percentage
    function getAttendanceColor(percentage) {
        if (percentage >= 75) return '#4caf50';
        if (percentage >= 50) return '#ff9800';
        return '#f44336';
    }
    
    // Function to get subject background color based on index
    function getSubjectBackgroundColor(index) {
        const colors = [
            '#e6f3ff', // Light blue
            '#eefae6', // Light green
            '#fff8dc', // Light yellow
            '#fce4ec', // Light pink
            '#f2f0fc', // Light purple
            '#e8f5e9', // Mint
            '#fff3e0'  // Light orange
        ];
        return colors[index % colors.length];
    }
    
    // Function to get subject border color based on index
    function getSubjectBorderColor(index) {
        const colors = [
            '#1976d2', // Blue
            '#388e3c', // Green
            '#f57c00', // Orange
            '#d32f2f', // Red
            '#512da8', // Purple
            '#0097a7', // Teal
            '#7b1fa2'  // Purple
        ];
        return colors[index % colors.length];
    }
    
    // Function to fetch schedule
    function fetchSchedule() {
        // Show loading indicator
        scheduleLoading.classList.remove('d-none');
        scheduleContent.classList.add('d-none');
        
        fetch('/api/v1/user/schedule', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch schedule');
            }
            return response.json();
        })
        .then(data => {
            // Hide loading indicator
            scheduleLoading.classList.add('d-none');
            scheduleContent.classList.remove('d-none');
            
            if (data.hasSchedule && data.schedule) {
                displaySchedule(data.schedule);
            } else {
                scheduleContent.innerHTML = `
                    <div class="text-center py-4">
                        <i class="bi bi-calendar-x fs-1 text-muted mb-3"></i>
                        <h4>No Schedule Set Up</h4>
                        <p class="text-muted">You haven't created a schedule yet.</p>
                    </div>
                `;
                
                // Update manage button to go to schedule creation
                document.getElementById('manageScheduleBtn').textContent = 'Create Schedule';
            }
        })
        .catch(error => {
            console.error('Error fetching schedule:', error);
            
            // Hide loading indicator
            scheduleLoading.classList.add('d-none');
            scheduleContent.classList.remove('d-none');
            
            scheduleContent.innerHTML = `
                <div class="alert alert-danger">
                    Failed to load schedule. Please try again.
                </div>
            `;
        });
    }
    
    // Function to display schedule
    function displaySchedule(schedule) {
        if (!schedule.subjects || schedule.subjects.length === 0) {
            scheduleContent.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-calendar-x fs-1 text-muted mb-3"></i>
                    <h4>No Classes Scheduled</h4>
                    <p class="text-muted">Your schedule is empty.</p>
                </div>
            `;
            return;
        }
        
        // Create schedule table
        let html = `
            <div class="table-responsive">
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>Subject</th>
                            <th>Days</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        schedule.subjects.forEach(item => {
            const subject = item.subjectId;
            const days = item.days.join(', ');
            const time = `${item.startTime} - ${item.endTime}`;
            
            html += `
                <tr>
                    <td>${subject ? subject.name : 'Unknown Subject'}</td>
                    <td>${days}</td>
                    <td>${time}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        scheduleContent.innerHTML = html;
        
        // Update manage button
        document.getElementById('manageScheduleBtn').textContent = 'Edit Schedule';
    }
});