import jwt from "jsonwebtoken";

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
  if (err) {
    console.error("JWT error:", err); // <-- add this
    return res.status(403).json({ message: "Token is not valid" });
  }
  req.user = user;
  console.log("Authenticated user:", user); // <-- add this
  next();
});

};

