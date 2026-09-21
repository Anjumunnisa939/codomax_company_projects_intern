const token = localStorage.getItem("steppiToken");
const userList = document.getElementById("userList");
const adminMessage = document.getElementById("adminMessage");
const adminIdentity = document.getElementById("adminIdentity");

if (!token) {
    window.location.replace("login.html");
}

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(options.headers || {})
        }
    });

    if (response.status === 401) {
        localStorage.removeItem("steppiToken");
        localStorage.removeItem("steppiUser");
        window.location.replace("login.html");
        return null;
    }

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || "Request failed.");
    }
    return data;
}

function updateStats(users) {
    const adminUsers = users.filter((user) => user.isAdmin);
    document.getElementById("userCount").textContent = users.length;
    document.getElementById("adminCount").textContent = adminUsers.length;
    document.getElementById("memberCount").textContent = users.length - adminUsers.length;
}

function renderUsers(users) {
    userList.replaceChildren(...users.map((user) => {
        const row = document.createElement("article");
        row.className = "admin-account";

        const identity = document.createElement("div");
        identity.className = "admin-account-identity";
        const name = document.createElement("h3");
        name.textContent = user.name;
        const email = document.createElement("p");
        email.textContent = user.email;
        const joined = document.createElement("small");
        joined.textContent = `Joined ${new Date(user.createdAt).toLocaleDateString()}`;
        identity.append(name, email, joined);

        const role = document.createElement("span");
        role.className = user.isAdmin ? "role-badge admin-role" : "role-badge";
        role.textContent = user.isAdmin ? "Administrator" : "Member";

        const actions = document.createElement("div");
        actions.className = "admin-account-actions";
        const password = document.createElement("input");
        password.type = "password";
        password.placeholder = "New password";
        password.minLength = 6;
        const update = document.createElement("button");
        update.type = "button";
        update.textContent = "Change password";
        update.addEventListener("click", async () => {
            if (password.value.length < 6) {
                adminMessage.textContent = "Password must contain at least 6 characters.";
                return;
            }
            try {
                const result = await apiRequest(`/api/admin/users/${user.id}/password`, {
                    method: "PUT",
                    body: JSON.stringify({ password: password.value })
                });
                password.value = "";
                adminMessage.textContent = result.message;
            } catch (error) {
                adminMessage.textContent = error.message;
            }
        });

        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "Delete user";
        remove.className = "danger-button";
        remove.disabled = user.isAdmin;
        remove.title = user.isAdmin ? "Administrator accounts cannot be deleted here." : "Delete this user";
        remove.addEventListener("click", async () => {
            if (!confirm(`Delete ${user.name}'s account?`)) return;
            try {
                const result = await apiRequest(`/api/admin/users/${user.id}`, { method: "DELETE" });
                adminMessage.textContent = result.message;
                await loadUsers();
            } catch (error) {
                adminMessage.textContent = error.message;
            }
        });

        actions.append(password, update, remove);
        row.append(identity, role, actions);
        return row;
    }));
}

async function loadUsers() {
    try {
        const data = await apiRequest("/api/admin/users");
        if (!data) return;
        updateStats(data.users);
        renderUsers(data.users);
    } catch (error) {
        adminMessage.textContent = error.message;
        if (error.message.includes("Administrator")) {
            setTimeout(() => window.location.replace("dashboard.html"), 800);
        }
    }
}

async function startAdminDashboard() {
    try {
        const profile = await apiRequest("/api/auth/profile");
        if (!profile) return;
        if (!profile.user.isAdmin) {
            window.location.replace("dashboard.html");
            return;
        }
        adminIdentity.textContent = `Signed in as ${profile.user.name} (${profile.user.email})`;
        await loadUsers();
    } catch (error) {
        adminMessage.textContent = error.message;
    }
}

document.getElementById("refreshUsers").addEventListener("click", loadUsers);
document.getElementById("adminLogout").addEventListener("click", () => {
    localStorage.removeItem("steppiToken");
    localStorage.removeItem("steppiUser");
    window.location.replace("login.html");
});

startAdminDashboard();
