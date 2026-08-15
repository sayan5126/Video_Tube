import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asynchandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { Comment } from "../models/comment.model.js"
import { Video } from "../models/video.model.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //get vieo id and queries
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query

    // validate vieo id
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "inavlid vieo id")
    }
    // check video Exists
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video does not exists")
    }
    if (!video.isPublished) {
        throw new ApiError(400, "Video not publicly available")
    }

    const videoComments = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
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

    // apply pagination
    const paginatedVideoComments =
        await Comment.aggregatePaginate(
            videoComments,
            options
        );

    return res.status(200).json(
        new ApiResponse(
            200,
            paginatedVideoComments,
            "Comments fetched successfully"
        )
    )
})

const addComment = asyncHandler(async (req, res) => {
    // get video id
    const { videoId } = req.params
    const { content } = req.body

    // validate content
    if (!content?.trim()) {
        throw new ApiError(400, "Content is required")
    }

    // validate video Id and check video exist or not
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id")
    }
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }
    if (!video.isPublished) {
        throw new ApiError(400, "Video not publicly available");
    }
    // create comment
    const createdComment = await Comment.create({
        content: content.trim(),
        video: videoId,
        owner: req.user._id
    })

    if (!createdComment) {
        throw new ApiError(500, "Failed to create comment");
    }

    return res.status(201).json(
        new ApiResponse(
            201,
            createdComment,
            "Comment added to the video successfully"
        )
    )
})

const updateComment = asyncHandler(async (req, res) => {
    // get comment id
    const { commentId } = req.params;
    const { content } = req.body
    // validate content
    if (!content?.trim()) {
        throw new ApiError(400, "Content is required")
    }
    // Validate comment ID
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID");
    }
    // update comment
    const updatedComment = await Comment.findOneAndUpdate(
        {
            _id: commentId,
            owner: req.user._id
        },
        {
            $set: {
                content: content.trim()
            }
        },
        {
            new: true
        }
    )

    if (!updatedComment) {
        throw new ApiError(404, "Comment not found or you are not the owner")
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            updatedComment,
            "Comment updated successfully"
        )
    )
})

const deleteComment = asyncHandler(async (req, res) => {
    // get comment id
    const { commentId } = req.params;
    // Validate comment ID
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID");
    }
    // delete comment
    const deletedComment = await Comment.findOneAndDelete(
        {
            _id: commentId,
            owner: req.user._id
        }
    )
    if (!deletedComment) {
        throw new ApiError(404, "Comment not found or you are not the owner")
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Comment deleted successfully"
        )
    )
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}