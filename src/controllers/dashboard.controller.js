import mongoose from "mongoose"
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    // get channel id 
    const { channelId } = req.params
    if (!mongoose.isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel Id");
    }
    // get total videos and total views
    const videos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $group: {
                _id: null,
                totalVideos: {
                    $sum: 1
                },
                totalViews: {
                    $sum: "$views"
                }
            }
        }
    ])

    // get total subscriber
    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $count: "totalSubscribers"
        }
    ])

    // get total likes
    const likes = await Like.aggregate([
        {
            $match: {
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
                        $match: {
                            owner: new mongoose.Types.ObjectId(channelId)
                        }
                    },
                    {
                        $project: {
                            _id: 1
                        }
                    }
                ],
                as: "video"
            }
        },
        {
            $unwind: "$video"
        },
        {
            $count: "totalLikes"
        }
    ])

    const stats = {
        totalVideos: videos[0]?.totalVideos || 0,
        totalViews: videos[0]?.totalViews || 0,
        totalSubscribers: subscribers[0]?.totalSubscribers || 0,
        totalLikes: likes[0]?.totalLikes || 0
    }
    return res.status(200).json(
        new ApiResponse(
            200,
            stats,
            "Channel stats fetched successfully"
        )
    )
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // Get all the videos uploaded by the channel
    const { channelid } = req.params
    const { page = 1, limit = 10 } = req.query
    // Validate channel ID
    if (!mongoose.isValidObjectId(channelid)) {
        throw new ApiError(400, "Invalid channel ID");
    }
    const channelVideos = Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(channelid)
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
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                isPublished: 1,
                owner: 1
            }
        }
    ])

    // Pagination options
    const options = {
        page: Math.max(Number(page) || 1, 1),
        limit: Math.min(
            Math.max(Number(limit) || 10, 1),
            10
        )
    };

    // applying pagination
    const aggregatedChannelVideos = await Video.aggregatePaginate(channelVideos, options)

    return res.status(200).json(
        new ApiResponse(
            200,
            aggregatedChannelVideos,
            "Channel videos fetched successfully"
        )
    )
})

export {
    getChannelStats,
    getChannelVideos
}