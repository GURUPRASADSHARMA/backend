import { asyncHandler } from "../asyncHandler.js"

const registerUser = asyncHandler( async (req,res)=>{
          return  res.status(200).json({
                message:"hii hello what's going on brother",
                reply:"learning backend from chai aur code"
            })
})


export default registerUser