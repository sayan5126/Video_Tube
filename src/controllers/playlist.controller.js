import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asynchandler.js"
import { Video } from "../models/video.model.js"


const createPlaylist = asyncHandler(async (req, res) => {
    // get playlist name and description
    const { name, description } = req.body

    // apply validation
    if (!name?.trim() || !description?.trim()) {
        throw new ApiError(400, "Playlist name and description both are required")
    }

    // reate playlist

    const createdPlaylist = await Playlist.create({
        name: name.trim(),
        description: description.trim(),
        owner: req.user._id
    })

    if (!createdPlaylist) {
        throw new ApiError(500, "Playlist not created")
    }

    return res.status(201)
        .json(
            new ApiResponse(
                201,
                createdPlaylist,
                "Playlist created successfully"
            )
        )
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    // get playlist Id and video Id
    const { playlistId, videoId } = req.params

    // validation
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist Id")
    }
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id")
    }
    const playlist = await Playlist.findOne({
        _id: playlistId,
        owner: req.user._id
    });

    if (!playlist) {
        throw new ApiError(
            404,
            "Playlist not found or you are not the owner"
        );
    }
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }
    if (!video.isPublished) {
        throw new ApiError(400, "Video is not publicly available")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet: {
                videos: videoId
            }
        },
        {
            new: true
        }
    )

    if (!updatedPlaylist) {
        throw new ApiError(404, "Playlist not found or you are not the owner")
    }

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                updatedPlaylist,
                "Playlist updated successfully"
            )
        )
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    // get playlist Id and video Id
    const { playlistId, videoId } = req.params

    // validation 
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist Id")
    }
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id")
    }

    const updatedPlaylist = await Playlist.findOneAndUpdate(
        {
            _id: playlistId,
            owner: req.user._id
        },
        {
            $pull: {
                videos: videoId
            }
        },
        {
            new: true
        }
    )

    if (!updatedPlaylist) {
        throw new ApiError(404, "Playlist not found or you are not the owner")
    }
    return res.status(200)
        .json(
            new ApiResponse(
                200,
                updatedPlaylist,
                "Playlist updated successfully"
            )
        )
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    // get user id
    const { userId } = req.params

    // validate 
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId")
    }

    // fetching data
    const playlists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
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
                            createdAt: 1,
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
                as: "videos"
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                videos: 1,
                createdAt: 1
            }
        }
    ])
    return res.status(200)
        .json(
            new ApiResponse(
                200,
                playlists,
                "User playlists fetched successfully"
            )
        )
})

const getPlaylistById = asyncHandler(async (req, res) => {
    // get playlist Id
    const { playlistId } = req.params

    // validation
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist Id")
    }

    // finding playlist

    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
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
                            createdAt: 1,
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
                as: "videos"
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                videos: 1,
                createdAt: 1
            }
        }
    ])
    if (playlist.length === 0) {
        throw new ApiError(404, "Playlist not found")
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            playlist[0],
            "Playlist fetched successfully"
        )
    )
})

const deletePlaylist = asyncHandler(async (req, res) => {
    // get playlist Id
    const { playlistId } = req.params

    // validate
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playList Id")
    }

    // find and delete

    const deleted = await Playlist.findOneAndDelete(
        {
            _id: playlistId,
            owner: req.user._id
        }
    )
    if (!deleted) {
        throw new ApiError(404, "Playlist not found or you are not the owner")
    }
    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Playlist deleted successfully"
        )
    )
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body
    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid playlist Id")
    }
    if(!name?.trim() && !description?.trim()){
        throw new ApiError( 400 , "At least one field (name or description) is required to update" )
    }

    const fieldToBeUpdated = {}

    if(name?.trim()){
        fieldToBeUpdated.name = name.trim()
    }
    if(description?.trim()){
        fieldToBeUpdated.description = description.trim()
    }
    const updatedPlaylist = await Playlist.findOneAndUpdate(
        {
            _id : playlistId,
            owner : req.user._id
        },
        {
            $set : fieldToBeUpdated
        },
        {
           new: true
        }
    )
    if(!updatedPlaylist){
        throw new ApiError( 404 , "Playlist now found or you are not the owner")
    }
    return res.status(200).json(
        new ApiResponse(
            200,
            updatedPlaylist,
            "Playlist updated successfully"
        )
    )
})

export {
    createPlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    getUserPlaylists,
    getPlaylistById,
    deletePlaylist,
    updatePlaylist
}