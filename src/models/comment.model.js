import mongoose from "mongoose"
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

commentSchema = new mongoose.Schema({
    content : {
        type : String,
        required : true,
    },
    video : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Video"
    },
    owner : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User"
    },
},{timestamps : true}) 

commentSchema.plugin(mongooseAggregatePaginate)
const Comment = mongoose.model("Comment" , commentSchema)