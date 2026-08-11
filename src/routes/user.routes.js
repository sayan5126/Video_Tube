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
router.route("/change-password").post(verifyJWT , changeCurrentPassword)
router.route("/get-user").post(verifyJWT , getCurrentUser)
router.route("/update-account-details").post(verifyJWT , updateAccountDetails)
router.route("/update-user-avatar").post(verifyJWT , upload.single("avatar") ,updateUserAvatar)
router.route("/update-user-coverimage").post(verifyJWT , upload.single("coverimage") ,updateUserCoverImage)

export default router;