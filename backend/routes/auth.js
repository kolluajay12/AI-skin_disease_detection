const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   POST api/auth/register
// @desc    Register user
router.post('/register', async (req, res) => {
    const { email, password, fullName } = req.body;
    try {
        let userEmail = await User.findOne({ email });
        if (userEmail) return res.status(400).json({ msg: 'Email is already registered' });


        const user = new User({ email, password, fullName });
        await user.save();

        const payload = { user: { id: user.id } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
            if (err) throw err;
            const userObj = user.toObject();
            delete userObj.password;
            res.json({ token, user: userObj });
        });
    } catch (err) {
        console.error('Registration Error:', err.message);
        res.status(500).json({ msg: 'Server error during registration' });
    }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Invalid Credentials' });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });

        user.lastLogin = Date.now();
        await user.save();

        const payload = { user: { id: user.id } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
            if (err) throw err;
            const userObj = user.toObject();
            delete userObj.password;
            res.json({ token, user: userObj });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/auth/user
// @desc    Get user data
router.get('/user', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/auth/profile
// @desc    Update user profile
router.put('/profile', auth, async (req, res) => {
    const { fullName, email, phone, gender, dob } = req.body;
    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { fullName, email, phone, gender, dob } },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) return res.status(404).json({ msg: 'User not found' });
        res.json(updatedUser);
    } catch (err) {
        console.error('Profile Update Error:', err.message);
        if (err.code === 11000) {
            return res.status(400).json({ msg: 'Email already exists' });
        }
        res.status(500).json({ msg: 'Update failed', error: err.message });
    }
});

// @route   PUT api/auth/password
// @desc    Change user password
router.put('/password', auth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        // Explicitly select password if it's hidden or just to be safe
        let user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) return res.status(400).json({ msg: 'Incorrect current password' });

        user.password = newPassword;
        await user.save();
        res.json({ msg: 'Password updated successfully' });
    } catch (err) {
        console.error('Password Update Error:', err.message);
        res.status(500).json({ msg: 'Failed to update password', error: err.message });
    }
});

module.exports = router;
