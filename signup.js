const signupForm = document.getElementById("signup-form");
const message = document.getElementById("message");

signupForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {

        const response = await fetch(
            "http://localhost:5000/api/auth/signup",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    username,
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

        message.innerText = "Account created successfully!";

        signupForm.reset();

        // Go to login page
        setTimeout(() => {
            window.location.href = "login.html";
        }, 700);

    } catch (error) {

        console.error(error);

        message.innerText =
            "Unable to connect to Nocturne server.";
    }
});