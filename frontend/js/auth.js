const API_URL = "";

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const message = document.getElementById("message");

        try {
            const response = await fetch(`${API_URL}/login`, {
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

            if (!response.ok) {
                message.textContent = data.detail || "Login failed";
                return;
            }

            localStorage.setItem(
                "access_token",
                data.access_token
            );

            message.textContent = "Login successful";

            window.location.href = "dashboard.html";

        } catch (error) {
            message.textContent = "Could not connect to server";
        }
    });
}

const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const name = document.getElementById("name").value;
        const email = document.getElementById("registerEmail").value;
        const password = document.getElementById("registerPassword").value;
        const message = document.getElementById("registerMessage");

        try {
            const response = await fetch(`${API_URL}/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: name,
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                if (Array.isArray(data.detail)) {
                    message.textContent = data.detail[0].msg;
                } else {
                    message.textContent = data.detail || "Registration failed";
                }

                return;
            }

            message.textContent = "Account created successfully";

            setTimeout(function () {
            window.location.href = "/";
        }, 1000);

        } catch (error) {
            message.textContent = "Could not connect to server";
        }
    });
}