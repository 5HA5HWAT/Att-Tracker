const { Router } = require("express")
const { userModel,subjectModel } = require("../db")
const jwt = require("jsonwebtoken")
const { JWT_USER_PASSWORD } = require("../config")
const { userMiddleware } = require("../middlewares/user");
const bcrypt = require("bcrypt")
const saltRounds = 10
const zod = require("zod")

const userRouter = Router()

userRouter.post("/signup",async function(req,res){
    
    const signupSchema = zod.object({
        fullName: zod.string().nonempty("Full name is required"),
        email: zod.string().email("Invalid email address"),
        password: zod.string()
    })
    
    const result = signupSchema.safeParse(req.body)
    if (!result.success) {
        return res.status(400).json({ errors: result.error.errors })
    }
    
    const {fullName,email,password}=req.body

    // const hashedPassword=await bcrypt.hash(password,saltRounds)

    await userModel.create({
        fullName:fullName,
        email:email,
        password:password,
    })

    res.json({
        message:"Signup Successful"
    })
})

userRouter.post("/signin",async function(req,res){
    
    const singinSchema=zod.object({
        email: zod.string().email("Invalid email address"),
        password: zod.string().min(6, "Password must be at least 6 characters long")
    })
    
    const result = singinSchema.safeParse(req.body)
    if (!result.success) {
        return res.status(400).json({ errors: result.error.errors })
    }
    
    const { email,password }=req.body

    
    const user=await userModel.findOne({
        email:email,
    })

    if(!user)
        return res.status(400).json({error:"Invalid Credentials"})

    const decoded=await bcrypt.compare(password, user.password)
    if(!decoded){
        return res.status(400).json({ error: "Invalid credentials" })
    }

    const token=jwt.sign({
        id: user._id,
    },JWT_USER_PASSWORD)

    return res.status(200).json({ message: "Signin successful", token })
})

userRouter.get("/dashboard",userMiddleware,function(req,res){

})

userRouter.get("/today-status",userMiddleware,function(req,res){

})

module.exports={
    userRouter,
}