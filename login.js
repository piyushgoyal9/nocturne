const loginForm =
document.getElementById("login-form");

const message =
document.getElementById("message");

/* =========================
NORMAL LOGIN
========================= */

loginForm.addEventListener(
"submit",
async (event) => {


    event.preventDefault();


    const email =
        document
            .getElementById("email")
            .value;


    const password =
        document
            .getElementById("password")
            .value;


    try {

        const response =
            await fetch(

                "http://127.0.0.1:5000/api/auth/login",

                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            email,
                            password

                        })

                }

            );


        const data =
            await response.json();


        if (!response.ok) {

            message.innerText =
                data.message;

            return;

        }


        /* SAVE JWT */

        localStorage.setItem(
            "token",
            data.token
        );


        /* SAVE USER */

        localStorage.setItem(

            "user",

            JSON.stringify(
                data.user
            )

        );


        message.innerText =
            "Login successful!";


        /* REDIRECT */

        setTimeout(
            () => {

                window.location.href =
                    "index.html";

            },
            500
        );


    } catch (error) {

        console.error(error);


        message.innerText =
            "Unable to connect to Nocturne server.";

    }

}


);

/* =========================
GOOGLE LOGIN
========================= */

async function handleGoogleLogin(response) {

try {

    message.innerText =
        "Signing in with Google...";


    const backendResponse =
        await fetch(

            "http://127.0.0.1:5000/api/auth/google",

            {

                method: "POST",


                headers: {

                    "Content-Type":
                        "application/json"

                },


                body:
                    JSON.stringify({

                        credential:
                            response.credential

                    })

            }

        );


    const data =
        await backendResponse.json();


    if (!backendResponse.ok) {

        message.innerText =
            data.message ||
            "Google login failed.";

        return;

    }


    /* SAVE JWT */

    localStorage.setItem(
        "token",
        data.token
    );


    /* SAVE USER */

    localStorage.setItem(

        "user",

        JSON.stringify(
            data.user
        )

    );


    message.innerText =
        "Google login successful!";


    /* REDIRECT */

    setTimeout(
        () => {

            window.location.href =
                "index.html";

        },
        500
    );


} catch (error) {

    console.error(
        "Google login error:",
        error
    );


    message.innerText =
        "Unable to connect to Nocturne server.";

}

}

/* =========================
MAKE GOOGLE FUNCTION GLOBAL
========================= */

window.handleGoogleLogin =
handleGoogleLogin;
