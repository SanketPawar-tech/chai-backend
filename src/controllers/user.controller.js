import { asyncHandler } from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'

const registerUser = asyncHandler( async (req, res) => {
    
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

const {fullName, email, username, password} = req.body

//consoling to check data
console.log("Email: ", email);
console.log(req.body); 

if(
  [fullName, email, username, password].some((field) => field.trim() === "")
){
    throw new ApiError(400, "All Fields are required")
}

const userExist = User.findOne({
    $or: [ { email }, { username } ]
})

if(userExist){
    throw new ApiError(409, "user with this email and username is already exist")
}

const avatarLocalPath = req.files?.avatar[0]?.path;
const coverImageLocalPath = req.files?.coverImage[0]?.path;

if(!avatarLocalPath){
  throw new ApiError(400, "Avatar file is required")
}

const avatar = await uploadOnCloudinary(avatarLocalPath);
const coverImage = await uploadOnCloudinary(coverImageLocalPath);

if(!avatar){
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
 if(!registeredUser){
    throw new ApiError(500, "Something went wrong while registering the user, server side error!!");
 }

return res.status(201).json(
    new ApiResponse(200, registerUser, "user registred successfully" 
        
    ))

})







export { registerUser }