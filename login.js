const loginForm = document.getElementById("login-form");
const message = document.getElementById("message");

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {

        const response = await fetch(
            "http://localhost:5000/api/auth/login",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email,
                    password
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {

            message.innerText = data.message;

            return;
        }

        // Save JWT
        localStorage.setItem("token", data.token);

        // Save user information
        localStorage.setItem(
            "user",
            JSON.stringify(data.user)
        );

        message.innerText = "Login successful!";

        // Go to Nocturne
        setTimeout(() => {

            window.location.href = "index.html";

        }, 500);

    } catch (error) {

        console.error(error);

        message.innerText =
            "Unable to connect to Nocturne server.";
    }
});