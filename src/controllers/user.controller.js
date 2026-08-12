import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";


const generateRefreshAndAccessToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, error.message || "Somthing went wrong while generating refresh and access token");
    }
}

const userRegister = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar (avatar is required to register , cover image optional)
    // upload them to cloudinary, and also cheak again that avatar is succesfully uploaded
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return response

    // st->1 get user details from frontend

    const { username, email, fullName, password } = req.body
    console.log(username, email, fullName, password);

    // st->2 validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (
        [username, email, fullName, password].some((field) => !field?.trim())
    ) {
        throw new ApiError(400, "All fields are required");
    }

    if (!emailRegex.test(email)) {
        throw new ApiError(400, "Please provide a valid email address");
    }

    if (!passwordRegex.test(password)) {
        throw new ApiError(400, "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character")
    }

    // st->3 check if user already exists: username, email

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    // st->4 check for images, check for avatar (avatar is required to register , cover image optional)

    let avatarLocalPath;
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
        avatarLocalPath = req.files.avatar[0].path;
    }
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }



    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required");
    }

    // st->5 upload them to cloudinary, and also cheak again that avatar is succesfully uploaded

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!avatar) {
        throw new ApiError(400, "Avatar is required");
    }

    // st->6 create user object - create entry in db

    const user = await User.create({
        username,
        email,
        password,
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    })

    // st->7 remove password and refresh token field from response
    const createdUser = await User.findById(user._id)?.select(
        "-password -refreshToken"
    );

    // st->8 check for user creation
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    // st->9 return response

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully")
    )
})

const userLogin = asyncHandler(async (req, res) => {

    // get user details from frontend
    // validation - not empty
    // find the user by username or email
    // check password
    // generate access token and refresh token 
    // send those in cookie
    // return response

    // st->1 get user details from frontend

    const { username, email, password } = req.body;

    // st->2 validation

    if (!username && !email) {
        throw new ApiError(400, "Please enter a valid email or username")
    }

    if (!password) {
        throw new ApiError(400, "Please enter password")
    }

    // st->3 find the user by email or password

    const user = await User.findOne({
        $or: [{ email }, { username }]
    })

    if (!user) {
        throw new ApiError(404, "User with this email or username not exist , Please register first")
    }

    // st->4 check password

    const isCorrect = await user.isPasswordCorrect(password);
    if (!isCorrect) {
        throw new ApiError(400, "Incorrect password")
    }

    // st->5 generate access token and refresh token 

    const { accessToken, refreshToken } = await generateRefreshAndAccessToken(user._id);
    const loggedInuser = await User.findById(user._id).select("-password -refreshToken");

    // st->6 send those in cookie and return response

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshhToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInuser,
                    accessToken,
                    refreshToken
                },
                "User loggedin successfuly"
            )
        )


})

const userLogout = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshhToken", options)
        .json(
            new ApiResponse(200, {}, "User LoggedOut Successfully")
        )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
        if (!incomingRefreshToken) {
            throw new ApiError(401, "Unauthorized Request")
        }
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        const user = User.findById(decodedToken._id)
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }
        const { newAccessToken, newRefreshToken } = await generateRefreshAndAccessToken(user._id)
        const options = {
            httpOnly: true,
            secure: true
        }
        res.status(200)
            .cookie("accessToken", newAccessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        user,
                        newAccessToken,
                        newRefreshToken
                    },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error.message)
    }
})

const changeCurrentPassword = asyncHandler(async (res, req) => {
    // st->1 get data from user
    const { oldPassword, newPassword, confPassword } = req.body;

    // st->2 find user
    const user = await User.findById(req.user?._id);

    // st->3 verify oldPassword

    isCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isCorrect) {
        throw new ApiError(401, "Incorrect password , please enter correct password");
    }

    // st->4 validate new password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
        throw new ApiError(400, "The new password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character")
    }
    if (newPassword !== confPassword) {
        throw new ApiResponse(400, "Wrong password entered in confirm password section")
    }

    // st->5 update old password
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    // st->6 return response
    return res.status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Password changed successfully"
            )
        )
})

const getCurrentUser = asyncHandler(async (res, req) => {
    return res.status(200)
        .json(
            new ApiResponse(
                200,
                req.user,
                "current user fetched successfully"
            )
        )
})

const updateAccountDetails = asyncHandler(async (res, req) => {
    // st ->1 get user data
    const { fullName, email } = req.body;

    // st->2 validate data

    if (!email || !fullName) {
        throw new ApiError(400, "Please enter Email and your Ful name");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new ApiError(400, "Invalid Email-address");
    }

    // st-> 3 find user and update data

    const currentUser = await User.findByIdAndUpdate(
        res.user?._id,
        {
            $set: {
                email,
                fullName
            }
        },
        {
            new: true
        }
    )
        .select("-password -refreshToken")

    // st-> 4 return response

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                currentUser,
                "Email and Full Name updated successfully"
            )
        )
})

const updateUserAvatar = asyncHandler(async (res, res) => {
    // st->1 get avatar local path

    const avatarLocalPath = req.file?.path;

    // st->2 validate
    if (!avatarLocalPath) {
        throw new ApiError(400, "Please upload Avatar")
    }

    // st->3 upload on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar.url) {
        throw new ApiError(500, "Something went wrong while uploading avatar, plase try again");
    }
    // st->4 update user avatar
    const user = await user.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password -refreshToken")

    // st->5 return response

    return res.status(200)
        .json(
            200,
            user,
            "Avatar updated successfully"
        )
})

const updateUserCoverImage = asyncHandler(async (res, res) => {
    // st->1 get cover image local path

    const coverImageLocalPath = req.file?.path;

    // st->2 validate
    if (!coverImageLocalPath) {
        throw new ApiError(400, "Please upload Avatar")
    }

    // st->3 upload on cloudinary
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!coverImage.url) {
        throw new ApiError(500, "Something went wrong while uploading cover image, plase try again");
    }
    // st->4 update user cover image
    const user = await user.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password -refreshToken")

    // st->5 return response

    return res.status(200)
        .json(
            200,
            user,
            "Cover image updated successfully"
        )
})

const getUserChanelprofile = asyncHandler(async (res, req) => {
    const { username } = req.params
    if (!username?.trim()) {
        return new ApiError(400, "Username is missing");
    }
    const chanel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField : "channel",
                as: "subscribers"
            }
        },
        {
            $lookup : {
                from:  "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields : {
                subscribersCount : {
                    $size : "$subscribers"
                },
                subscribedToCount : {
                    $size : "$subscribedTo"
                },
                isSubscribed : {
                    $cond: {
                        if: {$in : [req.user?._id , "subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project : {
                fullname : 1,
                username : 1,
                subscribersCount : 1,
                subscribedToCount : 1,
                isSubscribed : 1,
                avatar : 1,
                coverImage : 1
            }
        }
    ])
    if(!chanel?.length){
        throw new ApiError(404 , "Chanel does not exists")
    }

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            chanel[0],
            "User channel fetched successfully"

        )
    )
})

const getWatchHistory = asyncHandler( async(req,res)=>{
    const user = await User.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup : {
                from : "videos",
                localField : "watchHistory",
                foreignField : "_id",
                as : "watchHistory",
                pipeline : [
                    {
                        $lookup : {
                            from : "users",
                            localField : "owner",
                            foreignField : "_id",
                            as : "owner",
                            pipeline : [
                                {
                                    $project:{
                                        fullName : 1,
                                        username : 1,
                                        avatar : 1
                                    }
                                },
                                {
                                    $addField : {
                                        owner : {
                                            $first : "$owner"
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200)
    json(
        200,
        user[0].WatchHistory,
        "Watch history fetched successfully"
    )
})
export {
    userRegister,
    userLogin,
    userLogout,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChanelprofile,
    getWatchHistory
}