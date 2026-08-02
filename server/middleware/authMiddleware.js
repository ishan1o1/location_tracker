const { verifyToken } = require('../utils/jwt');
const authService = require('../services/authService');

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: Token missing' });
    }

    try {
        const decoded = verifyToken(token);
        const user = await authService.getUserById(decoded.userId);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized: User no longer exists' });
        }

        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
        };
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
};

module.exports = {
    authenticateToken,
};
