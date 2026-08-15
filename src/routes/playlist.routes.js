import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";

import {
    createPlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    getUserPlaylists,
    getPlaylistById,
    deletePlaylist,
    updatePlaylist
} from "../controllers/playlist.controller.js";

const router = Router();


// Create a new playlist
router
    .route("/")
    .post(
        verifyJWT,
        createPlaylist
    );


// Add / Remove video from playlist
router
    .route("/:playlistId/videos/:videoId")
    .post(
        verifyJWT,
        addVideoToPlaylist
    )
    .delete(
        verifyJWT,
        removeVideoFromPlaylist
    );


// Get all playlists of a user
// with Publicly accessible videos
router
    .route("/:userId/playlists")
    .get(
        getUserPlaylists
    );


// Get / Update / Delete a specific playlist
router
    .route("/:playlistId")
    .get(
        getPlaylistById
    )
    .patch(
        verifyJWT,
        updatePlaylist
    )
    .delete(
        verifyJWT,
        deletePlaylist
    );


export default router;