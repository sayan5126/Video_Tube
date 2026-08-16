import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware/.js"
import {
    getChannelStats,
    getChannelVideos
} from "../controllers/dashboard.controller.js"

const router = Router()

// get channel stats
router.route("/channel/:channelId/stats").get(
    verifyJWT,
    getChannelStats
);

// get all videos uploaded by a channel 
router.route("/channel/:channelid").get(
    verifyJWT,
    getChannelVideos
);


export default router