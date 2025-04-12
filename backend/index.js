require('dotenv').config();  
const path = require("path");

const express = require("express")
const mongoose = require("mongoose")
const app = express()
app.use(express.json())
app.use(require('cors')()); 

// Serve static files from the frontend public directory
app.use(express.static(path.join(__dirname, "../frontend/public")));

const { userRouter } = require("./routes/user");

app.use("/api/v1/user", userRouter);

// Default route - serve the landing page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/public/landing_page/index.html"));
});

async function main() {
    await mongoose.connect("mongodb+srv://shashwatm661:oPrTnCOYRLRXwdCe@cluster0.crstdf4.mongodb.net/new")
    app.listen(3000);
    console.log("listening on port 3000")
}

main()