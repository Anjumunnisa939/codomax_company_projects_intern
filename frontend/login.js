const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {

        const response = await fetch("/api/users/login", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        console.log(data);

        if (response.ok && data.success) {

            localStorage.setItem("steppiToken", data.token);
            localStorage.setItem("steppiUser", JSON.stringify(data.user));
            window.location.href = data.user.isAdmin
                ? "/admin-dashboard.html"
                : "/dashboard.html";

        } else {

            document.getElementById("message").textContent =
                data.message;

        }

    } catch (error) {

        console.log(error);

        document.getElementById("message").textContent =
            "Unable to connect to backend";
    }
});
