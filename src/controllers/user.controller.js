import { asyncHandler } from '../utils/asyncHandler.js'
// import {ApiError} from '../utils/ApiError.js'
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import jwt from 'jsonwebtoken';

const generateAccessAndRefereshToken = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false })

    return { accessToken, refreshToken }
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating access and referesh token");
  }
}

const registerUser = asyncHandler(async (req, res) => {

  //steps of registration of user
  //get user details from frontend 
  //validate: not all empty
  //check if a user if already loggedin or not: username, email
  //check images ,and avatar
  //upload images to clodinary, avatar
  // encrpt the password
  //create user object - create db entries
  //remove password, and refreshToken field from response 
  //check user created successfully or not 
  //return res   

  const { fullName, email, username, password } = req.body

  //consoling to check data
  console.log("Email: ", email);
  console.log(req.body);

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All Fields are required")
  }

  const userExist = await User.findOne({
    $or: [{ email }, { username }]
  })

  if (userExist) {
    throw new ApiError(409, "user with this email and username is already exist")
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath
  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  //   console.log(avatar.url);
  //   console.log(coverImage.url);
  if (!avatar) {
    throw new ApiError(400, "Avatar file is required")

  }


  const user = await User.create({
    fullName,
    email,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    password,
    username: username.toLowerCase(),
  });

  const registeredUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!registeredUser) {
    throw new ApiError(500, "Something went wrong while registering the user, server side error!!");
  }

  return res.status(201).json(
    new ApiResponse(200, registerUser, "user registred successfully"

    ))

})

const loginUser = asyncHandler(async (req, res) => {
  //get login data from frontend through req
  //check if field is empty or not 
  //compare given email with email in database 
  //if user found generate refresh token and access token send through cookies

  //check password 
  //if login seccesful redirect to home page
  //

  const { username, email, password } = req.body

  if (!(username || email)) {
    throw new ApiError(400, "Email or username is required");
  }

  const user = await User.findOne({
    $or: [{ email }, { username }]
  })

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }



  const { accessToken, refreshToken } = await generateAccessAndRefereshToken(user._id);

  const loggedInUser = await User.findById(user._id)  //this user have refreshtoken

  const options = {
    httpOnly: true,
    secure: true
  }

  return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, {
      user: loggedInUser, accessToken, refreshToken
    },
      "User logged in Successfully"))

})

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined
      }
    },
    {
      new: true
    })

    const options = {
    httpOnly: true,
    secure: true
  }

  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(new ApiResponse(200, {}, "User logged out successfully"))




})

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if(!incomingRefreshToken){
    throw new ApiError(401, "unauthorized request")
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
  
    const user = await User.findById(decodedToken?._id)
     
    if(!user){
      throw new ApiError(401, "Invalid refresh token")
    }
  
    if(incomingRefreshToken !== user?.refreshToken){
      throw new ApiError(401, "refresh token is expired or used")
    }
  
    const options = {
      httpOnly: true,
      secure: true
    }
  
    const {accessToken, newRefreshToken} = await generateAccessAndRefereshToken(user._id)
     
    return res
    .status(200)
    .cookie("refreshToken", newRefreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(
      new ApiResponse(
        200,
        {accessToken, refreshToken: newRefreshToken},
        "Access token refreshed"
      )
    )
  } catch (error) {
    throw new ApiError(401, error?.message || "Inalid refresh token")
  }

  
})


const changeCurrentPassword = asyncHandler(async (req, res) => { 
  const {oldPassword, newPassword} = req.body

  const user = await User.findById(req.user?._id);
  const isPasswrodCorrect = await user.isPasswordCorrect(oldPassword);

  if(!isPasswrodCorrect){
    throw new ApiError(401, "Invalid old password")
  }

  user.password = newPassword;
  await user.save({validateBeforeSave: false})

  return res
  .status(200)
  .json(
    new ApiResponse(200, {}, "passord changed successfully")
  )
})

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
  .status(200)
  .json(new ApiResponse(200, req.user, "current user fetched successfully"))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
  const {fullName, email}  = req.body

  const user = await User.findByIdAndUpdate(req.user?._id, 
    {
      $set: {
        fullName,
        email
      }
    },
    {
      new: true
    }
  ).select("-password")

  return res
  .status(200)
  .json(
    new ApiResponse(200, user, "Account details updated successfully")
  )
})

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath =  req.file?.path

  if(!avatarLocalPath){
     throw new ApiError(400, "Avatar file is missing")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if(!avatar.url){
     throw new ApiError(400, "Error while uploading the avatar on cloudinary")
  }

  const user = await User.findByIdAndUpdate(req.user?._id,
    {
      $set: {
        avatar: avatar.url
      }
    },
    {
      new: true
    }
  ).select("-password")

   return res
   .status(200)
   .json(
    new ApiResponse(200, user, "Avatar updated successfully")
   )

})


const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path

  if(!coverImageLocalPath){
    throw new ApiError(400, "Cover image file is missing")
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if(!coverImage.url){
    throw new ApiError(400, "Error while uploading coverImage on cloudinary");
  }

  const user = await User.findByIdAndUpdate(req.user?._id,
    {
     $set: {
      coverImage: coverImage.url
     }
    },
    {
      new: true
    }
  ).select("-password")

  return res
  .status(200)
  .json(
    new ApiResponse(200, user, "coverImage updated seccessfully")
  )

})


export { registerUser, loginUser, logoutUser, refreshAccessToken , changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage}