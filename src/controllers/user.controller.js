import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
const userregister = asyncHandler( async (req , res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar (avatar is required to register , cover image optional)
    // upload them to cloudinary, and also cheak again that avatar is succesfully uploaded
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return response

    // st->1 get user details from frontend

    const { username , email , fullName , password } = req.body
    console.log(username , email , fullName , password);

    // st->2 validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex =/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if(
        [username , email , fullName , password].some((field) => !field?.trim() )
    ){
        throw new ApiError( 400 , "All fields are required");
    }

    if(!emailRegex.test(email)){
        throw new ApiError( 400 , "Please provide a valid email address");
    }

    if(!passwordRegex.test(password)){
        throw new ApiError( 400 , "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character")
    }

    // st->3 check if user already exists: username, email

    const existedUser = await User.findOne({
        $or : [{ username } , { email }]
    })

    if(existedUser){
        throw new ApiError(409 , "User with email or username already exists")
    }

    // st->4 check for images, check for avatar (avatar is required to register , cover image optional)

    let avatarLocalPath;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0){
        avatarLocalPath = req.files.avatar[0].path;
    }
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }



    if(!avatarLocalPath){
        throw new ApiError(400 , "Avatar is required");
    }

    // st->5 upload them to cloudinary, and also cheak again that avatar is succesfully uploaded

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if(!avatar){
        throw new ApiError(400 , "Avatar is required");
    }

    // st->6 create user object - create entry in db

    const user = await User.create({
        username,
        email,
        password,
        fullName,
        avatar : avatar.url,
        coverImage : coverImage?.url || ""
    })

    // st->7 remove password and refresh token field from response
    const createdUser = await User.findById(user._id)?.select(
        "-password -refreshToken"
    );

    // st->8 check for user creation
    if(!createdUser){
        throw new ApiError( 500 , "Something went wrong while registering the user")
    }

    // st->9 return response

    return res.status(201).json(
        new ApiResponse(200 , createdUser , "User Registered Successfully")
    )
})



export { userregister }