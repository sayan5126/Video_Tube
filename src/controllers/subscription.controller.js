import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asynchandler.js"
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    // get the channelId that is the user who own the channel
    const { channelId } = req.params

    //get the user who subscribed the channel
    const userId = req.user._id

    // the user can't subscribe to himself

    if (userId.toString() === channelId) {
        throw new ApiError(
            400,
            "You cannot subscribe to your own channel"
        );
    }
    // check the subscription already exists

    const existedSubscription = await Subscription.findOne({
        subscriber: userId,
        channel: channelId
    })
    if (existedSubscription) {
        await Subscription.findByIdAndDelete(existedSubscription._id);
        return res.status(200)
        json(
            new ApiResponse(
                200,
                {
                    subscribed: false
                },
                "Channel unsubscribed successfully"
            )
        )
    }

    // create subscription object if user not subscribe the channel

    const subscription = await Subscription.create({
        subscriber: userId,
        channel: channelId
    })
    if (!subscription) {
        throw new ApiError(500, "Channel not subscribed")
    }
    return res.status(200)
        .json(
            new ApiResponse(
                200,
                {
                    subscribed: true
                },
                "Channel subscribed successfully"
            )
        )
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    // get channel id
    const { channelId } = req.params
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }
    const channelSubscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ],
                as: "subscriber"
            },
        },
        {
            $unwind: "$subscriber"
        },
        {
            $project: {
                _id: "$subscriber._id",
                username: "$subscriber.username",
                fullName: "$subscriber.fullName",
                avatar: "$subscriber.avatar"
            }
        }
    ])
    return res.status(200)
        .json(
            new ApiResponse(
                200,
                channelSubscribers,
                "Subscribers fetched successfully"
            )
        )
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    // get subscriber id
    const { subscriberId } = req.params
    // validate
    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid subscriber ID");
    }
    // apply aggregation

    const channels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1
                        }
                    }
                ],
                as: "channel"
            },
        },
        {
            $unwind: "$channel"
        },
        {
            $project: {
                _id: "$channel._id",
                username: "$channel.username",
                avatar: "$channel.avatar"
            }
        }
    ])
    return res.status(200)
        .json(
            new ApiResponse(
                200,
                channels,
                ""
            )
        )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}