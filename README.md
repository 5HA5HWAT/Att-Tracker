# Att-Tracker - Smart Attendance Tracking System

AttTracker is a comprehensive attendance tracking system with an AI-powered prediction feature that forecasts your attendance likelihood based on historical patterns.

## Features

- **Track Attendance**: Record and monitor your attendance for different subjects
- **Attendance Statistics**: View detailed statistics including attendance percentage
- **Schedule Management**: Manage your class schedule
- **AI Prediction**: Get predictions about your likelihood of attending classes using Machine Learning
- **Responsive Design**: Works on all devices

## AI Prediction Feature

The prediction feature uses a Random Forest classifier trained on historical attendance data to predict whether you'll attend a specific class. The model considers:

- Day of the week
- Subject
- Past attendance patterns

## Setup and Installation

1. Make sure you have Node.js and Python installed
2. Install backend dependencies: `cd backend && npm install`
3. Install Python dependencies: `cd Python_projects && pip install -r require.txt`
4. Start both servers using the provided batch file: `npm run start`

## Development

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Prediction API: Flask, scikit-learn
- Database: MongoDB
