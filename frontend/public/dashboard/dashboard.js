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
    
    // Show loading indicator initially
    loadingIndicator.classList.remove('d-none');
    emptyState.classList.add('d-none');
    subjectGrid.classList.add('d-none');
    
    // Directly fetch dashboard data from API
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
        emptyState.classList.add('d-none');
        subjectGrid.classList.add('d-none');
        
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
            
            // Display subjects from API
            if (data.subjects && data.subjects.length > 0) {
                console.log(`Found ${data.subjects.length} subjects:`, data.subjects);
                displaySubjects(data.subjects);
            } else {
                // Try backup from localStorage if API returns no subjects
                const storedSubjects = getSubjectsFromLocalStorage();
                if (storedSubjects && storedSubjects.length > 0) {
                    console.log('Using subjects from localStorage as backup');
                    displayLocalSubjects(storedSubjects);
                } else {
                    console.log('No subjects found, showing empty state');
                    showEmptyState();
                }
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
            
            // Try to load subjects from localStorage as fallback
            const storedSubjects = getSubjectsFromLocalStorage();
            if (storedSubjects && storedSubjects.length > 0) {
                console.log('Using subjects from localStorage as fallback');
                displayLocalSubjects(storedSubjects);
            } else {
                // Show empty state if no subjects in localStorage either
                showEmptyState();
            }
        });
    }
    
    // Function to get subjects from localStorage
    function getSubjectsFromLocalStorage() {
        try {
            // Extract user ID from token for user-specific storage
            const userInfo = parseToken(token);
            const userId = userInfo ? userInfo.id : 'unknown';
            
            // Use user-specific key
            return JSON.parse(localStorage.getItem(`subjects_${userId}`)) || [];
        } catch (error) {
            console.error('Error parsing subjects from localStorage:', error);
            return [];
        }
    }
    
    // Helper function to parse JWT token
    function parseToken(token) {
        try {
            // Extract payload from JWT token (middle part between dots)
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('Error parsing token:', error);
            return null;
        }
    }
    
    // Function to display subjects from localStorage
    function displayLocalSubjects(subjectNames) {
        if (!subjectNames || subjectNames.length === 0) {
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
        
        // Add subjects to grid
        subjectNames.forEach((subjectName, index) => {
            // Choose icon based on index
            const iconClass = subjectIcons[index % subjectIcons.length];
            
            // Create subject card
            const subjectCard = document.createElement('a');
            subjectCard.href = `../sub1_page/index.html?name=${encodeURIComponent(subjectName)}`;
            subjectCard.className = `subject-card card p-4 text-center`;
            
            // Add custom styling based on subject
            subjectCard.style.backgroundColor = getSubjectBackgroundColor(index);
            subjectCard.style.borderLeft = `4px solid ${getSubjectBorderColor(index)}`;
            
            // Create card content
            subjectCard.innerHTML = `
                <div class="subject-icon">
                    <i class="bi ${iconClass}" style="color: ${getSubjectBorderColor(index)};"></i>
                </div>
                <h5 class="card-title fw-semibold">${subjectName}</h5>
                <div class="attendance-indicator">
                    <div class="attendance-percentage" style="color: #4caf50">
                        0%
                    </div>
                    <div class="attendance-details">
                        <span>0/0</span> classes attended
                    </div>
                </div>
            `;
            
            subjectGrid.appendChild(subjectCard);
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
            
            // Choose icon based on index
            const iconClass = subjectIcons[index % subjectIcons.length];
            
            // Create subject card container (div instead of direct link)
            const cardContainer = document.createElement('div');
            cardContainer.className = 'subject-card-container';
            
            // Create subject card
            const subjectCard = document.createElement('a');
            
            // Use different URLs based on what data we have
            if (subject._id) {
                subjectCard.href = `../sub1_page/index.html?id=${subject._id}`;
            } else {
                subjectCard.href = `../sub1_page/index.html?name=${encodeURIComponent(subject.name)}`;
            }
            
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
            
            // Add the card to the container
            cardContainer.appendChild(subjectCard);
            
            // Create remove button
            const removeButton = document.createElement('button');
            removeButton.className = 'btn btn-danger btn-sm remove-subject-btn';
            removeButton.innerHTML = '<i class="bi bi-trash"></i> Remove';
            removeButton.setAttribute('data-subject-id', subject._id || '');
            removeButton.setAttribute('data-subject-name', subject.name);
            
            // Add click event to remove button
            removeButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                confirmRemoveSubject(subject._id, subject.name);
            });
            
            // Add the remove button to the container
            cardContainer.appendChild(removeButton);
            
            // Add the container to the grid
            subjectGrid.appendChild(cardContainer);
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
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        schedule.subjects.forEach(item => {
            const subject = item.subjectId;
            const days = item.days.join(', ');
            
            html += `
                <tr>
                    <td>${subject ? subject.name : 'Unknown Subject'}</td>
                    <td>${days}</td>
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
    
    // Function to confirm and remove a subject
    function confirmRemoveSubject(subjectId, subjectName) {
        if (confirm(`Are you sure you want to remove ${subjectName}?`)) {
            removeSubject(subjectId, subjectName);
        }
    }
    
    // Function to remove a subject
    async function removeSubject(subjectId, subjectName) {
        try {
            // If we have an ID, use it to delete from API
            if (subjectId) {
                const response = await fetch(`/api/v1/user/subjects/${subjectId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`Failed to delete subject: ${response.status}`);
                }
                
                console.log(`Subject "${subjectName}" deleted successfully`);
            }
            
            // Also remove from localStorage as backup
            const userInfo = parseToken(token);
            if (userInfo && userInfo.id) {
                const subjects = JSON.parse(localStorage.getItem(`subjects_${userInfo.id}`)) || [];
                const updatedSubjects = subjects.filter(name => name !== subjectName);
                localStorage.setItem(`subjects_${userInfo.id}`, JSON.stringify(updatedSubjects));
            }
            
            // Refresh the dashboard
            fetchDashboardData();
            
            // Show success message
            alert(`Subject "${subjectName}" has been removed.`);
            
        } catch (error) {
            console.error('Error removing subject:', error);
            alert(`Failed to remove subject: ${error.message}`);
        }
    }
});