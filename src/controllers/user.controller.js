import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);

    // Check if user exists
    if (!user) {
      console.log("❌ User not found with ID:", userId);
      throw new ApiError(404, "User not found");
    }

    // Debug: check if methods exist
    console.log("✅ Found User:", user);
    console.log("✅ generateAccessToken:", typeof user.generateAccessToken);
    console.log("✅ generateRefreshToken:", typeof user.generateRefreshToken);

    // Generate tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Save refreshToken to DB
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };

  } catch (error) {
    console.error("❌ ERROR generating tokens:", error);
    throw new ApiError(500, "Error generating tokens");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // 1. Get user details from frontend
  // 👉 Extract user data like name, email, password, avatar from `req.body`.

  // 2. Validation - not empty
  // 👉 Check that fields like email, password, etc., are not missing or empty.
  // Example: if (!email || !password) return res.status(400).json({error: "All fields are required"});

  // 3. Check if user already exists
  // 👉 Search the database for a user with the same email. If found, send error: "User already exists".

  // 4. Check for images, check for avatar
  // 👉 Check if the user has uploaded a profile picture (avatar). If not, you can set a default one.

  // 5. Upload them to Cloudinary, avatar
  // 👉 If image is uploaded, send it to **Cloudinary** (cloud image storage) and get the secure URL to store in DB.

  // 6. Create user object - create entry in DB
  // 👉 Create a new user document using `User.create({...})` with all valid data and save it to MongoDB.

  // 7. Remove password and refresh token field from response
  // 👉 Before sending response to frontend, remove sensitive data like `user.password`, `user.refreshToken`.

  // 8. Check for user creation
  // 👉 If user not created successfully, return error. Otherwise, continue.

  // 9. Return response
  // 👉 Send a success response with a message and the new user's public data.
    const {fullname,email,username,password}  = req.body
    console.log("email: ",email);

    if(
        [fullname,email,username,password].some(field =>
        field?.trim() === "") 
    ){
        throw new ApiError(400, "All fields are required");
    }
    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })
    if (existedUser) {
        throw new ApiError(409, "User already exists");
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if (!avatarLocalPath ) {
        throw new ApiError(400, "Avatar required");
    }

    const avatar= await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await  uploadOnCloudinary(coverImageLocalPath);

    if(!avatar) {
        throw new ApiError(500, "Avatar file is requireda ")
    }

   const user = await User.create({
        fullname,
        avatar:avatar.url,
        coverImage: coverImage?.url,
        email,
        password,
        username: username.toLowerCase().trim(),
    })
    const createdUser =  await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500, "Something went wrong whille regstring the user");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})
const loginUser = asyncHandler(async (req, res) =>{
    //req body -> data
    // username or email
    // find the user
    // password check
    // access and refresh token generation 
    // send cookies
    const{email, username, password} = req.body
    console.log("Email:", email);
    console.log("Username:", username);
    console.log("Password:", password);

    
   if ((!email && !username) || !password) {
  throw new ApiError(400, "Email or username and password are required");
}

    const user = await User.findOne({
        $or: [{email}, {username}]
    })
    
    if (!user) {
        throw new ApiError(404, "user does not exist")
        
    }
    const isPasswordValid = await user.isPasswordCorrect(password )

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
        
    }

    const {accessToken, refreshToken}  = await 
    generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).
    select("-password -refreshToken")

    const options = {
        httpOnly : true,
        secure: true
    }
    
    return res.status(200)
    .cookie("accessToken",accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
          200,
          {
            user :loggedInUser, accessToken,
            refreshToken
          },
          "User logged in SuccessFully"
        )
    )
})  

const logoutUser = asyncHandler(async (req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,{
            $set:{
                refreshToken: undefined
            }
        },{
            new : true
        }
    )

     const options = {
        httpOnly : true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json( new ApiResponse(200,{}, "User logged Out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user =  await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh token is expired or used")
        }
    
        const options = {
            httponly:true,
            secure: true
        }
    
        const {accessToken,newRefreshToken} = await generateAccessAndRefreshToken(user._id);
    
        return res
        .status(200)
        .cookie("acessToken",accessToken,options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                { accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {

        throw new ApiError(401,"Invalid refresh Token")
        
    }
})
const changeCurrentPassword = asyncHandler(async (req,res)=>{
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPaswwordCorrect){
        throw new ApiError(400, "Old password is incorrect")
    }
    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json( new ApiResponse(200,{},"Password changed Successfully"))
})

const getCurrentUser = asyncHandler(async (req,res) =>{
    return res
    .status(200)
    .json(new  ApiResponse(200,req.user, "Current user Fetched Successfully"))
})

const updateAccountDetails = asyncHandler(async (req,res)  => {
    const { fullname, email} = req.body


    if(!fullname || !email){
        throw new ApiError(400,"All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email
            }
        },
        {new :true}
    ).select("-password ")

    return res.
    status(200)
    .json( new ApiResponse(200, user, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler (async (req,res) =>{
    const avatarLocalPath = req.files?.path

    if (!avatarLocalPath) {
        throw new ApiError(400,"Avtar file is missing")
        
    }

    const avatar = await uploadOnCloudinary
    (avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400, "Error while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new:true}
    ).select("-password")  
    
    return res
    .status(200)
    .json(
        new ApiResponse(200, user , "Avatar image updated successfully" )
    )
})

const updateUserCoverImage = asyncHandler (async (req,res) =>{
    const coverImageLocalPath = req.files?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400,"coverImage file is missing")
        
    }

    const coverImage = await uploadOnCloudinary
    (coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400, "Error while uploading coverImage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new:true}
    ).select("-password")   
    
    return res
    .status(200)
    .json(
        new ApiResponse(200, user , "Cover image updated successfully" )
    )
})

const getUserChannelProfile = asyncHandler(async(req,res) =>{

    const {username}  = req.params

    if (!username?.trim()) {
        throw new ApiError(400,"username is missing")    
    }
    const channel =  await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField : "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField : "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount:{
                    $size: "$subscribedTo"
                },
                isSubscribed:{
                    $cond: {
                        if: {$in:[req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username:1,
                subscribersCount: 1,
                channelsSubscribedToCount:1,
                isSubscribed :1,
                avatar: 1,
                coverImage:1,
                email: 1
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists")
        
    }
    return res
    .status(200)
    .json(
        new ApiError(200,"user channel fetch succesfully")
    )

})

const getWatchHistory =  asyncHandler(async(req,res) =>{
    const user = await  User.aggregation([
        {
            $match: {
                _id: new mongoose.Type.objectId(req.user._id)
            }

        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "WatchHistrory",
                pipeline: [
                    {
                        $lookup:{
                            from: "user",
                            localField: "owner",
                            foreignField: "_id",
                            as : "Owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$Owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch History fetch Successfully"
        )
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
};