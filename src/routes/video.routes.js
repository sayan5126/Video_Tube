import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    getAllVideos,
    publishAvideo,
    togglePublishStatus,
    increamentVideoViews,
    getVideoById,
    updateVideoDetails,
    deleteVideo
} from "../controllers/video.controller.js"

const router = Router();

router.route("/").get(getAllVideos)
router.route("/publish").post(
    verifyJWT,
    upload.fields([
        {
            name: "videoFile",
            maxCount: 1
        },
        {
            name: "thumbnail",
            maxCount: 1
        }
    ]),
    publishAvideo
)
router.route("/:videoId/toggle-publish").patch(
    verifyJWT,
    togglePublishStatus
)
router.route("/:videoId/increament-view").patch(
    verifyJWT,
    increamentVideoViews
)
router.route("/:videoId").get(
    verifyJWT,
    getVideoById
)
router.route("/:videoId/update-details").path(
    verifyJWT,
    upload.single("thumbnail"),
    updateVideoDetails
)
router.route("/:videoId/delete-video").delete(
    verifyJWT,
    deleteVideo
)

export default router;