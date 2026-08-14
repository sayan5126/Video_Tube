import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    // get tweet content 
    const { content } = req.body
    const ownerId = req.user?._id

    // validate content
    if (!content?.trim()) {
        throw new ApiError(400, "Content is required")
    }

    // create tweet

    const createdTweet = await Tweet.create({
        owner: ownerId,
        content: content.trim()
    })

    if (!createdTweet) {
        throw new ApiError(500, "Something went wrong while creating te tweet")
    }

    // return response
    return res.status(201)
        .json(
            new ApiResponse(
                201,
                createdTweet,
                "Tweet successfully created"
            )
        )
})

const getUserTweets = asyncHandler(async (req, res) => {
    // get data from query
    const {
        page = 1,
        limit = 10,
        ownerId
    } = req.query;

    // validate owner id

    if (!ownerId || !isValidObjectId(ownerId)) {
        throw new ApiError(400, "Invalid owner id")
    }

    // aggregation
    const tweets = Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(ownerId)
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
                content: 1,
                createdAt: 1,
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

    const aggregatedTweets = await Tweet.aggregatePaginate(tweets, options)

    // return response
    return res.status(200)
        .json(
            new ApiResponse(
                200,
                aggregatedTweets,
                "Tweets fetched successfully"
            )
        )
})

const getLatestTweets = asyncHandler(async (req, res) => {
    // get data from query
    const {
        page = 1,
        limit = 10,
    } = req.query;

    // aggregation
    const tweets = Tweet.aggregate([
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
                content: 1,
                createdAt: 1,
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

    const aggregatedTweets = await Tweet.aggregatePaginate(tweets, options)

    // return response
    return res.status(200)
        .json(
            new ApiResponse(
                200,
                aggregatedTweets,
                "Tweets fetched successfully"
            )
        )
})
const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id")
    }
    const { content } = req.body
    if (!content?.trim()) {
        throw new ApiError(400, "content is required")
    }
    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content: content.trim()
            }
        },
        {
            new: true
        }
    )
    if (!updatedTweet) {
        throw new ApiError(404, "Tweet not found");
    }
    return res.status(200)
        .json(
            new ApiResponse(
                200,
                updatedTweet,
                "Tweet updated successfully"
            )
        )
})

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id")
    }

    // delete tweet

    const deletedTweet = await Tweet.findOneAndDelete({
        _id : tweetId,
        owner : req.user._id
    })
    if(!deletedTweet){
         throw new ApiError(
            404,
            "Tweet not found or you are not the owner"
        );
    }
    return res.status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Tweet deleted successfully"
        )
    )
})

export {
    createTweet,
    getUserTweets,
    getLatestTweets,
    updateTweet,
    deleteTweet
}