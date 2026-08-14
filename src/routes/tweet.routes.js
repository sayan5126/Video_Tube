import { Router } from "express";
import {
    createTweet,
    getUserTweets,
    getLatestTweets,
    updateTweet,
    deleteTweet
} from "../controllers/tweet.controller.js"

import { verifyJWT } from "../middlewares/auth.middleware.js"

// Create tweet
router
    .route("/")
    .post(
        verifyJWT,
        createTweet
    );


// Get latest tweets
router
    .route("/latest")
    .get(
        getLatestTweets
    );


// Get tweets of a specific user
router
    .route("/user")
    .get(
        getUserTweets
    );    

// Update tweet
router
    .route("/:tweetId")
    .patch(
        verifyJWT,
        updateTweet
    );

// Delete tweet
router
    .route("/:tweetId")
    .delete(
        verifyJWT,
        deleteTweet
    );    


export default router