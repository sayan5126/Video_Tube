import { Router } from "express";
import {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
} from "../controllers/comment.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router()

// get all comments of a video
router.route("/video/:videoId").get(
    verifyJWT,
    getVideoComments
);

//add comment to a video
router.route("/video/:videoId").post(
    verifyJWT,
    addComment
);
// update content of a comment
router.route("/:commentId").patch(
    verifyJWT,
    updateComment
);

// delete a comment
router.route("/:commentId").delete(
    verifyJWT,
    deleteComment
);

export default router