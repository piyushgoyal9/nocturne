const express = require("express");
const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const {
    S3Client,
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
   BACKBLAZE B2 CONFIG
========================================================= */

const B2_ENDPOINT =
    process.env.B2_ENDPOINT;

const B2_BUCKET =
    process.env.B2_BUCKET;

const B2_BUCKET_ID =
    process.env.B2_BUCKET_ID;

const B2_KEY_ID =
    process.env.B2_KEY_ID;

const B2_APPLICATION_KEY =
    process.env.B2_APPLICATION_KEY;


/* =========================================================
   CONFIG CHECK
========================================================= */

console.log("========== B2 CONFIG ==========");

console.log(
    "B2_ENDPOINT:",
    B2_ENDPOINT
);

console.log(
    "B2_BUCKET:",
    B2_BUCKET
);

console.log(
    "B2_BUCKET_ID loaded:",
    !!B2_BUCKET_ID
);

console.log(
    "B2_KEY_ID loaded:",
    !!B2_KEY_ID
);

console.log(
    "B2_APPLICATION_KEY loaded:",
    !!B2_APPLICATION_KEY
);

console.log("===============================");


if (!B2_ENDPOINT) {
    console.error(
        "ERROR: B2_ENDPOINT is missing"
    );
}

if (!B2_BUCKET) {
    console.error(
        "ERROR: B2_BUCKET is missing"
    );
}

if (!B2_BUCKET_ID) {
    console.error(
        "ERROR: B2_BUCKET_ID is missing"
    );
}

if (!B2_KEY_ID) {
    console.error(
        "ERROR: B2_KEY_ID is missing"
    );
}

if (!B2_APPLICATION_KEY) {
    console.error(
        "ERROR: B2_APPLICATION_KEY is missing"
    );
}


/* =========================================================
   S3 CLIENT
   Used for:
   - Signed download URLs
   - Delete objects

   NOT used for uploading files.
========================================================= */

const s3 = new S3Client({

    region:
        "us-east-005",

    endpoint:
        B2_ENDPOINT,

    credentials: {

        accessKeyId:
            B2_KEY_ID,

        secretAccessKey:
            B2_APPLICATION_KEY

    },

    requestChecksumCalculation:
        "WHEN_REQUIRED",

    responseChecksumValidation:
        "WHEN_REQUIRED"

});


/* =========================================================
   MULTER
========================================================= */

const upload =
    multer({

        storage:
            multer.memoryStorage(),

        limits: {

            fileSize:
                100 * 1024 * 1024

        }

    });


/* =========================================================
   B2 NATIVE API AUTH CACHE
========================================================= */

let b2Auth = null;


/* =========================================================
   AUTHORIZE WITH B2
========================================================= */

async function authorizeB2() {

    if (
        b2Auth &&
        b2Auth.expiresAt >
            Date.now() + 60000
    ) {

        return b2Auth;

    }


    console.log(
        "Authorizing with Backblaze B2..."
    );


    const authString =
        Buffer
            .from(
                `${B2_KEY_ID}:${B2_APPLICATION_KEY}`
            )
            .toString("base64");


    const response =
        await fetch(

            "https://api.backblazeb2.com/b2api/v3/b2_authorize_account",

            {

                method:
                    "GET",

                headers: {

                    Authorization:
                        `Basic ${authString}`

                }

            }

        );


    if (!response.ok) {

        const text =
            await response.text();

        throw new Error(
            `B2 authorization failed: ${response.status} ${text}`
        );

    }


    const data =
        await response.json();


    b2Auth = {

        authorizationToken:
            data.authorizationToken,

        apiUrl:
            data.apiUrl,

        downloadUrl:
            data.downloadUrl,

        expiresAt:
            Date.now() +
            23 * 60 * 60 * 1000

    };


    console.log(
        "B2 authorization successful"
    );


    return b2Auth;

}


/* =========================================================
   GET B2 UPLOAD URL
========================================================= */

async function getB2UploadUrl() {

    const auth =
        await authorizeB2();


    const response =
        await fetch(

            `${auth.apiUrl}/b2api/v3/b2_get_upload_url`,

            {

                method:
                    "POST",

                headers: {

                    Authorization:
                        auth.authorizationToken,

                    "Content-Type":
                        "application/json"

                },

                body:
                    JSON.stringify({

                        bucketId:
                            B2_BUCKET_ID

                    })

            }

        );


    if (!response.ok) {

        const text =
            await response.text();

        throw new Error(
            `B2 get upload URL failed: ${response.status} ${text}`
        );

    }


    return response.json();

}


/* =========================================================
   UPLOAD BUFFER TO B2 NATIVE API
========================================================= */

async function uploadBufferToB2(
    buffer,
    fileName,
    contentType
) {

    if (
        !buffer ||
        !Buffer.isBuffer(buffer)
    ) {

        throw new Error(
            "Invalid upload buffer"
        );

    }


    console.log(
        "Getting B2 upload URL for:",
        fileName
    );


    let uploadInfo;


    try {

        uploadInfo =
            await getB2UploadUrl();

    }

    catch (error) {

        /*
         * B2 authorization/upload URL can expire.
         * Clear cached auth and retry once.
         */

        console.log(
            "B2 upload URL failed, re-authorizing..."
        );

        b2Auth = null;

        uploadInfo =
            await getB2UploadUrl();

    }


    const sha1 =
        crypto
            .createHash("sha1")
            .update(buffer)
            .digest("hex");


    console.log(
        "Uploading to B2:",
        fileName
    );

    console.log(
        "Upload size:",
        buffer.length
    );


    const response =
        await fetch(

            uploadInfo.uploadUrl,

            {

                method:
                    "POST",

                headers: {

                    Authorization:
                        uploadInfo.authorizationToken,

                    "X-Bz-File-Name":
                        encodeURIComponent(
                            fileName
                        ),

                    "Content-Type":
                        contentType ||
                        "b2/x-auto",

                    "Content-Length":
                        String(
                            buffer.length
                        ),

                    "X-Bz-Content-Sha1":
                        sha1

                },

                body:
                    buffer

            }

        );


    if (!response.ok) {

        const text =
            await response.text();

        throw new Error(
            `B2 upload failed: ${response.status} ${text}`
        );

    }


    const result =
        await response.json();


    console.log(
        "B2 upload successful:",
        result.fileName
    );


    return result;

}


/* =========================================================
   UPLOAD SONG
========================================================= */

router.post(

    "/upload",

    upload.fields([

        {
            name:
                "audio",

            maxCount:
                1

        },

        {
            name:
                "cover",

            maxCount:
                1

        }

    ]),

    async (req, res) => {

        let uploadedAudioKey =
            null;

        let uploadedCoverKey =
            null;


        try {

            /* -------------------------
               CHECK B2 CONFIG
            ------------------------- */

            if (
                !B2_BUCKET ||
                !B2_BUCKET_ID ||
                !B2_KEY_ID ||
                !B2_APPLICATION_KEY
            ) {

                return res.status(500).json({

                    message:
                        "B2 storage is not configured correctly"

                });

            }


            /* -------------------------
               FORM DATA
            ------------------------- */

            const {
                title,
                artist,
                uploadedBy
            } = req.body;


            /* -------------------------
               AUDIO
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
               REQUIRED DATA
            ------------------------- */

            if (
                !title ||
                !artist
            ) {

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
               DEBUG
            ================================================= */

            console.log(
                "AUDIO DEBUG:",
                {

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

                }
            );


            if (coverFile) {

                console.log(
                    "COVER DEBUG:",
                    {

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

                    }
                );

            }


            /* =================================================
               GENERATE FILE KEYS
            ================================================= */

            const audioKey =
                `songs/${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(audioFile.originalname)}`;


            const coverKey =
                coverFile
                    ? `covers/${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(coverFile.originalname)}`
                    : null;


            /* =================================================
               UPLOAD AUDIO
            ================================================= */

            console.log(
                "Uploading audio to B2:",
                audioKey
            );


            await uploadBufferToB2(

                audioFile.buffer,

                audioKey,

                audioFile.mimetype

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


                await uploadBufferToB2(

                    coverFile.buffer,

                    coverKey,

                    coverFile.mimetype

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


            /* =================================================
               CLEANUP AUDIO
            ================================================= */

            try {

                if (
                    uploadedAudioKey
                ) {

                    await s3.send(

                        new DeleteObjectCommand({

                            Bucket:
                                B2_BUCKET,

                            Key:
                                uploadedAudioKey

                        })

                    );

                    console.log(
                        "Cleaned up audio:",
                        uploadedAudioKey
                    );

                }

            }

            catch (cleanupError) {

                console.error(
                    "Audio cleanup error:",
                    cleanupError
                );

            }


            /* =================================================
               CLEANUP COVER
            ================================================= */

            try {

                if (
                    uploadedCoverKey
                ) {

                    await s3.send(

                        new DeleteObjectCommand({

                            Bucket:
                                B2_BUCKET,

                            Key:
                                uploadedCoverKey

                        })

                    );

                    console.log(
                        "Cleaned up cover:",
                        uploadedCoverKey
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

                        createdAt:
                            -1

                    });


            console.log(
                "Songs found:",
                songs.length
            );


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
                               AUDIO SIGNED URL
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
                               COVER SIGNED URL
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
               OWNER
            ------------------------- */

            const isOwner =
                song.uploadedBy.toString() ===
                user._id.toString();


            /* -------------------------
               ADMIN
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
               DELETE AUDIO
            ================================================= */

            if (
                song.audioUrl
            ) {

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
               DELETE COVER
            ================================================= */

            if (
                song.coverUrl
            ) {

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