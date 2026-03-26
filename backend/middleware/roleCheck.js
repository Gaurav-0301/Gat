const checkRole = (...roles) => {
    // Normalize allowed roles to lowercase for comparison
    const allowed = roles.map(r => (r || '').toString().toLowerCase());
    return (req, res, next) => {
        if(!req.user){
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const userRole = (req.user.role || '').toString().toLowerCase();

        if(!allowed.includes(userRole)) {
            return res.status(403).json({ error: `Access denied: Required role: ${roles.join(' or ')}` });
        }
        next();
    }
}

module.exports = checkRole;