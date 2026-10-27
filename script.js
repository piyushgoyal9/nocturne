/* =========================================================
   NOCTURNE - FRONTEND SCRIPT
========================================================= */

const API_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000"
        : "https://nocturne-backend-omnp.onrender.com";

/* =========================================================
   AUDIO PLAYER ELEMENTS
========================================================= */

const audio = document.getElementById("audio");

const playButton = document.getElementById("play");
const previousButton = document.getElementById("previous");
const nextButton = document.getElementById("next");
const shuffleButton = document.getElementById("shuffle");
const repeatButton = document.getElementById("repeat");

const progress = document.getElementById("progress");
const currentTime = document.getElementById("current-time");
const duration = document.getElementById("duration");

const playIcon = document.getElementById("play-icon");
const volume = document.getElementById("volume");

const songName = document.getElementById("song-name");
const songArtist = document.getElementById("song-artist");
const songImage = document.getElementById("song-image");


/* =========================================================
   AUTH ELEMENTS
========================================================= */

const authModal = document.getElementById("auth-modal");

const signupButton = document.getElementById("signup-button");
const loginButton = document.getElementById("login-button");
const closeAuth = document.getElementById("close-auth");

const signupForm = document.getElementById("signup-form");
const loginForm = document.getElementById("login-form");

const showLogin = document.getElementById("show-login");
const showSignup = document.getElementById("show-signup");

const authButtons = document.getElementById("auth-buttons");


/* =========================================================
   UPLOAD ELEMENTS
========================================================= */

const uploadModal = document.getElementById("upload-modal");
const closeUpload = document.getElementById("close-upload");
const uploadForm = document.getElementById("upload-form");
const uploadMessage = document.getElementById("upload-message");


/* =========================================================
   SEARCH ELEMENTS
========================================================= */

const searchButton = document.getElementById("search-button");
const searchContainer = document.getElementById("search-container");
const searchInput = document.getElementById("search-input");

const homeButton = document.getElementById("home-button");


/* =========================================================
   PLAYER STATE
========================================================= */

let shuffleEnabled = false;
let repeatEnabled = false;
let currentSong = 0;


/* =========================================================
   HELPERS
========================================================= */

function getCards() {
    return document.querySelectorAll(".card");
}


function buildAPIUrl(url) {

    if (!url) {
        return "";
    }

    if (url.startsWith("http://") || url.startsWith("https://")) {
        return url;
    }

    return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}


function getLoggedInUser() {

    const userData = localStorage.getItem("user");

    if (!userData) {
        return null;
    }

    try {
        return JSON.parse(userData);
    }

    catch (error) {

        console.error(
            "Invalid user data:",
            error
        );

        return null;

    }

}


function getToken() {
    return localStorage.getItem("token");
}


/* =========================================================
   PLAYER BUTTON STATE
========================================================= */

if (shuffleButton) {

    shuffleButton.classList.toggle(
        "active",
        shuffleEnabled
    );

}


if (repeatButton) {

    repeatButton.classList.toggle(
        "active",
        repeatEnabled
    );

}


/* =========================================================
   UPDATE PLAY BUTTON
========================================================= */

function updatePlayButton() {

    if (!playIcon || !audio) {
        return;
    }

    if (audio.paused) {

        playIcon.src = "img/play.svg";
        playIcon.alt = "Play";

    }

    else {

        playIcon.src = "img/pause.svg";
        playIcon.alt = "Pause";

    }

}


/* =========================================================
   LOAD SONG
========================================================= */

function loadSong(index) {

    if (!audio) {
        return;
    }

    const cards = getCards();

    const card = cards[index];

    if (!card) {
        return;
    }

    const song = card.dataset.song;
    const title = card.dataset.title || "Unknown";
    const artist = card.dataset.artist || "Unknown";

    const imageElement = card.querySelector("img");

    const image =
        imageElement
            ? imageElement.src
            : "img/music.svg";


    audio.src = song;

    if (songName) {
        songName.innerText = title;
    }

    if (songArtist) {
        songArtist.innerText = artist;
    }

    if (songImage) {
        songImage.src = image;
    }

    if (progress) {
        progress.value = 0;
    }

    if (currentTime) {
        currentTime.innerText = "0:00";
    }

    if (duration) {
        duration.innerText = "0:00";
    }

    currentSong = index;

    updateActiveCard();

}


/* =========================================================
   PLAY SONG
========================================================= */

function playSong() {

    if (!audio) {
        return;
    }

    audio.play().catch(error => {

        console.error(
            "Unable to play song:",
            error
        );

    });

}


/* =========================================================
   SETUP SONG CARD
========================================================= */

function setupSongCard(card) {

    if (!card) {
        return;
    }

    card.addEventListener("click", event => {

        /*
           Don't play the song when clicking
           the delete button.
        */

        if (
            event.target.closest(
                ".delete-song-button"
            )
        ) {
            return;
        }

        const cards = getCards();

        const index =
            Array.from(cards).indexOf(card);

        if (index === -1) {
            return;
        }

        loadSong(index);

        playSong();

        const playbar =
            document.querySelector(".playbar");

        if (playbar) {
            playbar.classList.remove("hidden");
        }

    });

}


/* =========================================================
   SETUP EXISTING STATIC SONG CARDS
========================================================= */

getCards().forEach(card => {

    setupSongCard(card);

});


/* =========================================================
   PLAY / PAUSE
========================================================= */

if (playButton && audio) {

    playButton.addEventListener("click", () => {

        if (audio.paused) {
            playSong();
        }

        else {
            audio.pause();
        }

    });

}


/* =========================================================
   AUDIO EVENTS
========================================================= */

if (audio) {

    audio.addEventListener(
        "play",
        updatePlayButton
    );


    audio.addEventListener(
        "pause",
        updatePlayButton
    );


    audio.addEventListener(
        "loadedmetadata",
        () => {

            if (progress) {
                progress.max = audio.duration;
            }

            if (duration) {

                duration.innerText =
                    formatTime(audio.duration);

            }

        }
    );


    audio.addEventListener(
        "timeupdate",
        () => {

            if (progress) {
                progress.value =
                    audio.currentTime;
            }

            if (currentTime) {

                currentTime.innerText =
                    formatTime(
                        audio.currentTime
                    );

            }

        }
    );


    audio.addEventListener(
        "ended",
        handleSongEnded
    );

}


/* =========================================================
   SEEK
========================================================= */

if (progress && audio) {

    progress.addEventListener(
        "input",
        () => {

            audio.currentTime =
                progress.value;

        }
    );

}


/* =========================================================
   VOLUME
========================================================= */

if (volume && audio) {

    volume.addEventListener(
        "input",
        () => {

            audio.volume =
                volume.value / 100;

        }
    );

}


/* =========================================================
   FORMAT TIME
========================================================= */

function formatTime(seconds) {

    if (
        !seconds ||
        isNaN(seconds)
    ) {
        return "0:00";
    }

    const minutes =
        Math.floor(seconds / 60);

    let secondsRemaining =
        Math.floor(seconds % 60);

    if (secondsRemaining < 10) {
        secondsRemaining =
            "0" + secondsRemaining;
    }

    return `${minutes}:${secondsRemaining}`;

}


/* =========================================================
   SONG ENDED
========================================================= */

function handleSongEnded() {

    const cards = getCards();

    if (cards.length === 0) {
        return;
    }


    if (repeatEnabled) {

        audio.currentTime = 0;

        playSong();

        return;

    }


    if (shuffleEnabled) {

        let randomSong;

        do {

            randomSong =
                Math.floor(
                    Math.random() *
                    cards.length
                );

        }

        while (
            randomSong === currentSong &&
            cards.length > 1
        );

        currentSong = randomSong;

    }

    else {

        currentSong++;

        if (
            currentSong >=
            cards.length
        ) {

            currentSong = 0;

        }

    }
        loadSong(currentSong);

    playSong();

}


/* =========================================================
   NEXT
========================================================= */

if (nextButton) {

    nextButton.addEventListener(
        "click",
        () => {

            const cards = getCards();

            if (cards.length === 0) {
                return;
            }


            if (shuffleEnabled) {

                let randomSong;

                do {

                    randomSong =
                        Math.floor(
                            Math.random() *
                            cards.length
                        );

                }

                while (
                    randomSong === currentSong &&
                    cards.length > 1
                );

                currentSong = randomSong;

            }

            else {

                currentSong++;

                if (
                    currentSong >=
                    cards.length
                ) {

                    currentSong = 0;

                }

            }


            loadSong(currentSong);

            playSong();

        }
    );

}


/* =========================================================
   PREVIOUS
========================================================= */

if (previousButton) {

    previousButton.addEventListener(
        "click",
        () => {

            const cards = getCards();

            if (cards.length === 0) {
                return;
            }


            currentSong--;

            if (currentSong < 0) {

                currentSong =
                    cards.length - 1;

            }


            loadSong(currentSong);

            playSong();

        }
    );

}


/* =========================================================
   ACTIVE CARD
========================================================= */

function updateActiveCard() {

    const cards = getCards();

    cards.forEach(
        (card, index) => {

            if (
                index === currentSong
            ) {

                card.classList.add(
                    "active"
                );

            }

            else {

                card.classList.remove(
                    "active"
                );

            }

        }
    );

}


/* =========================================================
   SHUFFLE
========================================================= */

if (shuffleButton) {

    shuffleButton.addEventListener(
        "click",
        () => {

            shuffleEnabled =
                !shuffleEnabled;

            shuffleButton.classList.toggle(
                "active",
                shuffleEnabled
            );

        }
    );

}


/* =========================================================
   REPEAT
========================================================= */

if (repeatButton) {

    repeatButton.addEventListener(
        "click",
        () => {

            repeatEnabled =
                !repeatEnabled;

            repeatButton.classList.toggle(
                "active",
                repeatEnabled
            );

        }
    );

}


/* =========================================================
   SEARCH
========================================================= */

if (
    searchButton &&
    searchContainer &&
    searchInput
) {

    searchButton.addEventListener(
        "click",
        () => {

            searchContainer.classList.toggle(
                "hidden"
            );

            if (
                !searchContainer.classList.contains(
                    "hidden"
                )
            ) {

                searchInput.focus();

            }

        }
    );


    searchInput.addEventListener(
        "input",
        () => {

            const searchText =
                searchInput.value
                    .toLowerCase()
                    .trim();


            const cards = getCards();


            cards.forEach(card => {

                const title =
                    (
                        card.dataset.title ||
                        ""
                    ).toLowerCase();


                const artist =
                    (
                        card.dataset.artist ||
                        ""
                    ).toLowerCase();


                if (
                    title.includes(searchText) ||
                    artist.includes(searchText)
                ) {

                    card.style.display = "";

                }

                else {

                    card.style.display =
                        "none";

                }

            });

        }
    );

}


/* =========================================================
   HOME
========================================================= */

if (homeButton) {

    homeButton.addEventListener(
        "click",
        () => {

            if (searchInput) {
                searchInput.value = "";
            }

            if (searchContainer) {

                searchContainer.classList.add(
                    "hidden"
                );

            }

            getCards().forEach(card => {

                card.style.display = "";

            });

        }
    );

}


/* =========================================================
   AUTH MODAL
========================================================= */

if (signupButton) {

    signupButton.addEventListener(
        "click",
        () => {

            if (!authModal) {
                return;
            }

            authModal.classList.remove(
                "hidden"
            );

            if (signupForm) {
                signupForm.classList.remove(
                    "hidden"
                );
            }

            if (loginForm) {
                loginForm.classList.add(
                    "hidden"
                );
            }

        }
    );

}


if (loginButton) {

    loginButton.addEventListener(
        "click",
        () => {

            if (!authModal) {
                return;
            }

            authModal.classList.remove(
                "hidden"
            );

            renderGoogleSignInButton();

            if (loginForm) {
                loginForm.classList.remove(
                    "hidden"
                );
            }

            if (signupForm) {
                signupForm.classList.add(
                    "hidden"
                );
            }

        }
    );

}


if (closeAuth) {

    closeAuth.addEventListener(
        "click",
        () => {

            if (authModal) {
                authModal.classList.add(
                    "hidden"
                );
            }

        }
    );

}


if (showLogin) {

    showLogin.addEventListener(
        "click",
        () => {

            if (signupForm) {
                signupForm.classList.add(
                    "hidden"
                );
            }

            if (loginForm) {
                loginForm.classList.remove(
                    "hidden"
                );
            }

            renderGoogleSignInButton();

        }
    );

}


if (showSignup) {

    showSignup.addEventListener(
        "click",
        () => {

            if (loginForm) {
                loginForm.classList.add(
                    "hidden"
                );
            }

            if (signupForm) {
                signupForm.classList.remove(
                    "hidden"
                );
            }

        }
    );

}


/* =========================================================
   GOOGLE SIGN-IN
========================================================= */

const GOOGLE_CLIENT_ID =
    "687284331652-tgq1ea8aj5sgnfihek8nbmk4oumkbbep.apps.googleusercontent.com";

let googleIdentityScriptPromise = null;
let googleIdentityInitialized = false;

function loadGoogleIdentityServices() {
    if (window.google?.accounts?.id) {
        return Promise.resolve();
    }

    if (googleIdentityScriptPromise) {
        return googleIdentityScriptPromise;
    }

    googleIdentityScriptPromise = new Promise((resolve, reject) => {
        let script = document.querySelector(
            'script[src="https://accounts.google.com/gsi/client"]'
        );

        const onLoad = () => {
            if (window.google?.accounts?.id) {
                resolve();
            } else {
                reject(new Error("Google Identity Services did not initialize."));
            }
        };

        const onError = () => {
            reject(new Error("Could not load Google Identity Services."));
        };

        if (script) {
            script.addEventListener("load", onLoad, { once: true });
            script.addEventListener("error", onError, { once: true });

            if (window.google?.accounts?.id) {
                resolve();
            }
            return;
        }

        script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.addEventListener("load", onLoad, { once: true });
        script.addEventListener("error", onError, { once: true });
        document.head.appendChild(script);
    });

    return googleIdentityScriptPromise;
}

async function renderGoogleSignInButton() {
    const buttonContainer = document.getElementById("google-button");

    if (!buttonContainer) {
        console.warn(
            'Google sign-in container "#google-button" was not found in index.html.'
        );
        return;
    }

    try {
        await loadGoogleIdentityServices();

        if (!googleIdentityInitialized) {
            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: window.handleGoogleLogin,
                auto_select: false,
                cancel_on_tap_outside: true
            });

            googleIdentityInitialized = true;
        }

        buttonContainer.innerHTML = "";

        window.google.accounts.id.renderButton(buttonContainer, {
            type: "standard",
            theme: "filled_black",
            size: "large",
            text: "continue_with",
            shape: "rectangular",
            logo_alignment: "left",
            width: Math.max(
                220,
                Math.min(buttonContainer.clientWidth || 320, 400)
            )
        });
    } catch (error) {
        console.error("Google sign-in button error:", error);
        buttonContainer.innerHTML =
            '<p class="google-login-error">Google sign-in could not load. Check your connection and try again.</p>';
    }
}

window.handleGoogleLogin = async function (googleResponse) {
    if (!googleResponse?.credential) {
        alert("Google did not return a sign-in credential. Please try again.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/google`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                credential: googleResponse.credential
            })
        });

        let data;
        try {
            data = await response.json();
        } catch {
            throw new Error("The server returned an invalid response.");
        }

        if (!response.ok) {
            throw new Error(data.message || "Google sign-in failed.");
        }

        if (!data.token || !data.user) {
            throw new Error("The server response did not include a token and user.");
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        if (authModal) {
            authModal.classList.add("hidden");
        }

        showLoggedInUser();
        await refreshUploadedSongs();
    } catch (error) {
        console.error("Google login error:", error);
        alert(error.message || "Unable to sign in with Google. Please try again.");
    }
};
/* =========================================================
   SIGNUP
========================================================= */

if (signupForm) {

    signupForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const username =
                document
                    .getElementById(
                        "signup-username"
                    )
                    ?.value
                    .trim();


            const email =
                document
                    .getElementById(
                        "signup-email"
                    )
                    ?.value
                    .trim();


            const password =
                document
                    .getElementById(
                        "signup-password"
                    )
                    ?.value;


            try {

                const response =
                    await fetch(
                        `${API_URL}/api/auth/signup`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    username,
                                    email,
                                    password
                                })
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    alert(
                        data.message ||
                        "Signup failed."
                    );

                    return;

                }


                if (authModal) {

                    authModal.classList.add(
                        "hidden"
                    );

                }


                signupForm.reset();


                alert(
                    "Account created successfully!"
                );

            }

            catch (error) {

                console.error(
                    "Signup error:",
                    error
                );

                alert(
                    "Unable to connect to Nocturne server."
                );

            }

        }
    );

}


/* =========================================================
   LOGIN
========================================================= */

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const email =
                document
                    .getElementById(
                        "login-email"
                    )
                    ?.value
                    .trim();


            const password =
                document
                    .getElementById(
                        "login-password"
                    )
                    ?.value;


            try {

                const response =
                    await fetch(
                        `${API_URL}/api/auth/login`,
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

                    alert(
                        data.message ||
                        "Login failed."
                    );

                    return;

                }


                localStorage.setItem(
                    "token",
                    data.token
                );


                localStorage.setItem(
                    "user",
                    JSON.stringify(
                        data.user
                    )
                );


                if (authModal) {

                    authModal.classList.add(
                        "hidden"
                    );

                }


                loginForm.reset();


                showLoggedInUser();

                await refreshUploadedSongs();

            }

            catch (error) {

                console.error(
                    "Login error:",
                    error
                );

                alert(
                    "Unable to connect to Nocturne server."
                );

            }

        }
    );

}


/* =========================================================
   SHOW LOGGED-IN USER
========================================================= */

function showLoggedInUser() {

    if (!authButtons) {
        return;
    }


    const token = getToken();
    const user = getLoggedInUser();


    if (!token || !user) {
        return;
    }


    authButtons.innerHTML = `

        <button id="upload-song-button">
            Upload Song
        </button>

        <span class="welcome-user">
            Hi, ${user.username}
        </span>

        <button id="logout-button">
            Log Out
        </button>

    `;


    const logoutButton =
        document.getElementById(
            "logout-button"
        );


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            () => {

                localStorage.removeItem(
                    "token"
                );

                localStorage.removeItem(
                    "user"
                );

                window.location.reload();

            }
        );

    }


    const uploadButton =
        document.getElementById(
            "upload-song-button"
        );


    if (uploadButton) {

        uploadButton.addEventListener(
            "click",
            () => {

                if (!getToken()) {

                    alert(
                        "Please log in first."
                    );

                    return;

                }


                if (uploadModal) {

                    uploadModal.classList.remove(
                        "hidden"
                    );

                }

            }
        );

    }

}


/* =========================================================
   AUTH MODAL OUTSIDE CLICK
========================================================= */

if (authModal) {

    authModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                authModal
            ) {

                authModal.classList.add(
                    "hidden"
                );

            }

        }
    );

}


/* =========================================================
   DELETE DATABASE SONG
========================================================= */

async function deleteSong(songId, card) {

    const token = getToken();


    if (!token) {

        alert(
            "Please log in first."
        );

        return;

    }


    if (!songId) {

        alert(
            "This song cannot be deleted."
        );

        return;

    }


    const confirmed =
        confirm(
            "Are you sure you want to delete this song?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/api/songs/${songId}`,
                {
                    method: "DELETE",

                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.message ||
                "Failed to delete song."
            );

            return;

        }


        if (
            card &&
            card.classList.contains("active")
        ) {

            audio.pause();
            audio.src = "";

            if (songName) {
                songName.innerText = "";
            }

            if (songArtist) {
                songArtist.innerText = "";
            }

            if (songImage) {
                songImage.src =
                    "img/music.svg";
            }

        }


        if (card) {
            card.remove();
        }


        const cards = getCards();


        if (cards.length === 0) {

            currentSong = 0;

        }

        else if (
            currentSong >=
            cards.length
        ) {

            currentSong =
                cards.length - 1;

        }


        alert(
            "Song deleted successfully."
        );

    }

    catch (error) {

        console.error(
            "Delete error:",
            error
        );

        alert(
            "Unable to connect to Nocturne server."
        );

    }

}
/* =========================================================
   CREATE DATABASE SONG CARD
========================================================= */

function createSongCard(song) {

    if (!song || !song._id) {

        console.error(
            "Invalid database song:",
            song
        );

        return null;

    }


    const card =
        document.createElement("div");


    card.classList.add("card");


    /* -----------------------------------------
       DATABASE SONG IDENTIFICATION
    ----------------------------------------- */

    card.dataset.databaseSong = "true";

    card.dataset.id =
        song._id;


    card.dataset.song =
        buildAPIUrl(
            song.audioUrl
        );


    card.dataset.title =
        song.title || "Unknown";


    card.dataset.artist =
        song.artist || "Unknown";


    /* -----------------------------------------
       COVER
    ----------------------------------------- */

    const cover =
        song.coverUrl
            ? buildAPIUrl(
                song.coverUrl
            )
            : "img/music.svg";


    /* -----------------------------------------
       CURRENT USER
    ----------------------------------------- */

    const user =
        getLoggedInUser();


    let canDelete = false;


    if (user) {

        const uploadedById =
            song.uploadedBy &&
            typeof song.uploadedBy === "object"
                ? song.uploadedBy._id
                : song.uploadedBy;


        canDelete =
            String(user.id) ===
            String(uploadedById) ||
            user.isAdmin === true;

    }


    /* -----------------------------------------
       CARD HTML
    ----------------------------------------- */

    card.innerHTML = `

        <img
            src="${cover}"
            alt="${song.title || "Song"}"
        >

        <h2>
            ${song.title || "Unknown"}
        </h2>

        <p>
            ${song.artist || "Unknown"}
        </p>

        ${
            canDelete
                ? `
                    <button
                        class="delete-song-button"
                        type="button"
                        title="Delete song"
                    >
                        🗑
                    </button>
                `
                : ""
        }

    `;


    /* -----------------------------------------
       PLAY
    ----------------------------------------- */

    setupSongCard(card);


    /* -----------------------------------------
       DELETE
    ----------------------------------------- */

    const deleteButton =
        card.querySelector(
            ".delete-song-button"
        );


    if (deleteButton) {

        deleteButton.addEventListener(
            "click",
            event => {

                event.preventDefault();

                event.stopPropagation();


                deleteSong(
                    song._id,
                    card
                );

            }
        );

    }


    return card;

}


/* =========================================================
   LOAD DATABASE SONGS
========================================================= */

async function loadUploadedSongs() {

    const cardContainer =
        document.querySelector(
            ".cardcontainer"
        );


    if (!cardContainer) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/api/songs`
            );


        if (!response.ok) {

            throw new Error(
                `API returned ${response.status}`
            );

        }


        const songs =
            await response.json();


        if (!Array.isArray(songs)) {

            throw new Error(
                "Invalid songs response."
            );

        }


        songs.forEach(song => {

            const card =
                createSongCard(song);


            if (card) {

                cardContainer.appendChild(
                    card
                );

            }

        });

    }

    catch (error) {

        console.error(
            "Failed to load uploaded songs:",
            error
        );

    }

}


/* =========================================================
   REFRESH DATABASE SONGS
========================================================= */

async function refreshUploadedSongs() {

    const cardContainer =
        document.querySelector(
            ".cardcontainer"
        );


    if (!cardContainer) {
        return;
    }


    /*
       Remove ONLY database songs.

       Static songs remain untouched.
    */

    cardContainer
        .querySelectorAll(
            '.card[data-database-song="true"]'
        )
        .forEach(card => {

            card.remove();

        });


    await loadUploadedSongs();

}


/* =========================================================
   LOAD DATABASE SONGS ON START
========================================================= */

loadUploadedSongs();


/* =========================================================
   UPLOAD MODAL
========================================================= */

if (closeUpload) {

    closeUpload.addEventListener(
        "click",
        () => {

            if (uploadModal) {

                uploadModal.classList.add(
                    "hidden"
                );

            }

        }
    );

}


if (uploadModal) {

    uploadModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                uploadModal
            ) {

                uploadModal.classList.add(
                    "hidden"
                );

            }

        }
    );

}


/* =========================================================
   UPLOAD SONG
========================================================= */

if (uploadForm) {

    uploadForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const token =
                getToken();

            const user =
                getLoggedInUser();


            if (!token || !user) {

                uploadMessage.innerText =
                    "Please log in first.";

                return;

            }


            const title =
                document
                    .getElementById(
                        "upload-title"
                    )
                    ?.value
                    .trim();


            const artist =
                document
                    .getElementById(
                        "upload-artist"
                    )
                    ?.value
                    .trim();


            const audioFile =
                document
                    .getElementById(
                        "upload-audio"
                    )
                    ?.files[0];


            const coverFile =
                document
                    .getElementById(
                        "upload-cover"
                    )
                    ?.files[0];


            if (!title || !artist) {

                uploadMessage.innerText =
                    "Please enter title and artist.";

                return;

            }


            if (!audioFile) {

                uploadMessage.innerText =
                    "Please select an audio file.";

                return;

            }


            const formData =
                new FormData();


            formData.append(
                "title",
                title
            );


            formData.append(
                "artist",
                artist
            );


            formData.append(
                "uploadedBy",
                user.id
            );


            formData.append(
                "audio",
                audioFile
            );


            if (coverFile) {

                formData.append(
                    "cover",
                    coverFile
                );

            }


            try {

                uploadMessage.innerText =
                    "Uploading...";


                const response =
                    await fetch(
                        `${API_URL}/api/songs/upload`,
                        {
                            method: "POST",

                            headers: {
                                Authorization:
                                    `Bearer ${token}`
                            },

                            body: formData
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    uploadMessage.innerText =
                        data.message ||
                        "Upload failed.";

                    return;

                }


                uploadMessage.innerText =
                    "Song uploaded successfully!";


                uploadForm.reset();


                /*
                   Instead of blindly adding
                   data.song, refresh database
                   songs from the API.
                */

                await refreshUploadedSongs();


                setTimeout(
                    () => {

                        if (uploadModal) {

                            uploadModal.classList.add(
                                "hidden"
                            );

                        }

                        uploadMessage.innerText =
                            "";

                    },
                    800
                );

            }

            catch (error) {

                console.error(
                    "Upload error:",
                    error
                );

                uploadMessage.innerText =
                    "Unable to connect to Nocturne server.";

            }

        }
    );

}

/* =========================================================
   FORGOT PASSWORD
========================================================= */

const forgotPasswordLink = document.getElementById("forgot-password-link");

if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", async (event) => {
        event.preventDefault();

        const email = prompt("Enter your registered email address:");

        if (!email || !email.trim()) {
            return;
        }

        try {
            const response = await fetch(
                `${API_URL}/api/auth/forgot-password`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email: email.trim().toLowerCase()
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                console.error("Forgot password API error:", response.status, data);
                alert(data.message || "Unable to process your request.");
                return;
            }

            alert(
                data.message ||
                "If an account exists with that email, password reset instructions will be sent."
            );
        } catch (error) {
            console.error("Forgot password error:", error);
            alert("Unable to connect to the server. Please try again later.");
        }
    });
}



/* =========================================================
   SHOW USER ON PAGE LOAD
========================================================= */

showLoggedInUser();