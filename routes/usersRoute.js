const User = require('../model/userModel');
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middlewares/authMiddleware');

// register
router.post('/register', async(req,res) => {
    try {
        // check if user exists
        const user = await User.findOne({ email: req.body.email });
        if(user) {
            return res.send({
                message: "Email already in use",
                success: false,
            });
        }
        // create new user
        const hashPassword = await bcrypt.hash(req.body.password,10);
        req.body.password = hashPassword;
        const newUser = new User(req.body);
        await newUser.save();
        res.send({
            message: "User created sucessfully",
            success: true,
        });
    }
    catch (error) {
        res.send({
            message: error.message,
            success: false,
        });
    }
});

// login
router.post('/login', async(req,res) => {
    try {
        // check if user exists
        const user = await User.findOne({ email: req.body.email });
        if(!user) {
            return res.send({
                message: "Email or password invalid",
                success: false,
            });
        }
        // check if password is correct
        const validPassword = await bcrypt.compare(req.body.password, user.password);
        if(!validPassword) {
            return res.send({
                message: error.message,
                success: false,
            });
        }

        // password ok -> create token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn: "1d",
        });
        res.send({
            message: "User Login success",
            success: true,
            data: token
        });
    }
    catch (error) {
        res.send({
            message: "Email or password invalid",
            success: false,
        });
    }
});

// get current user
router.get("/get-current-user", authMiddleware, async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.body.userId });
        res.send({
            success: true,
            message: "User fetched successfully",
            data: user,
        });
    } catch (error) {
        res.send({
            message: error.message,
            success: false,
        });
    }
});

module.exports = router;