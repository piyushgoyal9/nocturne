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


/* =========================
   GET ALL SONG CARDS
========================= */

function getCards() {
    return document.querySelectorAll(".card");
}


/* =========================
   PLAYER STATE
========================= */

let shuffleEnabled = false;
let repeatEnabled = false;

shuffleButton.classList.toggle("active", shuffleEnabled);
repeatButton.classList.toggle("active", repeatEnabled);

let currentSong = 0;


/* =========================
   UPDATE PLAY BUTTON
========================= */

function updatePlayButton() {

    if (audio.paused) {

        playIcon.src = "img/play.svg";
        playIcon.alt = "Play";

    } else {

        playIcon.src = "img/pause.svg";
        playIcon.alt = "Pause";

    }

}


/* =========================
   LOAD SONG
========================= */

function loadSong(index) {

    const cards = getCards();
    const card = cards[index];

    if (!card) {
        return;
    }

    const song = card.dataset.song;
    const title = card.dataset.title;
    const artist = card.dataset.artist;

    const imageElement = card.querySelector("img");

    const image =
        imageElement
            ? imageElement.src
            : "img/music.svg";

    audio.src = song;

    songName.innerText = title;
    songArtist.innerText = artist;
    songImage.src = image;

    progress.value = 0;

    currentTime.innerText = "0:00";
    duration.innerText = "0:00";

    currentSong = index;

    updateActiveCard();
}


/* =========================
   PLAY SONG
========================= */

function playSong() {

    audio.play().catch(error => {

        console.error(
            "Unable to play song:",
            error
        );

    });

}


/* =========================
   SETUP SONG CARD
========================= */

function setupSongCard(card) {

    card.addEventListener("click", () => {

        const cards = getCards();

        const index =
            Array.from(cards).indexOf(card);

        if (index === -1) {
            return;
        }

        loadSong(index);

        playSong();

        document
            .querySelector(".playbar")
            .classList.remove("hidden");

    });

}


/* =========================
   SETUP EXISTING CARDS
========================= */

getCards().forEach(card => {

    setupSongCard(card);

});


/* =========================
   PLAY / PAUSE
========================= */

playButton.addEventListener("click", () => {

    if (audio.paused) {

        audio.play();

    } else {

        audio.pause();

    }

});


/* =========================
   AUDIO EVENTS
========================= */

audio.addEventListener("play", () => {

    updatePlayButton();

});


audio.addEventListener("pause", () => {

    updatePlayButton();

});


audio.addEventListener("loadedmetadata", () => {

    progress.max = audio.duration;

    duration.innerText =
        formatTime(audio.duration);

});


audio.addEventListener("timeupdate", () => {

    progress.value = audio.currentTime;

    currentTime.innerText =
        formatTime(audio.currentTime);

});


/* =========================
   SEEK
========================= */

progress.addEventListener("input", () => {

    audio.currentTime = progress.value;

});


/* =========================
   VOLUME
========================= */

volume.addEventListener("input", () => {

    audio.volume =
        volume.value / 100;

});


/* =========================
   SONG ENDED
========================= */

audio.addEventListener("ended", () => {

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
                    Math.random() * cards.length
                );

        } while (
            randomSong === currentSong &&
            cards.length > 1
        );

        currentSong = randomSong;

    } else {

        currentSong++;

        if (currentSong >= cards.length) {

            currentSong = 0;

        }

    }

    loadSong(currentSong);

    playSong();

});


/* =========================
   FORMAT TIME
========================= */

function formatTime(seconds) {

    if (isNaN(seconds)) {

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


/* =========================
   NEXT
========================= */

nextButton.addEventListener("click", () => {

    const cards = getCards();

    if (cards.length === 0) {
        return;
    }

    if (shuffleEnabled) {

        let randomSong;

        do {

            randomSong =
                Math.floor(
                    Math.random() * cards.length
                );

        } while (
            randomSong === currentSong &&
            cards.length > 1
        );

        currentSong = randomSong;

    } else {

        currentSong++;

        if (currentSong >= cards.length) {

            currentSong = 0;

        }

    }

    loadSong(currentSong);

    playSong();

});


/* =========================
   PREVIOUS
========================= */

previousButton.addEventListener("click", () => {

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

});


/* =========================
   ACTIVE CARD
========================= */

function updateActiveCard() {

    const cards = getCards();

    cards.forEach((card, index) => {

        if (index === currentSong) {

            card.classList.add("active");

        } else {

            card.classList.remove("active");

        }

    });

}


/* =========================
   SHUFFLE
========================= */

shuffleButton.addEventListener("click", () => {

    shuffleEnabled =
        !shuffleEnabled;

    shuffleButton.classList.toggle(
        "active",
        shuffleEnabled
    );

});


/* =========================
   REPEAT
========================= */

repeatButton.addEventListener("click", () => {

    repeatEnabled =
        !repeatEnabled;

    repeatButton.classList.toggle(
        "active",
        repeatEnabled
    );

});


/* =========================
   SEARCH
========================= */

const searchButton =
    document.getElementById("search-button");

const searchContainer =
    document.getElementById("search-container");

const searchInput =
    document.getElementById("search-input");


searchButton.addEventListener("click", () => {

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

});


searchInput.addEventListener("input", () => {

    const searchText =
        searchInput.value.toLowerCase();

    const cards = getCards();

    cards.forEach(card => {

        const title =
            card.dataset.title.toLowerCase();

        const artist =
            card.dataset.artist.toLowerCase();

        if (
            title.includes(searchText) ||
            artist.includes(searchText)
        ) {

            card.style.display = "";

        } else {

            card.style.display = "none";

        }

    });

});


/* =========================
   HOME
========================= */

const homeButton =
    document.getElementById("home-button");


homeButton.addEventListener("click", () => {

    searchInput.value = "";

    searchContainer.classList.add(
        "hidden"
    );

    const cards = getCards();

    cards.forEach(card => {

        card.style.display = "";

    });

});


/* =========================
   AUTHENTICATION
========================= */

const authModal =
    document.getElementById("auth-modal");

const signupButton =
    document.getElementById("signup-button");

const loginButton =
    document.getElementById("login-button");

const closeAuth =
    document.getElementById("close-auth");

const signupForm =
    document.getElementById("signup-form");

const loginForm =
    document.getElementById("login-form");

const showLogin =
    document.getElementById("show-login");

const showSignup =
    document.getElementById("show-signup");

const authButtons =
    document.getElementById("auth-buttons");


/* =========================
   OPEN SIGNUP
========================= */

signupButton.addEventListener("click", () => {

    authModal.classList.remove("hidden");

    signupForm.classList.remove("hidden");

    loginForm.classList.add("hidden");

});


/* =========================
   OPEN LOGIN
========================= */

loginButton.addEventListener("click", () => {

    authModal.classList.remove("hidden");

    loginForm.classList.remove("hidden");

    signupForm.classList.add("hidden");

});


/* =========================
   CLOSE AUTH
========================= */

closeAuth.addEventListener("click", () => {

    authModal.classList.add("hidden");

});


/* =========================
   SWITCH AUTH
========================= */

showLogin.addEventListener("click", () => {

    signupForm.classList.add("hidden");

    loginForm.classList.remove("hidden");

});


showSignup.addEventListener("click", () => {

    loginForm.classList.add("hidden");

    signupForm.classList.remove("hidden");

});


/* =========================
   SIGNUP
========================= */

signupForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        const username =
            document
                .getElementById("signup-username")
                .value;

        const email =
            document
                .getElementById("signup-email")
                .value;

        const password =
            document
                .getElementById("signup-password")
                .value;

        try {

            const response =
                await fetch(
                    "http://localhost:5000/api/auth/signup",
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

                alert(data.message);

                return;

            }

            authModal.classList.add("hidden");

            signupForm.reset();

            alert(
                "Account created successfully!"
            );

        }

        catch (error) {

            console.error(error);

            alert(
                "Unable to connect to Nocturne server."
            );

        }

    }
);


/* =========================
   LOGIN
========================= */

loginForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        const email =
            document
                .getElementById("login-email")
                .value;

        const password =
            document
                .getElementById("login-password")
                .value;

        try {

            const response =
                await fetch(
                    "http://localhost:5000/api/auth/login",
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

                alert(data.message);

                return;

            }

            /* SAVE TOKEN */

            localStorage.setItem(
                "token",
                data.token
            );


            /* SAVE USER */

            localStorage.setItem(
                "user",
                JSON.stringify(data.user)
            );


            /* CLOSE LOGIN */

            authModal.classList.add(
                "hidden"
            );


            /* UPDATE HEADER */

            showLoggedInUser();

            loginForm.reset();


            /*
               Reload songs so the
               delete button is generated
               using the newly logged-in user.
            */

            const cardContainer =
                document.querySelector(
                    ".cardcontainer"
                );

            if (cardContainer) {

                cardContainer
                    .querySelectorAll(".card")
                    .forEach(card => {
                        card.remove();
                    });

                loadUploadedSongs();

            }

        }

        catch (error) {

            console.error(error);

            alert(
                "Unable to connect to Nocturne server."
            );

        }

    }
);


/* =========================
   LOGGED-IN USER
========================= */

function showLoggedInUser() {

    const token =
        localStorage.getItem("token");

    const userData =
        localStorage.getItem("user");


    if (!token || !userData) {

        return;

    }


    const user =
        JSON.parse(userData);


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


    document
        .getElementById("logout-button")
        .addEventListener(
            "click",
            () => {

                localStorage.removeItem("token");

                localStorage.removeItem("user");

                window.location.reload();

            }
        );


    const uploadButton =
        document.getElementById(
            "upload-song-button"
        );


    if (uploadButton) {

        uploadButton.addEventListener(
            "click",
            () => {

                const token =
                    localStorage.getItem("token");


                if (!token) {

                    alert(
                        "Please log in first."
                    );

                    authModal.classList.remove(
                        "hidden"
                    );

                    loginForm.classList.remove(
                        "hidden"
                    );

                    signupForm.classList.add(
                        "hidden"
                    );

                    return;

                }


                uploadModal.classList.remove(
                    "hidden"
                );

            }
        );

    }

}


/* =========================
   AUTH OUTSIDE CLICK
========================= */

authModal.addEventListener(
    "click",
    event => {

        if (event.target === authModal) {

            authModal.classList.add(
                "hidden"
            );

        }

    }
);


/* =========================
   CHECK LOGIN
========================= */

showLoggedInUser();


/* =========================
   DELETE SONG
========================= */

async function deleteSong(songId, card) {

    const token =
        localStorage.getItem("token");


    if (!token) {

        alert("Please log in first.");

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
                `http://localhost:5000/api/songs/${songId}`,
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


        /* Stop if currently playing */

        if (card.classList.contains("active")) {

            audio.pause();

            audio.src = "";

            songName.innerText = "";
            songArtist.innerText = "";

        }


        /* Remove card */

        card.remove();


        /* Fix index */

        const cards = getCards();

        if (cards.length === 0) {

            currentSong = 0;

        }

        else if (currentSong >= cards.length) {

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


/* =========================
   CREATE SONG CARD
========================= */

function createSongCard(song) {

    const card =
        document.createElement("div");

    card.classList.add("card");


    /* =========================
       SONG DATA
    ========================= */

    card.dataset.song =
        `http://localhost:5000${song.audioUrl}`;

    card.dataset.title =
        song.title;

    card.dataset.artist =
        song.artist;

    card.dataset.id =
        song._id;


    /* =========================
       COVER
    ========================= */

    const cover =
        song.coverUrl
            ? `http://localhost:5000${song.coverUrl}`
            : "img/music.svg";


    /* =========================
       USER DATA
    ========================= */

    const userData =
        localStorage.getItem("user");


    let canDelete = false;


    if (userData) {

        const user =
            JSON.parse(userData);


        const uploadedById =
            song.uploadedBy &&
            typeof song.uploadedBy === "object"
                ? song.uploadedBy._id
                : song.uploadedBy;


        /*
           Owner can delete own song.
           Admin can delete any song.
        */

        canDelete =
            String(user.id) ===
            String(uploadedById) ||
            user.isAdmin === true;

    }


    /* =========================
       CARD HTML
========================= */

    card.innerHTML = `

        <img
            src="${cover}"
            alt="${song.title}"
        >

        <h2>
            ${song.title}
        </h2>

        <p>
            ${song.artist}
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


    /* =========================
       PLAY
========================= */

    setupSongCard(card);


    /* =========================
       DELETE BUTTON
========================= */

    const deleteButton =
        card.querySelector(
            ".delete-song-button"
        );


    if (deleteButton) {

        deleteButton.addEventListener(
            "click",
            event => {

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


/* =========================
   LOAD SONGS
========================= */

async function loadUploadedSongs() {

    try {

        const response =
            await fetch(
                "http://localhost:5000/api/songs"
            );


        if (!response.ok) {

            throw new Error(
                "Failed to fetch songs"
            );

        }


        const songs =
            await response.json();


        const cardContainer =
            document.querySelector(
                ".cardcontainer"
            );


        if (!cardContainer) {

            return;

        }


        songs.forEach(song => {

            const card =
                createSongCard(song);

            cardContainer.appendChild(card);

        });

    }

    catch (error) {

        console.error(
            "Failed to load uploaded songs:",
            error
        );

    }

}


/* =========================
   LOAD SONGS ON START
========================= */

loadUploadedSongs();


/* =========================
   UPLOAD
========================= */

const uploadModal =
    document.getElementById("upload-modal");

const closeUpload =
    document.getElementById("close-upload");

const uploadForm =
    document.getElementById("upload-form");

const uploadMessage =
    document.getElementById("upload-message");


/* =========================
   CLOSE UPLOAD
========================= */

if (closeUpload) {

    closeUpload.addEventListener(
        "click",
        () => {

            uploadModal.classList.add(
                "hidden"
            );

        }
    );

}


if (uploadModal) {

    uploadModal.addEventListener(
        "click",
        event => {

            if (event.target === uploadModal) {

                uploadModal.classList.add(
                    "hidden"
                );

            }

        }
    );

}


/* =========================
   UPLOAD SONG
========================= */

if (uploadForm) {

    uploadForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const token =
                localStorage.getItem("token");

            const userData =
                localStorage.getItem("user");


            if (!token || !userData) {

                uploadMessage.innerText =
                    "Please log in first.";

                return;

            }


            const user =
                JSON.parse(userData);


            const title =
                document
                    .getElementById("upload-title")
                    .value;


            const artist =
                document
                    .getElementById("upload-artist")
                    .value;


            const audioFile =
                document
                    .getElementById("upload-audio")
                    .files[0];


            const coverFile =
                document
                    .getElementById("upload-cover")
                    .files[0];


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
                        "http://localhost:5000/api/songs/upload",
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


                setTimeout(() => {

                    uploadModal.classList.add(
                        "hidden"
                    );

                    uploadMessage.innerText = "";

                }, 800);


                /* Add uploaded song */

                const cardContainer =
                    document.querySelector(
                        ".cardcontainer"
                    );


                const card =
                    createSongCard(data.song);


                cardContainer.appendChild(card);

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