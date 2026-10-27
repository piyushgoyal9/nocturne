
const API_URL = "http://127.0.0.1:5000/api/auth";

const loginForm = document.getElementById("login-form");
const message = document.getElementById("message");

let isLoggingIn = false;

// =========================
// SHARED LOGIN HANDLER
// =========================

function saveLogin(data, successMessage) {
    if (!data.token || !data.user) {
        throw new Error("Invalid login response from server.");
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    message.innerText = successMessage;

    setTimeout(() => {
        window.location.href = "index.html";
    }, 500);
}

async function postLogin(endpoint, body) {
    const response = await fetch(`${API_URL}/${endpoint}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.message || "Authentication failed. Please try again."
        );
    }

    return data;
}

// =========================
// NORMAL LOGIN
// =========================

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isLoggingIn) return;

    isLoggingIn = true;

    const submitButton = loginForm.querySelector(
        'button[type="submit"]'
    );

    submitButton.disabled = true;
    message.innerText = "Logging in...";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
        const data = await postLogin("login", {
            email,
            password
        });

        saveLogin(data, "Login successful!");
    } catch (error) {
        console.error("Login error:", error);
        message.innerText =
            error.message || "Unable to connect to Nocturne server.";
    } finally {
        isLoggingIn = false;
        submitButton.disabled = false;
    }
});

// =========================
// GOOGLE LOGIN
// =========================

async function handleGoogleLogin(response) {
    if (isLoggingIn) return;

    if (!response || !response.credential) {
        message.innerText = "Google did not return a valid credential.";
        return;
    }

    isLoggingIn = true;
    message.innerText = "Signing in with Google...";

    try {
        const data = await postLogin("google", {
            credential: response.credential
        });

        saveLogin(data, "Google login successful!");
    } catch (error) {
        console.error("Google login error:", error);

        message.innerText =
            error.message || "Unable to connect to Nocturne server.";
    } finally {
        isLoggingIn = false;
    }
}

// Google Identity Services needs access to this callback globally.
window.handleGoogleLogin = handleGoogleLogin;
