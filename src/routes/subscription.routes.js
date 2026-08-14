import { Router } from "express"
import {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
} from "../controllers/subscription.controller"
import { verifyJWT } from "../middlewares/auth.middleware";

const router = Router()

router.route("/c/:channelId")
    .post(
        verifyJWT,
        toggleSubscription
    )

router.route("/c/:channelId/subscribers")
    .get(
        verifyJWT,
        getUserChannelSubscribers
    )

router.route("/u/:subscriberId/channels")
    .get(
        verifyJWT,
        getSubscribedChannels
    )

export default router