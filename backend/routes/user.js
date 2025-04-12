const { Router } = require("express")
const { User, Subject, Schedule } = require("../db")
const jwt = require("jsonwebtoken")
const { JWT_USER_PASSWORD } = require("../config")
const { userMiddleware } = require("../middlewares/user");
const bcrypt = require("bcrypt")
const saltRounds = 10
const zod = require("zod")

const userRouter = Router()

userRouter.post("/signup", async function(req, res) {
    try {
        console.log("Signup attempt:", req.body);
        
        // Support both field naming conventions
        const fullName = req.body.fullName || req.body.username;
        const email = req.body.email;
        const password = req.body.password;
        
        if (!fullName || !email || !password) {
            return res.status(400).json({ 
                error: "Missing required fields", 
                details: { 
                    fullName: !fullName ? "Full name is required" : null,
                    email: !email ? "Email is required" : null,
                    password: !password ? "Password is required" : null
                }
            });
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "User with this email already exists" });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Create user
        await User.create({
            username: fullName,
            email,
            password: hashedPassword,
        });
        
        res.json({
            message: "Signup Successful"
        });
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ error: "Failed to create user" });
    }
});

userRouter.post("/signin", async function(req, res) {
    try {
        console.log("Signin attempt:", req.body);
        
        const email = req.body.email;
        const password = req.body.password;
        
        if (!email || !password) {
            return res.status(400).json({ 
                error: "Missing required fields", 
                details: { 
                    email: !email ? "Email is required" : null,
                    password: !password ? "Password is required" : null
                }
            });
        }
        
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            console.log("User not found:", email);
            return res.status(400).json({ error: "Invalid credentials" });
        }
        
        // Handle both hashed and unhashed passwords for backward compatibility
        let passwordMatch = false;
        
        // Check if password is already hashed
        if (user.password.startsWith('$2')) {
            // Compare hashed password
            passwordMatch = await bcrypt.compare(password, user.password);
        } else {
            // Plain text comparison for older users (temporary)
            passwordMatch = (password === user.password);
            
            // Update to hashed password if match
            if (passwordMatch) {
                const hashedPassword = await bcrypt.hash(password, saltRounds);
                user.password = hashedPassword;
                await user.save();
                console.log("Updated user to hashed password");
            }
        }
        
        if (!passwordMatch) {
            console.log("Password mismatch for:", email);
            return res.status(400).json({ error: "Invalid credentials" });
        }
        
        console.log("Login successful for:", email);
        
        // Create and sign JWT
        const token = jwt.sign({
            id: user._id,
        }, JWT_USER_PASSWORD || 'fallback-secret-key');
        
        return res.status(200).json({ 
            message: "Signin successful", 
            token,
            username: user.username || ""
        });
    } catch (error) {
        console.error("Signin error:", error);
        res.status(500).json({ error: "Authentication failed" });
    }
});

// Get user subjects
userRouter.get("/subjects", userMiddleware, async function(req, res) {
    try {
        const subjects = await Subject.find({ userId: req.userId });
        res.json({ subjects });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch subjects" });
    }
})

// Create a new subject
userRouter.post("/subjects", userMiddleware, async function(req, res) {
    const subjectSchema = zod.object({
        name: zod.string().nonempty("Subject name is required")
    })
    
    const result = subjectSchema.safeParse(req.body)
    if (!result.success) {
        return res.status(400).json({ errors: result.error.errors })
    }
    
    try {
        const { name } = req.body;
        const newSubject = await Subject.create({
            name,
            userId: req.userId,
            totalClass: 0,
            totalPresent: 0
        });
        
        res.status(201).json({ 
            message: "Subject created successfully", 
            subject: newSubject 
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to create subject" });
    }
})

// Get schedule
userRouter.get("/schedule", userMiddleware, async function(req, res) {
    try {
        const schedule = await Schedule.findOne({ userId: req.userId })
            .populate('subjects.subjectId');
        
        if (!schedule) {
            return res.status(200).json({ hasSchedule: false });
        }
        
        res.json({ 
            hasSchedule: true,
            schedule 
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch schedule" });
    }
})

// Create or update schedule
userRouter.post("/schedule", userMiddleware, async function(req, res) {
    const scheduleSchema = zod.object({
        subjects: zod.array(zod.object({
            subjectId: zod.string(),
            days: zod.array(zod.string()),
            startTime: zod.string(),
            endTime: zod.string()
        }))
    })
    
    const result = scheduleSchema.safeParse(req.body)
    if (!result.success) {
        return res.status(400).json({ errors: result.error.errors })
    }
    
    try {
        const { subjects } = req.body;
        
        // Check if schedule already exists
        let schedule = await Schedule.findOne({ userId: req.userId });
        
        if (schedule) {
            // Update existing schedule
            schedule.subjects = subjects;
            schedule.updated_at = new Date();
            await schedule.save();
        } else {
            // Create new schedule
            schedule = await Schedule.create({
                userId: req.userId,
                subjects,
            });
        }
        
        res.json({ 
            message: "Schedule updated successfully", 
            schedule 
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to update schedule" });
    }
})

// Get user dashboard data
userRouter.get("/dashboard", userMiddleware, async function(req, res) {
    try {
        console.log(`Fetching dashboard data for user ${req.userId}`);
        const subjects = await Subject.find({ userId: req.userId });
        const user = await User.findById(req.userId).select('-password');
        const schedule = await Schedule.findOne({ userId: req.userId })
            .populate('subjects.subjectId');
        
        console.log(`Found ${subjects.length} subjects for user ${req.userId}`);
        
        res.json({
            user,
            subjects: subjects || [],
            hasSchedule: !!schedule,
            schedule: schedule || null
        });
    } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
})

module.exports = {
    userRouter,
}