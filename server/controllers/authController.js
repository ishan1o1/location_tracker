const authService = require('../services/authService');
const { getUserActiveRooms, syncUserProfileInRooms } = require('../socketHandler');

exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body || {};
        const result = await authService.registerUser({ name, email, password });
        return res.status(201).json({
            message: 'User registered successfully',
            token: result.token,
            user: result.user,
        });
    } catch (err) {
        const status = err.statusCode || 500;
        return res.status(status).json({ error: err.message || 'Registration failed' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body || {};
        const result = await authService.loginUser({ email, password });
        return res.status(200).json({
            message: 'Login successful',
            token: result.token,
            user: result.user,
        });
    } catch (err) {
        const status = err.statusCode || 500;
        return res.status(status).json({ error: err.message || 'Login failed' });
    }
};

exports.getMe = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const user = await authService.getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.status(200).json({ user });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to retrieve user profile' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { name } = req.body || {};
        const updatedUser = await authService.updateUserProfile(req.user.id, { name });

        // Trigger real-time socket sync
        const io = req.app.get('io');
        if (io) {
            syncUserProfileInRooms(io, req.user.id, updatedUser.name);
        }

        return res.status(200).json({
            message: 'Profile updated successfully',
            user: updatedUser,
        });
    } catch (err) {
        const status = err.statusCode || 500;
        return res.status(status).json({ error: err.message || 'Profile update failed' });
    }
};

exports.getMyRooms = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const userRooms = getUserActiveRooms(req.user.id);
        return res.status(200).json({ rooms: userRooms });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to retrieve active rooms' });
    }
};
