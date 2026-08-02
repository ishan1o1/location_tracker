const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// In-memory fallback storage if MongoDB is disconnected
const inMemoryUsers = new Map();

const isValidEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
};

const isDbConnected = () => {
    return mongoose.connection.readyState === 1;
};

const registerUser = async ({ name, email, password }) => {
    const trimmedName = String(name || '').trim();
    const trimmedEmail = String(email || '').trim().toLowerCase();
    const strPassword = String(password || '');

    if (!trimmedName || !trimmedEmail || !strPassword) {
        const err = new Error('All fields (name, email, password) are required');
        err.statusCode = 400;
        throw err;
    }

    if (!isValidEmail(trimmedEmail)) {
        const err = new Error('Please enter a valid email address');
        err.statusCode = 400;
        throw err;
    }

    if (strPassword.length < 8) {
        const err = new Error('Password must be at least 8 characters long');
        err.statusCode = 400;
        throw err;
    }

    if (isDbConnected()) {
        const existingUser = await User.findOne({ email: trimmedEmail });
        if (existingUser) {
            const err = new Error('An account with this email already exists');
            err.statusCode = 400;
            throw err;
        }

        const user = new User({
            name: trimmedName,
            email: trimmedEmail,
            password: strPassword,
        });

        await user.save();
        const userData = user.toAuthJSON();
        const token = generateToken({ userId: userData.id, email: userData.email });
        return { token, user: userData };
    } else {
        // Fallback to in-memory store
        if (inMemoryUsers.has(trimmedEmail)) {
            const err = new Error('An account with this email already exists');
            err.statusCode = 400;
            throw err;
        }

        const hashedPassword = await bcrypt.hash(strPassword, 10);
        const id = 'usr_' + Math.random().toString(36).substring(2, 10);
        const now = new Date();
        const userData = {
            id,
            name: trimmedName,
            email: trimmedEmail,
            passwordHash: hashedPassword,
            createdAt: now,
            updatedAt: now,
        };

        inMemoryUsers.set(trimmedEmail, userData);
        const publicUser = { id, name: trimmedName, email: trimmedEmail, createdAt: now, updatedAt: now };
        const token = generateToken({ userId: id, email: trimmedEmail });
        return { token, user: publicUser };
    }
};

const loginUser = async ({ email, password }) => {
    const trimmedEmail = String(email || '').trim().toLowerCase();
    const strPassword = String(password || '');

    if (!trimmedEmail || !strPassword) {
        const err = new Error('Email and password are required');
        err.statusCode = 400;
        throw err;
    }

    if (isDbConnected()) {
        const user = await User.findOne({ email: trimmedEmail });
        if (!user) {
            const err = new Error('Invalid email or password');
            err.statusCode = 401;
            throw err;
        }

        const isMatch = await user.comparePassword(strPassword);
        if (!isMatch) {
            const err = new Error('Invalid email or password');
            err.statusCode = 401;
            throw err;
        }

        const userData = user.toAuthJSON();
        const token = generateToken({ userId: userData.id, email: userData.email });
        return { token, user: userData };
    } else {
        const storedUser = inMemoryUsers.get(trimmedEmail);
        if (!storedUser) {
            const err = new Error('Invalid email or password');
            err.statusCode = 401;
            throw err;
        }

        const isMatch = await bcrypt.compare(strPassword, storedUser.passwordHash);
        if (!isMatch) {
            const err = new Error('Invalid email or password');
            err.statusCode = 401;
            throw err;
        }

        const publicUser = {
            id: storedUser.id,
            name: storedUser.name,
            email: storedUser.email,
            createdAt: storedUser.createdAt,
            updatedAt: storedUser.updatedAt,
        };
        const token = generateToken({ userId: storedUser.id, email: storedUser.email });
        return { token, user: publicUser };
    }
};

const getUserById = async (userId) => {
    if (isDbConnected()) {
        const user = await User.findById(userId);
        if (!user) return null;
        return user.toAuthJSON();
    } else {
        for (const user of inMemoryUsers.values()) {
            if (user.id === userId) {
                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                };
            }
        }
        return null;
    }
};

const updateUserProfile = async (userId, { name }) => {
    const trimmedName = String(name || '').trim();
    if (!trimmedName) {
        const err = new Error('Name is required');
        err.statusCode = 400;
        throw err;
    }

    if (isDbConnected()) {
        const user = await User.findByIdAndUpdate(
            userId,
            { name: trimmedName },
            { new: true, runValidators: true }
        );
        if (!user) {
            const err = new Error('User not found');
            err.statusCode = 404;
            throw err;
        }
        return user.toAuthJSON();
    } else {
        for (const user of inMemoryUsers.values()) {
            if (user.id === userId) {
                user.name = trimmedName;
                user.updatedAt = new Date();
                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                };
            }
        }
        const err = new Error('User not found');
        err.statusCode = 404;
        throw err;
    }
};

module.exports = {
    registerUser,
    loginUser,
    getUserById,
    updateUserProfile,
};

