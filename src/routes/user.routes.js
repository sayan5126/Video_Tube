import { Router } from "express";
import { userLogin, userRegister , userLogout , refreshAccessToken , changeCurrentPassword , getCurrentUser , updateAccountDetails , updateUserAvatar , updateUserCoverImage} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name : "avatar",
            maxCount : 1
        },
        {
            name : "coverImage",
            maxCount : 1
        }
    ]),
    userRegister
);

router.route("/login").post(userLogin)

//secured routes
router.route("/logout").post(verifyJWT , userLogout)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(changeCurrentPassword)
router.route("/get-user").post(getCurrentUser)
router.route("/update-account-details").post(updateAccountDetails)
router.route("/update-user-avatar").post(updateUserAvatar)
router.route("/update-user-coverimage").post(updateUserCoverImage)

export default router;