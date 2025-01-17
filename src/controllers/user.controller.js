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
     const refreshToken=user.generateRefreshToken()
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
//logout process
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
// handling token
const refreshAcessToken=asyncHandler(async (req,res)=>{
  const incomingRefreshToken= req.cookies.refreshToken || req.body.refreshToken
  if(!incomingRefreshToken){
    throw new ApiError(401,"unauthrozied acess")
  }

  try {
    const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    const user = await User.findById(decodedToken._id)
    if(!user){
      throw new ApiError(401,"INVALID REFRESH TOKEN")
    }
  
  if(incomingRefreshToken !== user?.refreshTokens){
    throw new ApiError(401,"your refresh token is expired or used")
  }
  
  const options = {
    httpOnly:true,
    secure:true
  }
  
  const {acessToken,newRefreshToken}=await generateAcessTokenAndRefreshToken(user._id)
  
  return res
  .status(200)
  .cookie("acessToken",acessToken,options)
  .cookie("refreshToken",newRefreshToken,options)
  .json(
    new ApiResponse(
      200,
      {acessToken,refreshToken:newRefreshToken},
      "acess token refreshed"
    )
  )
  } catch (error) {
    throw new ApiError(401,error?.message || "invlid refresh token")
  }

})
// changing password by user
const  changeCurrentPassword= asyncHandler(async (req,res)=>{
  const {oldPassword,newPassword} =req.body

 const user= await User.findById(req.user?._id)
 const isPasswordCorrect = user.isPasswordCorrect(oldPassword)
 if(!isPasswordCorrect){
  throw new ApiError(401,"invalid old password")
}
 user.password = newPassword
 await user.save({validateBeforeSave:false})

 return res
 .status(200)
 .json(new ApiResponse(200,{},"Password changed sucessfully"))
 

})
// getting current user
const getCurrentUser=asyncHandler(async (req,res)=>{

  return res
  .status(200)
  .json(new ApiResponse(200,req.user,"current user fetched sucessfully"))

})
//updaate profile
const updateAccountDeatail = asyncHandler(async (req,res)=>{

  const {fullname,email}=req.body // ye body se ayega ie. ffrontend se ayega
  if(!(fullname||email)){
    throw new ApiError(400,"all field are required") 
  }
 const user = await User.findByIdAndUpdate(
  req.user?._id,
    {
      $set:{
        fullname:fullname, 
        // this can also be written as => fullname
        email 
        // jb forntend se ane wala data aur existing data ka naam save ho to direct likh skte hai 

      }
    },
    {new:true} // now ko true krne pr jo bhi data return hoga wo updated wala hoga
  ).select("-password")

return res 
.status(200)
.json(new ApiResponse(200,user,"Account detail updated sucessfully"))

})
 
const updateUserAvatar= asyncHandler(async (req,res)=>{
const avatarLocalPath=req.file?.path
const avatar = await uploadOnCloudinary(avatarLocalPath)
if(!avatar.url){
throw new ApiError(400,"problem while uoloading avatar image")
}
const user = await User.findByIdAndUpdate(
  req.user?._id,
  {
    $set:{
      avatar:avatar.url
    }
  },
  {new:true}
).select("-password")

return res
.status(200)
.json(new ApiResponse(200,user,"avatar uploaded sucessfully"))

})

const updateUserCoverImage=asyncHandler(async(req,res)=>{
  const coverImageLocalPath = req.file?.path
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)
  if(!coverImage.url){
    throw new ApiError(400,"Problem on uploading coverimage")
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
  {
    $set:{
      coverImage:coverImage.url
    }
  },
  {new:true}
).select("-password")

return res
.status(200)
.json(new ApiResponse(200,user,"coverimage uploaded sucessfully"))
})

const getUserChannelProfile = asyncHandler(async (req,res)=>{
    const {username} = req.params
    if(!username?.trim()){
      throw new ApiError(400,"username is missing")
    }

   const channel = await User.aggregate([
    {
      // how to find
      $match:{
        username: username?.toLowerCase()
      }
    },
    {
      //finding no. of subscriber
      $lookup:{
        from:"subscriptions",
        localField:"_id",
        foreignField:"channel",
        as:"subscribers"
      }
    },
    {
      // to whom i subscribed
      $lookup:{
        from:"subscriptions",
        localField:"_id",
        foreignField:"subscriber",
        as:"subscribedTo"
      }
    },
    {
      $addFields:{ 
        subscriberCount: {
          $size:"$subscribers"
        },
        channelSubscribedTo: {
          $size:"$subscribedTo"
        },
        isSubscribed:{
          $cond:{// in ka matlab hai wo ie.req.user._id us $subcribers.subscriber oibject me hai ya nhi note: ye object us channel ka jisko tum open kiye ho taki pata laga ske ki tum subscribed ho ya nhi taki hm frontend wale ko true or false de ske to wo subscribed dikha ske or subscribe dikha ske 
            if:{$in:[req.user?._id,"$subcribers.subscriber"]},
            then:true,
            else:fals
          },
        }
      }
    },
    {
      $project:{
        fullname:1,
        username:1,
        subscriberCount:1,
        channelSubscribedTo:1,
        isSubscribed:1,
        avatar:1,
        coverImage:1,
        email:1,
      }
    }
   ])
   if(!channel?.length){
    throw new ApiError(404,"channel does not exist")
   }

   return res
   .status(200)
   .json(new ApiResponse(200,channel[0],"User channel fetched sucessfully"))

})

export  {registerUser,
  loginUser,
  logoutUser,
  refreshAcessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDeatail,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
}