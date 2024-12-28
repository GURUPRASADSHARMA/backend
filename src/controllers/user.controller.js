import { asyncHandler } from "../asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import{ User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"


// creating method to genrate tokens as it is called many functin

const generateAcessTokenAndRefreshToken= async (userId)=>{
  try {
     const user=   await User.findById(userId)
     const acessToken= user.generateAcessToken()
     const refreshToken=user.generateAcessToken()
    user.refreshToken=refreshToken
    user.save({validateBeforeSave:false})
    return {refreshToken,acessToken}
  } catch (error) {
    throw new ApiError(500,"something went wrong while creating reffresh tokens and acess tokens")
  }
}


// method for registering user
const registerUser = asyncHandler( async (req,res)=>{
        const {fullname,username,email,password}=req.body
        // console.log(req.files)
        // console.log("email",email)

        // validation of every field
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

      // creating object to save it on database note: this user as it is save on mongo cloud

     const user= await User.create({
        fullname,
        avatar: avatar.url,
        coverImage:coverImage?.url || "",
        email,
        username:username.toLowerCase(),
        password
        
      })


      // SENDING API TO THE FRONTEND USERS
      // .select IS USED TO SEND EVERYTHING EXCEPT PASSWORD AND REFRESH TOKENS
      
      const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
      )  

      // HNADLING API IF ANY ERROR
      if(!createdUser){
        throw new ApiError(500,"something went wrong while registering the user")
      }

      return res.status(201).json(
        new ApiResponse(200,createdUser,"user is registered sucessfully")
      )
})

// login process

// CREATING FUNCTION TO VALIDATR USER 


const loginUser = asyncHandler( async (req,res)=>{

  const {username,password,email} = req.body
  if(!(username || email)){
      throw new ApiError(400,"username or email is required")
  }

  const user = await User.findOne({
      $or:[{ username },{ password }]
    })
    // note: this user is userschems and User is the user provided by mongoose

      if(!user){
       throw new ApiError(404,"username or email  not find")
      }else{console.log(user)}

      
      const isPasswordValid = await user.isPasswordCorrect(password)

      if(!isPasswordValid){
        throw new ApiError(401,"your password is incorrect")
      }

     const {refreshToken,acessToken}= await generateAcessTokenAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")


      //SINCE COOKIE CAN BE MODIFIED BY FRONTEND USER SO WE CREATE OTION TO MAKE IT UNMODIFIEBLE from frontend but it still can be modified from server

      const options={
        httpOnly:true,
        secure:true
      }

      return res
      .status(200)
      .cookie("acessToken",acessToken,options)
      .cookie("refreshToken",refreshToken,options)
      .json(
       new ApiResponse(
          200,
          {
            user: loggedInUser, refreshToken, acessToken 
          },
          "user logged in sucessfully"
        )
      )

})

const logoutUser = asyncHandler(async (req,res)=>{
        await User.findByIdAndUpdate(req.user._id,
          {
            $set:{
              refreshToken: undefined
            }
          },
          {
            new:true
          }
        )
        const options={
          httpOnly:true,
          secure:true
        }
        return res
        .status(200)
        .clearCookie("acessToken",options)
        .clearCookie("refreshToken",options)
        .json(new ApiResponse(200,{},"user loggedout"))

})


export  {registerUser,loginUser,logoutUser}