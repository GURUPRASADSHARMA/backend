import { asyncHandler } from "../asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import{User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"



const registerUser = asyncHandler( async (req,res)=>{
        const {fullname,username,email,password}=req.body
        console.log(req.files)
        console.log("email",email)
        if(
            [username,email,password,fullname].some(
                (field)=> field?.trim()==""
            )
        ){
            throw new ApiError(400,"all fields are required")
        }

        const existedUser= await User.findOne({
            $or:[{ email },{ username }]
        })
        if(existedUser){
            throw new ApiError(409,"user already exist")
        }

       const avatarLocalPath= req.files?.avatar[0]?.path
       //const coverImageLocalPath= req.files?.coverImage[0]?.path
        // anotherway to handle coverimage
       let coverImageLocalPath;
       if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath=req.files.coverImage[0].path
       }

       if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required")
       }

       const avatar= await uploadOnCloudinary(avatarLocalPath)
      const coverImage= await uploadOnCloudinary(coverImageLocalPath)

      if(!avatar){
        throw new ApiError(400,"avatar file is required")
      }

     const user= await User.create({
        fullname,
        avatar: avatar.url,
        coverImage:coverImage?.url || "",
        email,
        username:username.toLowerCase(),
        password
        
      })

      //
      const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
      )

      if(!createdUser){
        throw new ApiError(500,"something went wrong while registering the user")
      }

      return res.status(201).json(
        new ApiResponse(200,createdUser,"user is registered sucessfully")
      )
})


export default registerUser