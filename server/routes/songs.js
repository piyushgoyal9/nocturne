const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");

const Song = require("../models/Song");
const User = require("../models/User");

const router = express.Router();


/* =========================================================
   UPLOAD DIRECTORIES
========================================================= */

const songsUploadPath = path.join(
    __dirname,
    "../uploads/songs"
);

const coversUploadPath = path.join(
    __dirname,
    "../uploads/covers"
);


/* =========================================================
   MAKE SURE DIRECTORIES EXIST
========================================================= */

fs.mkdirSync(
    songsUploadPath,
    { recursive: true }
);

fs.mkdirSync(
    coversUploadPath,
    { recursive: true }
);


/* =========================================================
   MULTER STORAGE
========================================================= */

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        if (file.fieldname === "audio") {

            cb(
                null,
                songsUploadPath
            );

        }

        else if (file.fieldname === "cover") {

            cb(
                null,
                coversUploadPath
            );

        }

        else {

            cb(
                new Error("Invalid file field")
            );

        }

    },


    filename: (req, file, cb) => {

        const uniqueName =
            Date.now() +
            "-" +
            Math.round(
                Math.random() * 1E9
            ) +
            path.extname(
                file.originalname
            );

        cb(
            null,
            uniqueName
        );

    }

});


const upload =
    multer({
        storage: storage
    });


/* =========================================================
   UPLOAD SONG
========================================================= */

router.post(
    "/upload",

    upload.fields([
        {
            name: "audio",
            maxCount: 1
        },
        {
            name: "cover",
            maxCount: 1
        }
    ]),

    async (req, res) => {

        try {

            const {
                title,
                artist,
                uploadedBy
            } = req.body;


            /* -------------------------
               CHECK AUDIO
            ------------------------- */

            if (
                !req.files ||
                !req.files.audio ||
                !req.files.audio[0]
            ) {

                return res.status(400).json({
                    message:
                        "Audio file is required"
                });

            }


            const audioFile =
                req.files.audio[0];


            const coverFile =
                req.files.cover &&
                req.files.cover[0]
                    ? req.files.cover[0]
                    : null;


            /* -------------------------
               CHECK REQUIRED DATA
            ------------------------- */

            if (!title || !artist) {

                return res.status(400).json({
                    message:
                        "Title and artist are required"
                });

            }


            if (!uploadedBy) {

                return res.status(400).json({
                    message:
                        "Uploader information is required"
                });

            }


            /* -------------------------
               SAVE SONG TO MONGODB
            ------------------------- */

            const song =
                await Song.create({

                    title: title,

                    artist: artist,

                    audioUrl:
                        `/uploads/songs/${audioFile.filename}`,

                    coverUrl:
                        coverFile
                            ? `/uploads/covers/${coverFile.filename}`
                            : "",

                    uploadedBy:
                        uploadedBy

                });


            /* -------------------------
               RESPONSE
            ------------------------- */

            res.status(201).json({

                message:
                    "Song uploaded successfully",

                song:
                    song

            });

        }


        catch (error) {

            console.error(
                "Song upload error:",
                error
            );


            res.status(500).json({

                message:
                    "Song upload failed",

                error:
                    error.message

            });

        }

    }

);


/* =========================================================
   GET ALL SONGS
========================================================= */

router.get(
    "/",
    async (req, res) => {

        try {

            const songs =
                await Song.find()
                    .populate(
                        "uploadedBy",
                        "username"
                    )
                    .sort({
                        createdAt: -1
                    });


            res.json(
                songs
            );

        }


        catch (error) {

            console.error(
                "Error fetching songs:",
                error
            );


            res.status(500).json({

                message:
                    "Failed to fetch songs"

            });

        }

    }
);


/* =========================================================
   DELETE SONG
========================================================= */

router.delete(
    "/:id",
    async (req, res) => {

        try {

            /* -------------------------
               AUTH HEADER
            ------------------------- */

            const authHeader =
                req.headers.authorization;


            if (
                !authHeader ||
                !authHeader.startsWith(
                    "Bearer "
                )
            ) {

                return res.status(401).json({

                    message:
                        "Authentication required"

                });

            }


            /* -------------------------
               VERIFY TOKEN
            ------------------------- */

            const token =
                authHeader.split(" ")[1];


            const decoded =
                jwt.verify(
                    token,
                    process.env.JWT_SECRET
                );


            /* -------------------------
               FIND USER
            ------------------------- */

            const user =
                await User.findById(
                    decoded.userId
                );


            if (!user) {

                return res.status(401).json({

                    message:
                        "User not found"

                });

            }


            /* -------------------------
               FIND SONG
            ------------------------- */

            const song =
                await Song.findById(
                    req.params.id
                );


            if (!song) {

                return res.status(404).json({

                    message:
                        "Song not found"

                });

            }


            /* -------------------------
               CHECK OWNER
            ------------------------- */

            const isOwner =
                song.uploadedBy.toString() ===
                user._id.toString();


            /* -------------------------
               CHECK ADMIN
            ------------------------- */

            const isAdmin =
                user.isAdmin === true;


            if (
                !isOwner &&
                !isAdmin
            ) {

                return res.status(403).json({

                    message:
                        "You can only delete your own songs"

                });

            }


            /* =================================================
               DELETE AUDIO FILE
            ================================================= */

            if (song.audioUrl) {

                const audioFileName =
                    path.basename(
                        song.audioUrl
                    );


                const audioPath =
                    path.join(
                        songsUploadPath,
                        audioFileName
                    );


                if (
                    fs.existsSync(
                        audioPath
                    )
                ) {

                    fs.unlinkSync(
                        audioPath
                    );

                }

            }


            /* =================================================
               DELETE COVER FILE
            ================================================= */

            if (song.coverUrl) {

                const coverFileName =
                    path.basename(
                        song.coverUrl
                    );


                const coverPath =
                    path.join(
                        coversUploadPath,
                        coverFileName
                    );


                if (
                    fs.existsSync(
                        coverPath
                    )
                ) {

                    fs.unlinkSync(
                        coverPath
                    );

                }

            }


            /* =================================================
               DELETE DATABASE RECORD
            ================================================= */

            await Song.findByIdAndDelete(
                req.params.id
            );


            res.json({

                message:
                    "Song deleted successfully"

            });

        }


        catch (error) {

            console.error(
                "Delete song error:",
                error
            );


            if (
                error.name ===
                "JsonWebTokenError" ||

                error.name ===
                "TokenExpiredError"
            ) {

                return res.status(401).json({

                    message:
                        "Invalid or expired token"

                });

            }


            res.status(500).json({

                message:
                    "Failed to delete song",

                error:
                    error.message

            });

        }

    }
);


module.exports = router;