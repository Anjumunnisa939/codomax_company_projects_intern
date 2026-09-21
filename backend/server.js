const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const connectDB = require("./config/db");
const User = require("./models/user");

const app = express();

const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, "data.json");
const TOKEN_SECRET =
    process.env.TOKEN_SECRET;

app.use(cors());
app.use(express.json());

/* =========================
   FILE DATA HELPERS
========================= */

function readData() {
    if (!fs.existsSync(DATA_FILE)) {
        return {
            users: [],
            blogs: []
        };
    }

    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function writeData(data) {
    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(data, null, 2)
    );
}

/* =========================
   PASSWORD HELPERS
========================= */

function hashPassword(
    password,
    salt = crypto.randomBytes(16).toString("hex")
) {
    return `${salt}:${crypto
        .scryptSync(password, salt, 64)
        .toString("hex")}`;
}

function passwordMatches(password, stored) {
    const [salt, storedHash] = stored.split(":");

    if (!salt || !storedHash) {
        return false;
    }

    const candidate = crypto
        .scryptSync(password, salt, 64)
        .toString("hex");

    const storedBuffer = Buffer.from(storedHash, "hex");
    const candidateBuffer = Buffer.from(candidate, "hex");

    if (storedBuffer.length !== candidateBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(
        storedBuffer,
        candidateBuffer
    );
}

/* =========================
   TOKEN HELPERS
========================= */

function createToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email
        },
        TOKEN_SECRET,
        { expiresIn: "1d" }
    );
}

/* =========================
   AUTH MIDDLEWARE
========================= */

async function requireAuth(req, res, next) {
    const token = req.headers.authorization?.replace(
        /^Bearer\s+/i,
        ""
    );

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Authentication is required."
        });
    }

    try {
        const decoded = jwt.verify(token, TOKEN_SECRET);
        const user = await User.findOne({ id: decoded.id });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User account no longer exists."
            });
        }

        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role || "user",
            isAdmin: user.role === "admin" || user.email === process.env.ADMIN_EMAIL
        };

        return next();
    } catch {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired authentication token."
        });
    }
}

function requireAdmin(req, res, next) {
    if (!req.user?.isAdmin) {
        return res.status(403).json({
            success: false,
            message: "Administrator access is required."
        });
    }

    return next();
}

/* =========================
   FRONTEND
========================= */

app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "../frontend/login.html")
    );
});

app.get("/home", (req, res) => {
    res.sendFile(
        path.join(__dirname, "../frontend/index.html")
    );
});

app.use(
    express.static(
        path.join(__dirname, "../frontend")
    )
);

/* =========================
   HEALTH CHECK
========================= */

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Steppi API is running."
    });
});

/* =========================
   REGISTER
========================= */

app.post(["/api/auth/register", "/api/users/register"], async (req, res) => {
    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "Name, email, and password are required."
        });
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({
            success: false,
            message: "Enter a valid email address."
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            success: false,
            message: "Password must contain at least 6 characters."
        });
    }

    try {
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            name,
            email,
            password: hashedPassword
        });

        return res.status(201).json({
            success: true,
            message: "Registration successful. Please log in.",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists."
            });
        }

        console.error("Registration failed:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to register at this time."
        });
    }
});

/* =========================
    LOGIN
========================= */

app.post(["/api/auth/login", "/api/users/login"], async (req, res) => {
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email and password are required."
        });
    }

    try {
        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        return res.json({
            success: true,
            message: "Login successful.",
            token: createToken(user),
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role || "user",
                isAdmin: user.role === "admin" || user.email === process.env.ADMIN_EMAIL
            }
        });
    } catch (error) {
        console.error("Login failed:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to log in at this time."
        });
    }
});

/* =========================
   PROFILE AND LOGOUT
========================= */

app.get("/api/auth/profile", requireAuth, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

app.post("/api/auth/logout", requireAuth, (req, res) => {
    res.json({
        success: true,
        message: "Logged out successfully. Remove the token from the client."
    });
});

/* =========================
   CREATE BLOG
========================= */

app.post("/api/blogs", requireAuth, (req, res) => {
    const title = req.body.title?.trim();
    const content = req.body.content?.trim();

    if (!title || !content) {
        return res.status(400).json({
            success: false,
            message: "Blog title and content are required."
        });
    }

    const data = readData();

    const blog = {
        id: crypto.randomUUID(),
        title,
        content,
        authorId: req.user.id,
        authorEmail: req.user.email,
        createdAt: new Date().toISOString()
    };

    data.blogs.unshift(blog);
    writeData(data);

    res.status(201).json({
        success: true,
        message: "Blog created successfully.",
        blog
    });
});

/* =========================
   GET BLOGS
========================= */

app.get("/api/blogs", (req, res) => {
    const data = readData();

    res.json({
        success: true,
        blogs: data.blogs
    });
});

app.get("/api/blogs/my", requireAuth, (req, res) => {
    const data = readData();
    const blogs = data.blogs.filter((blog) => blog.authorId === req.user.id);

    res.json({
        success: true,
        blogs
    });
});

/* =========================
   ADMIN USER MANAGEMENT
========================= */

app.get("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
    try {
        const users = (await User.find().select("-password").sort({ createdAt: -1 }))
            .map((user) => ({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role || "user",
                isAdmin: user.role === "admin" || user.email === process.env.ADMIN_EMAIL,
                createdAt: user.createdAt
            }));

        return res.json({
            success: true,
            count: users.length,
            users
        });
    } catch (error) {
        console.error("Admin user lookup failed:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to load users."
        });
    }
});

app.put("/api/admin/users/:id/password", requireAuth, requireAdmin, async (req, res) => {
    const { password } = req.body;

    if (!password || password.length < 6) {
        return res.status(400).json({
            success: false,
            message: "Password must contain at least 6 characters."
        });
    }

    try {
        const user = await User.findOneAndUpdate(
            { id: req.params.id },
            { password: await bcrypt.hash(password, 10) },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        return res.json({
            success: true,
            message: "User password updated successfully."
        });
    } catch (error) {
        console.error("Admin password update failed:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to update the password."
        });
    }
});

app.delete("/api/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
    if (req.params.id === req.user.id) {
        return res.status(400).json({
            success: false,
            message: "You cannot delete your own administrator account."
        });
    }

    try {
        const user = await User.findOneAndDelete({ id: req.params.id });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const data = readData();
        data.blogs = data.blogs.filter((blog) => blog.authorId !== req.params.id);
        writeData(data);

        return res.json({
            success: true,
            message: "User deleted successfully."
        });
    } catch (error) {
        console.error("Admin user deletion failed:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to delete the user."
        });
    }
});

/* =========================
   404
========================= */

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found."
    });
});

/* =========================
   START SERVER
========================= */

const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(
                `Server running on http://localhost:${PORT}`
            );
        });
    } catch (error) {
        console.error("Server failed to start.");
        process.exit(1);
    }
};

startServer();