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

/* =========================
   AUTHENTICATION MIDDLEWARE
========================= */

async function authenticateToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        if (!decoded.userId) {
            return res.status(401).json({
                message: "Invalid token payload"
            });
        }

        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                message: "User not found"
            });
        }

        req.user = user;
        next();
    } catch (error) {
        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError"
        ) {
            return res.status(401).json({
                message: "Invalid or expired token"
            });
        }

        console.error("Authentication error:", error);

        return res.status(500).json({
            message: "Authentication failed"
        });
    }
}

/* =========================
   BACKBLAZE B2 CONFIG
========================= */

const B2_ENDPOINT = process.env.B2_ENDPOINT;
const B2_BUCKET = process.env.B2_BUCKET;
const B2_BUCKET_ID = process.env.B2_BUCKET_ID;
const B2_KEY_ID = process.env.B2_KEY_ID;
const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY;

console.log("========== B2 CONFIG ==========");
console.log("B2_ENDPOINT:", B2_ENDPOINT);
console.log("B2_BUCKET:", B2_BUCKET);
console.log("B2_BUCKET_ID loaded:", !!B2_BUCKET_ID);
console.log("B2_KEY_ID loaded:", !!B2_KEY_ID);
console.log("B2_APPLICATION_KEY loaded:", !!B2_APPLICATION_KEY);
console.log("===============================");

/* =========================
   S3 CLIENT
========================= */

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

/* =========================
   MULTER CONFIG
========================= */

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024
    }
});

/* =========================
   B2 AUTH CACHE
========================= */

let b2Auth = null;

/* =========================
   AUTHORIZE WITH B2
========================= */

async function authorizeB2() {
    if (b2Auth && b2Auth.expiresAt > Date.now() + 60000) {
        return b2Auth;
    }

    const authString = Buffer
        .from(`${B2_KEY_ID}:${B2_APPLICATION_KEY}`)
        .toString("base64");

    const response = await fetch(
        "https://api.backblazeb2.com/b2api/v3/b2_authorize_account",
        {
            method: "GET",
            headers: {
                Authorization: `Basic ${authString}`
            }
        }
    );

    if (!response.ok) {
        const text = await response.text();

        throw new Error(
            `B2 authorization failed: ${response.status} ${text}`
        );
    }

    const data = await response.json();

    b2Auth = {
        authorizationToken: data.authorizationToken,
        apiUrl: data.apiInfo.storageApi.apiUrl,
        downloadUrl: data.apiInfo.storageApi.downloadUrl,
        s3ApiUrl: data.apiInfo.storageApi.s3ApiUrl,
        expiresAt: Date.now() + 23 * 60 * 60 * 1000
    };

    console.log("B2 authorization successful");

    return b2Auth;
}

/* =========================
   GET B2 UPLOAD URL
========================= */

async function getB2UploadUrl() {
    const auth = await authorizeB2();

    const response = await fetch(
        `${auth.apiUrl}/b2api/v3/b2_get_upload_url`,
        {
            method: "POST",
            headers: {
                Authorization: auth.authorizationToken,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                bucketId: B2_BUCKET_ID
            })
        }
    );

    if (!response.ok) {
        const text = await response.text();

        throw new Error(
            `B2 get upload URL failed: ${response.status} ${text}`
        );
    }

    return response.json();
}

/* =========================
   UPLOAD FILE BUFFER TO B2
========================= */

async function uploadBufferToB2(buffer, fileName, contentType) {
    if (!buffer || !Buffer.isBuffer(buffer)) {
        throw new Error("Invalid upload buffer");
    }

    let uploadInfo;

    try {
        uploadInfo = await getB2UploadUrl();
    } catch (error) {
        console.log("B2 upload URL failed. Re-authorizing...");

        b2Auth = null;
        uploadInfo = await getB2UploadUrl();
    }

    const sha1 = crypto
        .createHash("sha1")
        .update(buffer)
        .digest("hex");

    const response = await fetch(uploadInfo.uploadUrl, {
        method: "POST",
        headers: {
            Authorization: uploadInfo.authorizationToken,
            "X-Bz-File-Name": encodeURIComponent(fileName),
            "Content-Type": contentType || "b2/x-auto",
            "Content-Length": String(buffer.length),
            "X-Bz-Content-Sha1": sha1
        },
        body: buffer
    });

    if (!response.ok) {
        const text = await response.text();

        throw new Error(
            `B2 upload failed: ${response.status} ${text}`
        );
    }

    const result = await response.json();

    console.log("B2 upload successful:", result.fileName);

    return result;
}

/* =========================
   UPLOAD SONG
   LOGIN REQUIRED
========================= */

router.post(
    "/upload",
    authenticateToken,
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
            if (
                !B2_BUCKET ||
                !B2_BUCKET_ID ||
                !B2_KEY_ID ||
                !B2_APPLICATION_KEY
            ) {
                return res.status(500).json({
                    message: "B2 storage is not configured correctly"
                });
            }

            const { title, artist } = req.body;

            if (!req.files || !req.files.audio || !req.files.audio[0]) {
                return res.status(400).json({
                    message: "Audio file is required"
                });
            }

            if (!title || !artist) {
                return res.status(400).json({
                    message: "Title and artist are required"
                });
            }

            const audioFile = req.files.audio[0];

            const coverFile =
                req.files.cover && req.files.cover[0]
                    ? req.files.cover[0]
                    : null;

            const audioKey =
                `songs/${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(audioFile.originalname)}`;

            const coverKey = coverFile
                ? `covers/${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(coverFile.originalname)}`
                : null;

            await uploadBufferToB2(
                audioFile.buffer,
                audioKey,
                audioFile.mimetype
            );

            uploadedAudioKey = audioKey;

            if (coverFile) {
                await uploadBufferToB2(
                    coverFile.buffer,
                    coverKey,
                    coverFile.mimetype
                );

                uploadedCoverKey = coverKey;
            }

            const song = await Song.create({
                title,
                artist,
                audioUrl: audioKey,
                coverUrl: coverKey || "",

                // Never trust uploadedBy from the frontend.
                // Use the authenticated user's database ID.
                uploadedBy: req.user._id
            });

            return res.status(201).json({
                message: "Song uploaded successfully",
                song
            });
        } catch (error) {
            console.error("Song upload error:", error);

            try {
                if (uploadedAudioKey) {
                    await s3.send(
                        new DeleteObjectCommand({
                            Bucket: B2_BUCKET,
                            Key: uploadedAudioKey
                        })
                    );
                }
            } catch (cleanupError) {
                console.error("Audio cleanup error:", cleanupError);
            }

            try {
                if (uploadedCoverKey) {
                    await s3.send(
                        new DeleteObjectCommand({
                            Bucket: B2_BUCKET,
                            Key: uploadedCoverKey
                        })
                    );
                }
            } catch (cleanupError) {
                console.error("Cover cleanup error:", cleanupError);
            }

            return res.status(500).json({
                message: "Song upload failed",
                error: error.message
            });
        }
    }
);

/* =========================
   GET ALL SONGS
   PUBLIC ROUTE
========================= */

router.get("/", async (req, res) => {
    try {
        const songs = await Song.find()
            .populate("uploadedBy", "username")
            .sort({ createdAt: -1 });

        const songsWithUrls = await Promise.all(
            songs.map(async (song) => {
                const songObject = song.toObject();

                if (songObject.audioUrl) {
                    const audioCommand = new GetObjectCommand({
                        Bucket: B2_BUCKET,
                        Key: songObject.audioUrl
                    });

                    songObject.audioUrl = await getSignedUrl(
                        s3,
                        audioCommand,
                        {
                            expiresIn: 60 * 60
                        }
                    );
                }

                if (songObject.coverUrl) {
                    const coverCommand = new GetObjectCommand({
                        Bucket: B2_BUCKET,
                        Key: songObject.coverUrl
                    });

                    songObject.coverUrl = await getSignedUrl(
                        s3,
                        coverCommand,
                        {
                            expiresIn: 60 * 60
                        }
                    );
                }

                return songObject;
            })
        );

        return res.json(songsWithUrls);
    } catch (error) {
        console.error("Error fetching songs:", error);

        return res.status(500).json({
            message: "Failed to fetch songs",
            error: error.message
        });
    }
});

/* =========================
   DELETE SONG
   OWNER OR ADMIN ONLY
========================= */

router.delete("/:id", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                message: "User not found"
            });
        }

        const song = await Song.findById(req.params.id);

        if (!song) {
            return res.status(404).json({
                message: "Song not found"
            });
        }

        const isOwner =
            song.uploadedBy &&
            song.uploadedBy.toString() === user._id.toString();

        const isAdmin = user.isAdmin === true;

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                message: "You can only delete your own songs"
            });
        }

        if (song.audioUrl) {
            await s3.send(
                new DeleteObjectCommand({
                    Bucket: B2_BUCKET,
                    Key: song.audioUrl
                })
            );

            console.log("Deleted audio from B2:", song.audioUrl);
        }

        if (song.coverUrl) {
            await s3.send(
                new DeleteObjectCommand({
                    Bucket: B2_BUCKET,
                    Key: song.coverUrl
                })
            );

            console.log("Deleted cover from B2:", song.coverUrl);
        }

        await Song.findByIdAndDelete(req.params.id);

        return res.json({
            message: "Song deleted successfully"
        });
    } catch (error) {
        console.error("Delete song error:", error);

        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError"
        ) {
            return res.status(401).json({
                message: "Invalid or expired token"
            });
        }

        return res.status(500).json({
            message: "Failed to delete song",
            error: error.message
        });
    }
});

module.exports = router;