import mongoose from "mongoose";
import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary, deleteFromCloudinry } from "../utils/cloudinary.js";
import { Video } from "../models/video.model.js";


const getAllVideos = asyncHandler(async (req, res) => {
    // get data from query
    const {
        page = 1,
        limit = 10,
        query,
        sortBy = "views",
        sortType = "desc",
        userId
    } = req.query;

    // creating match stage for aggregation pipeline
    const matchStage = {
        isPublished: true     // gives all the videos which are published
    }
    if (query?.trim()) {         // if there any other query from the user then also include them in the match stage to search in title and description field
        matchStage.$or = [
            {
                title: {
                    $regex: query.trim(),
                    $options: "i"
                }
            },
            {
                description: {
                    $regex: query.trim(),
                    $options: "i"
                }
            }
        ]
    }
    // if the user want his uploaded videos then add userid to match stage 
    if (userId) {
        if (!mongoose.isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid userId");
        }
        matchStage.owner = new mongoose.Types.ObjectId(userId);
    }
    // how the videos are sorted - in ascending order or in descending order 
    const sortDirection = (sortType === "asc") ? 1 : -1;
    // collect videos through aggregation
    const videos = Video.aggregate([
        {
            $match: matchStage
        },
        {
            $sort: {
                [sortBy]: sortDirection
            }
        }
    ]);

    // Pagination options
    const options = {
        page: Math.max(Number(page) || 1, 1),
        limit: Math.min(
            Math.max(Number(limit) || 10, 1),
            10
        )
    };

    // apply pagination
    const paginatedVideos = await Video.aggregatePaginate(videos, options);

    return res.status(200).json(
        new ApiResponse(
            200,
            paginatedVideos,
            "Videos fetched successfully"
        )
    )
})

const publishAvideo = asyncHandler(async (req, res) => {
    // get data from user
    const { title, description } = req.body;

    // validation for title and description
    if (!title?.trim() || !description?.trim()) {
        throw new ApiError(400, "Title and description both are required");
    }

    // upload video and thumbnail on cloudinary

    let videoFileLocalPath;
    let thumbnailLocalPath;
    if (req.files && Array.isArray(req.files.videoFile) && req.files.videoFile.length > 0) {
        videoFileLocalPath = req.files.videoFile[0].path;
    }
    if (req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0) {
        thumbnailLocalPath = req.files.thumbnail[0].path;
    }

    if (!videoFileLocalPath) {
        throw new ApiError(400, "Video file is required");
    }
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is required");
    }

    // Upload both simultaneously
    const [video, thumbnail] = await Promise.all([
        uploadOnCloudinary(videoFileLocalPath),
        uploadOnCloudinary(thumbnailLocalPath)
    ]);

    if (!video) {
        throw new ApiError(500, "Video upload on cloudinary failed!!!")
    }
    if (!thumbnail) {
        throw new ApiError(500, "Thumbnail upload on cloudinary failed!!!")
    }

    // create video
    const upload_video_details = await Video.create({
        title: title.trim(),
        description: description.trim(),
        videoFile: video.url,
        videoFilePublicId: video.public_id,
        thumbnail: thumbnail.url,
        thumbnailPublicId: thumbnail.public_id,
        owner: req.user._id,
        duration: video.duration,
    })

    if (!upload_video_details) {
        throw new ApiError(500, "Video upload failed");
    }

    return res.status(201)
        .json(
            new ApiResponse(
                201,
                upload_video_details,
                "Video successfully uploaded"
            )
        )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    // get dideo id
    const { videoId } = req.params;
    // finding the video and toggling the publish field
    const updated_video = await Video.findByIdAndUpdate(
        {
            _id: videoId,
            owner: req.user._id
        },
        [
            {
                $set: {
                    isPublished: {
                        $not: "$isPublished"
                    }
                }
            }
        ],
        {
            new: true
        }
    );
    if (!updated_video) {
        throw new ApiError(404, "Video not found or you are not the owner");
    }
    return res.status(200)
        .json(
            new ApiResponse(
                200,
                updated_video,
                "Publication successfullt toggled"
            )
        )
})

const increamentVideoViews = asyncHandler(async (req, res) => {
    // get video id
    const { videoId } = req.params;
    // find and increase view
    const updated_video = await Video.findByIdAndUpdate(
        req.user._id,
        {
            $inc: {
                views: 1
            }
        },
        {
            new: true
        }
    );
    if (!updated_video) {
        throw new ApiError(500, "Something went wrong while updating views");
    }
    return res.status(200)
        .json(
            new ApiResponse(
                200,
                updated_video,
                "View counted successfully"
            )
        )
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }
    return res.status(200)
        .json(
            new ApiResponse(
                200,
                video,
                "Video fetched successfully"
            )
        )
})

const updateVideoDetails = asyncHandler(async (req, res) => {
    // Get video ID
    const { videoId } = req.params;

    // Get updated fields
    const { title, description } = req.body;

    // Check whether anything was provided for update
    if (!title?.trim() && !description?.trim() && !req.file) {
        throw new ApiError(
            400,
            "At least one field is required to update"
        );
    }

    // Find video and make sure current user owns it
    const video = await Video.findOne({
        _id: videoId,
        owner: req.user._id
    });
    if (!video) {
        throw new ApiError(404, "Video not found or you are not the owner of this video")
    }

    // updating vieo details-->

    // update title
    if (title?.trim()) {
        video.title = title?.trim();
    }
    // update description
    if (description?.trim()) {
        video.description = description.trim();
    }
    // update thumbnail
    if (req.file) {
        const oldThumbnailPublicId = video.thumbnailPublicId;
        const upload_response = await uploadOnCloudinary(req.file.path);
        if (!upload_response) {
            throw new ApiError(500, "thumbnail upload failed");
        }
        video.thumbnail = upload_response.url;
        video.thumbnailPublicId = upload_response.public_id;
        // Delete old thumbnail from Cloudinary
        if (oldThumbnailPublicId) {
            await deleteFromCloudinry(oldThumbnailPublicId);
        }
    }

    // Save updated video
    const updated_video = await video.save();
    return res.status(200)
        .json(
            new ApiResponse(
                200,
                updated_video,
                "video data updated successfully"
            )
        )
})

const deleteVideo = asyncHandler(async (req, res) => {
    // get video id
    const { videoId } = req.params

    // find video and verify owner

    const video = await findOne({
        _id: videoId,
        owner: req.user?._id
    })

    if (!video) {
        throw new ApiError(404, "Video not found or you are not the owner")
    }

    // delete video from cloudinary
    const videoDeleteResponse = await deleteFromCloudinry(video.videoFilePublicId);
    if (!videoDeleteResponse) {
        throw new ApiError(500, "Failed to delete video from Cloudinary")
    }

    // delete thumbnail from cloudinary

    const thumbnailDeleteResponse = await deleteFromCloudinry(video.thumbnailPublicId);
    if (!thumbnailDeleteResponse) {
        throw new ApiError(500, "Failed to delete thumbnail from Cloudinary")
    }

    // Delete video document from MongoDB
    const deletingResponse = await Video.findByIdAndDelete(videoId);
    return res.status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Video deleted successfully"
            )
        )
})

export {
    getAllVideos,
    publishAvideo,
    togglePublishStatus,
    increamentVideoViews,
    getVideoById,
    updateVideoDetails,
    deleteVideo
}