import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
const likeSchema = new mongoose.Schema({
    likedBy : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        required : true
    },
    video : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Video"
    },
    comment : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Comment"
    },
    tweet : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Tweet"
    }
},{timestamps : true})

likeSchema.plugin(mongooseAggregatePaginate)
likeSchema.index(
    { likedBy: 1, video: 1 },
    { unique: true, sparse: true }
);

likeSchema.index(
    { likedBy: 1, comment: 1 },
    { unique: true, sparse: true }
);

likeSchema.index(
    { likedBy: 1, tweet: 1 },
    { unique: true, sparse: true }
);
const Like = mongoose.model("Like" , likeSchema)