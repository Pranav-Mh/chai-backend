import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";

import { ApiResponse } from "../utils/ApiResponse.js";


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

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

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


export {registerUser};