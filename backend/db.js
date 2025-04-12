const mongoose = require("mongoose")
const Schema = mongoose.Schema;

// User schema for authentication
const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

// Subject schema to store user subjects
const subjectSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    totalClass: {
        type: Number,
        default: 0
    },
    totalPresent: {
        type: Number,
        default: 0
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

// Schedule schema to store user schedules
const scheduleSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subjects: [{
        subjectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subject'
        },
        days: [String], // e.g., ['Monday', 'Wednesday', 'Friday']
        startTime: String,
        endTime: String
    }],
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model("User", userSchema)
const Subject = mongoose.model("Subject", subjectSchema)
const Schedule = mongoose.model("Schedule", scheduleSchema)

module.exports = {
    User,
    Subject,
    Schedule
}