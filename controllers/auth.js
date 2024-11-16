const prisma = require('../config/prisma')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

exports.register = async (req, res) => {

    try {
        //code
        const { email, password } = req.body

        // step 1 validate body
        if (!email) {
            return res.status(400).json({ message: "Email is required!!!" })
        }
        if (!password) {
            return res.status(400).json({ message: "Password is required!!!" })
        }

        //step 2 Check Email in DB already ?
        const user = await prisma.user.findFirst({
            where: {
                email: email
            }
        })
        if (user) {
            return res.status(400).json({ message: "Email already exits" })
        }
        //step 3 HashPassword
        const hashPassword = await bcrypt.hash(password, 10)

        //step 4 Register
        await prisma.user.create({
            data: {
                email: email,
                password: hashPassword
            }
        })
        console.log(email, password)
        res.send("Register Success")
    } catch (err) {
        //err
        console.log(err)
        res.status(500).json({ message: "Server error" })
    }
}

exports.login = async (req, res) => {
    try {
        //code
        const { email, password } = req.body

        //step 1 Check Email
        const user = await prisma.user.findFirst({
            where: {
                email: email
            }
        })
        if(!user || !user.enabled){
            return res.status(400).json({message:'User Not found or not Enabled'})
        }
        //step 2 Check password
        const isMatch = await bcrypt.compare(password,user.password)
        if(!isMatch){
            return res.status(400).json({message:'Password Invalid!!!'})
        }

        //step 3 create payload
        const payload = {
            id:user.id,
            email:user.email,
            role:user.role
        }
        console.log(payload)

        //step 4 Generate Token
        jwt.sign(payload,process.env.SECRET,{expiresIn:'1d'},(err,token) =>{
            if(err){
                return res.status(500).json({message:'Server Error'})
            }
            res.json({payload,token})
        })

    } catch (err) {
        //err
        console.log(err)
        res.status(500).json({ message: "Server error" })
    }
}

exports.currentUser = async (req, res) => {
    try {//code
        const user = await prisma.user.findFirst({
            where:{email:req.user.email},
            select:{
                id:true,
                email:true,
                name:true,
                role:true
            }
        })
        res.json({user})
    } catch (err) {
        //err
        console.log(err)
        res.status(500).json({ message: "Server error" })
    }
}
