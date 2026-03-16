const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const USERS_FILE = path.join(__dirname, "users.json");

// ensure file exists
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, "[]", "utf8");
}

// Read users
function getUsers() {
    try {
        return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
    } catch {
        return [];
    }
}

// Save users
function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

// SIGNUP
router.post("/signup", (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
        return res.json({ success: false, message: "All fields required" });

    const users = getUsers();

    if (users.find(u => u.email === email.toLowerCase()))
        return res.json({ success: false, message: "Email already exists" });

    const newUser = {
        name,
        email: email.toLowerCase(),
        password
    };

    users.push(newUser);
    saveUsers(users);

    res.json({ success: true, message: "Signup successful!" });
});

// LOGIN
router.post("/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
        return res.json({ success: false, message: "All fields required" });

    const users = getUsers();

    const user = users.find(
        u => u.email === email.toLowerCase() && u.password === password
    );

    if (!user)
        return res.json({ success: false, message: "Invalid email or password" });

    res.json({ success: true, message: "Login successful", user });
});

module.exports = router;
