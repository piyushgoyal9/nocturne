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

const cards = document.querySelectorAll(".card");

let shuffleEnabled = false;
let repeatEnabled = false;
shuffleButton.classList.toggle("active", shuffleEnabled);
repeatButton.classList.toggle("active", repeatEnabled);
/* =========================
   CURRENT SONG
========================= */

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
  const card = cards[index];

  if (!card) {
    return;
  }

  const song = card.dataset.song;
  const title = card.dataset.title;
  const artist = card.dataset.artist;
  const image = card.querySelector("img").src;

  /* Change audio */

  audio.src = song;

  /* Change playbar information */

  songName.innerText = title;
  songArtist.innerText = artist;
  songImage.src = image;

  /* Reset progress */

  progress.value = 0;

  currentTime.innerText = "0:00";

  duration.innerText = "0:00";

  /* Store current song */

  currentSong = index;
  updateActiveCard();
}

/* =========================
   PLAY SONG
========================= */

function playSong() {
  audio.play();
}

/* =========================
   PLAY / PAUSE BUTTON
========================= */

playButton.addEventListener("click", () => {
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
});

/* =========================
   CARD CLICK
========================= */

cards.forEach((card, index) => {
  card.addEventListener("click", () => {
    loadSong(index);

    playSong();
  });
});

/* =========================
   AUDIO PLAY EVENT
========================= */

audio.addEventListener("play", () => {
  updatePlayButton();
});

/* =========================
   AUDIO PAUSE EVENT
========================= */

audio.addEventListener("pause", () => {
  updatePlayButton();
});

/* =========================
   SONG LOADED
========================= */

audio.addEventListener("loadedmetadata", () => {
  progress.max = audio.duration;

  duration.innerText = formatTime(audio.duration);
});

/* =========================
   PROGRESS UPDATE
========================= */

audio.addEventListener("timeupdate", () => {
  progress.value = audio.currentTime;

  currentTime.innerText = formatTime(audio.currentTime);
});

/* =========================
   SEEK SONG
========================= */

progress.addEventListener("input", () => {
  audio.currentTime = progress.value;
});

/* =========================
   VOLUME
========================= */

volume.addEventListener("input", () => {
  audio.volume = volume.value / 100;
});

/* =========================
   SONG ENDED
========================= */

audio.addEventListener("ended", () => {

    /* Repeat current song */

    if (repeatEnabled) {

        audio.currentTime = 0;

        playSong();

        return;

    }


    /* Shuffle */

    if (shuffleEnabled) {

        let randomSong;

        do {

            randomSong = Math.floor(
                Math.random() * cards.length
            );

        } while (
            randomSong === currentSong &&
            cards.length > 1
        );


        currentSong = randomSong;

    }


    /* Normal next */

    else {

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

  const minutes = Math.floor(seconds / 60);

  let secondsRemaining = Math.floor(seconds % 60);

  if (secondsRemaining < 10) {
    secondsRemaining = "0" + secondsRemaining;
  }

  return `${minutes}:${secondsRemaining}`;
}

/* =========================
   NEXT SONG
========================= */

nextButton.addEventListener("click", () => {
  if (shuffleEnabled) {
    let randomSong;

    do {
      randomSong = Math.floor(Math.random() * cards.length);
    } while (randomSong === currentSong && cards.length > 1);

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
   PREVIOUS SONG
========================= */

previousButton.addEventListener("click", () => {
  currentSong--;

  if (currentSong < 0) {
    currentSong = cards.length - 1;
  }

  loadSong(currentSong);

  playSong();
});
/* =========================
   ACTIVE SONG CARD
========================= */

function updateActiveCard() {
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
  shuffleEnabled = !shuffleEnabled;

  shuffleButton.classList.toggle("active", shuffleEnabled);
});
/* =========================
   REPEAT
========================= */

repeatButton.addEventListener("click", () => {

    repeatEnabled = !repeatEnabled;

    repeatButton.classList.toggle("active", repeatEnabled);

});
