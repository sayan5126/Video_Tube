import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asynchandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { Like } from "../models/like.model.js"
import { Video } from "../models/video.model.js"
import { Comment } from "../models/comment.model.js"
import { Tweet } from "../models/tweet.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    // get video Id
    const { videoId } = req.params

    // validate viedo id
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id")
    }

    // check video exist or not
    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found")
    }
    if (!video.isPublished) {
        throw new ApiError(400, "Video is not publicly available")
    }

    // check the video already liked by the user or not
    const videoLiked = await Like.findOne({
        likedBy: req.user._id,
        video: videoId
    })
    if (videoLiked) {
        await Like.findOneAndDelete({
            likedBy: req.user._id,
            video: videoId
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    liked: false
                },
                "Like on video toggled successfully"
            )
        )
    }
    // create like 
    await Like.create({
        likedBy: req.user._id,
        video: videoId
    })

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                liked: true
            },
            "Video liked successfully"
        )
    )
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    // get video Id
    const { commentId } = req.params

    // validate comment id
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment Id")
    }

    // check comment exist or not
    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    // check the comment already liked by the user or not
    const commentLiked = await Like.findOne({
        likedBy: req.user._id,
        comment: commentId
    })
    if (commentLiked) {
        await Like.findOneAndDelete({
            likedBy: req.user._id,
            comment: commentId
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    liked: false
                },
                "Like on comment toggled successfully"
            )
        )
    }
    // create like 
    await Like.create({
        likedBy: req.user._id,
        comment: commentId
    })

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                liked: true
            },
            "Comment liked successfully"
        )
    )
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    // get tweet Id
    const { tweetId } = req.params

    // validate tweet id
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet Id")
    }

    // check tweet exist or not
    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }

    // check the tweet already liked by the user or not
    const tweetLiked = await Like.findOne({
        likedBy: req.user._id,
        tweet: tweetId
    })
    if (tweetLiked) {
        await Like.findOneAndDelete({
            likedBy: req.user._id,
            tweet: tweetId
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    liked: false
                },
                "Like on tweet toggled successfully"
            )
        )
    }
    // create like 
    await Like.create({
        likedBy: req.user._id,
        tweet: tweetId
    })

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                liked: true
            },
            "Tweet liked successfully"
        )
    )
})

const getLikedVideos = asyncHandler(async (req, res) => {

    const { page = 1, limit = 10 } = req.query

    const likedVideos = Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user._id),
                video: { $exists: true }
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                pipeline: [
                    {
                        $project: {
                            videoFile: 1,
                            thumbnail: 1,
                            title: 1,
                            description: 1,
                            duration: 1,
                            views: 1,
                            owner: 1,
                        }
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ],
                            as: "owner"
                        }
                    },
                    {
                        $unwind: "$owner"
                    }
                ],
                as: "video"
            }
        },
        {
            $unwind: "$video"
        },
        {
            $project: {
                video: 1,
                createdAt: 1,
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        }
    ])

    const options = {
        page: Math.max(Number(page) || 1, 1),
        limit: Math.min(
            Math.max(Number(limit) || 10, 1),
            10
        )
    };
    const paginatedLikedVideos =
        await Like.aggregatePaginate(
            likedVideos,
            options
        );

    return res.status(200).json(
        new ApiResponse(
            200,
            paginatedLikedVideos,
            "Liked videos fetched successfully"
        )
    )
})

export {
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedVideos
}
