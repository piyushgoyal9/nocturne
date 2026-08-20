const express = require("express");
const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");

const {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand
} = require("@aws-sdk/client-s3");

const {
    getSignedUrl
} = require("@aws-sdk/s3-request-presigner");

const Song = require("../models/Song");
const User = require("../models/User");

const router = express.Router();


/* =========================================================
   BACKBLAZE B2
========================================================= */

const B2_ENDPOINT = process.env.B2_ENDPOINT;
const B2_BUCKET = process.env.B2_BUCKET;
const B2_KEY_ID = process.env.B2_KEY_ID;
const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY;


/* =========================================================
   B2 CONFIG CHECK
========================================================= */

console.log("========== B2 CONFIG ==========");
console.log("B2_ENDPOINT:", B2_ENDPOINT);
console.log("B2_BUCKET:", B2_BUCKET);
console.log("B2_KEY_ID loaded:", !!B2_KEY_ID);
console.log(
    "B2_APPLICATION_KEY loaded:",
    !!B2_APPLICATION_KEY
);
console.log("===============================");


if (!B2_ENDPOINT) {
    console.error("ERROR: B2_ENDPOINT is missing");
}

if (!B2_BUCKET) {
    console.error("ERROR: B2_BUCKET is missing");
}

if (!B2_KEY_ID) {
    console.error("ERROR: B2_KEY_ID is missing");
}

if (!B2_APPLICATION_KEY) {
    console.error(
        "ERROR: B2_APPLICATION_KEY is missing"
    );
}


/* =========================================================
   S3 CLIENT
========================================================= */

const s3 = new S3Client({
    region: "us-east-005",

    endpoint: B2_ENDPOINT,

    credentials: {
        accessKeyId: B2_KEY_ID,
        secretAccessKey: B2_APPLICATION_KEY
    },

    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED"
});

/* =========================================================
   MULTER
========================================================= */

const upload = multer({

    storage:
        multer.memoryStorage(),

    limits: {

        fileSize:
            100 * 1024 * 1024

    }

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

        let uploadedAudioKey = null;
        let uploadedCoverKey = null;

        try {

            /* -------------------------
               VERIFY B2 CONFIG
            ------------------------- */

            if (!B2_BUCKET) {

                return res.status(500).json({

                    message:
                        "B2 bucket is not configured"

                });

            }


            /* -------------------------
               GET FORM DATA
            ------------------------- */

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
               CHECK DATA
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


            /* =================================================
               DEBUG FILE INFORMATION
            ================================================= */

            console.log("AUDIO DEBUG:", {

                originalName:
                    audioFile.originalname,

                mimetype:
                    audioFile.mimetype,

                size:
                    audioFile.size,

                bufferLength:
                    audioFile.buffer
                        ? audioFile.buffer.length
                        : 0

            });


            if (coverFile) {

                console.log("COVER DEBUG:", {

                    originalName:
                        coverFile.originalname,

                    mimetype:
                        coverFile.mimetype,

                    size:
                        coverFile.size,

                    bufferLength:
                        coverFile.buffer
                            ? coverFile.buffer.length
                            : 0

                });

            }


            /* =================================================
               GENERATE B2 KEYS
            ================================================= */

            const audioKey =
                `songs/${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(audioFile.originalname)}`;


            const coverKey =
                coverFile
                    ? `covers/${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(coverFile.originalname)}`
                    : null;


            console.log(
                "Uploading audio to B2:",
                audioKey
            );


            /* =================================================
               UPLOAD AUDIO
            ================================================= */

            await s3.send(

                new PutObjectCommand({

                    Bucket:
                        B2_BUCKET,

                    Key:
                        audioKey,

                    Body:
                        audioFile.buffer,

                    ContentLength:
                        audioFile.size,

                    ContentType:
                        audioFile.mimetype

                })

            );


            uploadedAudioKey =
                audioKey;


            console.log(
                "Audio uploaded successfully"
            );


            /* =================================================
               UPLOAD COVER
            ================================================= */

            if (coverFile) {

                console.log(
                    "Uploading cover to B2:",
                    coverKey
                );


                await s3.send(

                    new PutObjectCommand({

                        Bucket:
                            B2_BUCKET,

                        Key:
                            coverKey,

                        Body:
                            coverFile.buffer,

                        ContentLength:
                            coverFile.size,

                        ContentType:
                            coverFile.mimetype

                    })

                );


                uploadedCoverKey =
                    coverKey;


                console.log(
                    "Cover uploaded successfully"
                );

            }


            /* =================================================
               SAVE TO MONGODB
            ================================================= */

            const song =
                await Song.create({

                    title:
                        title,

                    artist:
                        artist,

                    audioUrl:
                        audioKey,

                    coverUrl:
                        coverKey || "",

                    uploadedBy:
                        uploadedBy

                });


            console.log(
                "Song saved to MongoDB:",
                song._id
            );


            /* =================================================
               RESPONSE
            ================================================= */

            return res.status(201).json({

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


            /* -------------------------
               CLEANUP AUDIO
            ------------------------- */

            try {

                if (uploadedAudioKey) {

                    await s3.send(

                        new DeleteObjectCommand({

                            Bucket:
                                B2_BUCKET,

                            Key:
                                uploadedAudioKey

                        })

                    );

                }

            }

            catch (cleanupError) {

                console.error(
                    "Audio cleanup error:",
                    cleanupError
                );

            }


            /* -------------------------
               CLEANUP COVER
            ------------------------- */

            try {

                if (uploadedCoverKey) {

                    await s3.send(

                        new DeleteObjectCommand({

                            Bucket:
                                B2_BUCKET,

                            Key:
                                uploadedCoverKey

                        })

                    );

                }

            }

            catch (cleanupError) {

                console.error(
                    "Cover cleanup error:",
                    cleanupError
                );

            }


            return res.status(500).json({

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


            console.log(
                "Songs found:",
                songs.length
            );


            /* =================================================
               GENERATE SIGNED URLS
            ================================================= */

            const songsWithUrls =
                await Promise.all(

                    songs.map(

                        async (song) => {

                            const songObject =
                                song.toObject();


                            console.log(
                                "B2 DEBUG:",
                                {
                                    bucket:
                                        B2_BUCKET,

                                    audioKey:
                                        songObject.audioUrl,

                                    coverKey:
                                        songObject.coverUrl
                                }
                            );


                            /* -------------------------
                               AUDIO
                            ------------------------- */

                            if (
                                songObject.audioUrl
                            ) {

                                const audioCommand =
                                    new GetObjectCommand({

                                        Bucket:
                                            B2_BUCKET,

                                        Key:
                                            songObject.audioUrl

                                    });


                                songObject.audioUrl =
                                    await getSignedUrl(

                                        s3,

                                        audioCommand,

                                        {
                                            expiresIn:
                                                60 * 60
                                        }

                                    );

                            }


                            /* -------------------------
                               COVER
                            ------------------------- */

                            if (
                                songObject.coverUrl
                            ) {

                                const coverCommand =
                                    new GetObjectCommand({

                                        Bucket:
                                            B2_BUCKET,

                                        Key:
                                            songObject.coverUrl

                                    });


                                songObject.coverUrl =
                                    await getSignedUrl(

                                        s3,

                                        coverCommand,

                                        {
                                            expiresIn:
                                                60 * 60
                                        }

                                    );

                            }


                            return songObject;

                        }

                    )

                );


            return res.json(
                songsWithUrls
            );

        }


        catch (error) {

            console.error(
                "Error fetching songs:",
                error
            );


            return res.status(500).json({

                message:
                    "Failed to fetch songs",

                error:
                    error.message

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
               DELETE AUDIO FROM B2
            ================================================= */

            if (song.audioUrl) {

                await s3.send(

                    new DeleteObjectCommand({

                        Bucket:
                            B2_BUCKET,

                        Key:
                            song.audioUrl

                    })

                );

                console.log(
                    "Deleted audio from B2:",
                    song.audioUrl
                );

            }


            /* =================================================
               DELETE COVER FROM B2
            ================================================= */

            if (song.coverUrl) {

                await s3.send(

                    new DeleteObjectCommand({

                        Bucket:
                            B2_BUCKET,

                        Key:
                            song.coverUrl

                    })

                );

                console.log(
                    "Deleted cover from B2:",
                    song.coverUrl
                );

            }


            /* =================================================
               DELETE DATABASE RECORD
            ================================================= */

            await Song.findByIdAndDelete(
                req.params.id
            );


            return res.json({

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


            return res.status(500).json({

                message:
                    "Failed to delete song",

                error:
                    error.message

            });

        }

    }

);


module.exports = router;