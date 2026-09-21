const token = localStorage.getItem("steppiToken");
const welcomeMessage = document.getElementById("welcomeMessage");
const profileDetails = document.getElementById("profileDetails");
const myBlogs = document.getElementById("myBlogs");
const adminPanel = document.getElementById("adminPanel");
const userCount = document.getElementById("userCount");
const userList = document.getElementById("userList");
const adminMessage = document.getElementById("adminMessage");

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

function renderProfile(user) {
    welcomeMessage.textContent = `Welcome, ${user.name}`;
    profileDetails.textContent = `${user.email} | Role: ${user.isAdmin ? "Administrator" : "User"}`;
}

function renderBlogs(blogs) {
    if (!blogs.length) {
        myBlogs.textContent = "You have not published any blogs yet.";
        return;
    }

    myBlogs.replaceChildren(...blogs.map((blog) => {
        const article = document.createElement("article");
        article.className = "dashboard-blog";
        const title = document.createElement("h3");
        title.textContent = blog.title;
        const content = document.createElement("p");
        content.textContent = blog.content;
        const date = document.createElement("small");
        date.textContent = new Date(blog.createdAt).toLocaleDateString();
        article.append(title, content, date);
        return article;
    }));
}

function renderUsers(users) {
    userList.replaceChildren(...users.map((user) => {
        const row = document.createElement("div");
        row.className = "admin-user-row";

        const details = document.createElement("span");
        details.textContent = `${user.name} (${user.email})`;

        const passwordInput = document.createElement("input");
        passwordInput.type = "password";
        passwordInput.placeholder = "New password";
        passwordInput.minLength = 6;

        const updateButton = document.createElement("button");
        updateButton.type = "button";
        updateButton.textContent = "Update Password";
        updateButton.addEventListener("click", async () => {
            if (passwordInput.value.length < 6) {
                adminMessage.textContent = "Password must contain at least 6 characters.";
                return;
            }

            try {
                const data = await apiRequest(`/api/admin/users/${user.id}/password`, {
                    method: "PUT",
                    body: JSON.stringify({ password: passwordInput.value })
                });
                adminMessage.textContent = data.message;
                passwordInput.value = "";
            } catch (error) {
                adminMessage.textContent = error.message;
            }
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Delete User";
        deleteButton.className = "danger-button";
        deleteButton.disabled = user.isAdmin;
        deleteButton.title = user.isAdmin ? "Administrator accounts cannot be deleted here." : "Delete this user";
        deleteButton.addEventListener("click", async () => {
            if (!confirm(`Delete ${user.name}'s account?`)) {
                return;
            }

            try {
                const data = await apiRequest(`/api/admin/users/${user.id}`, { method: "DELETE" });
                adminMessage.textContent = data.message;
                await loadAdminUsers();
            } catch (error) {
                adminMessage.textContent = error.message;
            }
        });

        row.append(details, passwordInput, updateButton, deleteButton);
        return row;
    }));
}

async function loadAdminUsers() {
    const data = await apiRequest("/api/admin/users");
    if (!data) return;
    userCount.textContent = `${data.count} user${data.count === 1 ? "" : "s"}`;
    renderUsers(data.users);
}

async function loadDashboard() {
    try {
        const profile = await apiRequest("/api/auth/profile");
        if (!profile) return;

        if (profile.user.isAdmin) {
            window.location.replace("admin-dashboard.html");
            return;
        }

        renderProfile(profile.user);

        const blogs = await apiRequest("/api/blogs/my");
        if (!blogs) return;
        renderBlogs(blogs.blogs);

        if (profile.user.isAdmin) {
            adminPanel.hidden = false;
            await loadAdminUsers();
        }
    } catch (error) {
        welcomeMessage.textContent = error.message;
    }
}

document.getElementById("logoutButton").addEventListener("click", async () => {
    try {
        await apiRequest("/api/auth/logout", { method: "POST" });
    } finally {
        localStorage.removeItem("steppiToken");
        localStorage.removeItem("steppiUser");
        window.location.replace("login.html");
    }
});

loadDashboard();
