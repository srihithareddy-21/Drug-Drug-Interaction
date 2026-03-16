document.addEventListener("submit", (e) => {
    e.preventDefault();
});

const API = "http://localhost:5000";


function getUser() {
    return JSON.parse(localStorage.getItem("medmix_user") || "null");
}
function setUser(u) {
    if (u) localStorage.setItem("medmix_user", JSON.stringify(u));
    else localStorage.removeItem("medmix_user");
}


function updateNav() {
    const user = getUser();
    const loginBtn = document.getElementById("navLogin");
    const logoutBtn = document.getElementById("logoutBtn");

    if (loginBtn) {
        loginBtn.style.display = user ? "none" : "inline-block";
    }

    if (logoutBtn) {
        logoutBtn.style.display = user ? "inline-block" : "none";
        logoutBtn.onclick = () => {
            setUser(null);
            window.location.href = "index.html";
        };
    }
}


async function initHome() {
    updateNav();

    const btn = document.getElementById("checkBtn");
    const r = document.getElementById("result");

    btn.onclick = async () => {
        const d1 = document.getElementById("drug1").value.trim();
        const d2 = document.getElementById("drug2").value.trim();

        if (!d1 || !d2) {
            r.style.display = "block";
            r.innerHTML = "<p style='color:red'>Enter both medicines.</p>";
            return;
        }

        r.style.display = "block";
        r.innerHTML = "Checking...";

        const res = await fetch(`${API}/check?drug1=${encodeURIComponent(d1)}&drug2=${encodeURIComponent(d2)}`);
        const data = await res.json();

        if (!data.found) {
            r.innerHTML = data.message;
            return;
        }

        const i = data.interaction;

        r.innerHTML = `
            <h3>⚠ Interaction Found</h3>
            <p><strong>Severity:</strong> ${i.severity}</p>
            <p><strong>Effect:</strong> ${i.effect}</p>
            <p><strong>Suggestion:</strong> ${i.suggestions}</p>
            <hr>
            <p><strong>AI Explanation:</strong> ${data.ai}</p>
        `;

        const user = getUser();
        if (user) {
            await fetch(`${API}/save-history`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: user.email,
                    drug1: d1,
                    drug2: d2,
                    resultText: `${i.severity} - ${i.effect}`
                })
            });
        }
    };
}


async function initLogin() {
    updateNav();

    const btn = document.getElementById("loginBtn");
    const msg = document.getElementById("loginMsg");

    btn.onclick = async () => {
        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value.trim();

        if (!email || !password) {
            msg.textContent = "Enter both fields.";
            return;
        }

        const res = await fetch(`${API}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        msg.textContent = data.message;

        if (data.success) {
            setUser(data.user);
            window.location.href = "index.html";
        }
    };
}

// ---------------- SIGNUP ----------------
async function initSignup() {
    updateNav();

    const btn = document.getElementById("signupBtn");
    const msg = document.getElementById("signupMsg");

    btn.onclick = async () => {
        const name = document.getElementById("signupName").value.trim();
        const email = document.getElementById("signupEmail").value.trim();
        const password = document.getElementById("signupPassword").value.trim();

        if (!name || !email || !password) {
            msg.textContent = "Fill all fields.";
            return;
        }

        const res = await fetch(`${API}/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });

        const data = await res.json();
        msg.textContent = data.message;

        if (data.success) {
            setTimeout(() => { window.location.href = "login.html"; }, 800);
        }
    };
}

// ---------------- PROFILE ----------------
async function initProfile() {
    updateNav();
    const user = getUser();
    if (!user) return (window.location.href = "login.html");

    document.getElementById("profileName").textContent = user.name;
    document.getElementById("profileEmail").textContent = user.email;

    document.getElementById("logoutBtn2").onclick = () => {
        setUser(null);
        window.location.href = "index.html";
    };
}

// ---------------- HISTORY ----------------
async function initHistory() {
    updateNav();
    const user = getUser();
    if (!user) return (window.location.href = "login.html");

    const res = await fetch(`${API}/history?email=${user.email}`);
    const list = document.getElementById("historyList");
    const data = await res.json();

    list.innerHTML = "";
    data.forEach(h => {
        const li = document.createElement("li");
        li.innerHTML = `<strong>${h.drug1} + ${h.drug2}</strong>
                        <br>${h.resultText}
                        <br><small>${new Date(h.time).toLocaleString()}</small>`;
        list.appendChild(li);
    });
}

// ---------------- PAGE LOADER ----------------
document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.dataset.page;

    if (page === "home") initHome();
    if (page === "login") initLogin();
    if (page === "signup") initSignup();
    if (page === "profile") initProfile();
    if (page === "history") initHistory();
});
