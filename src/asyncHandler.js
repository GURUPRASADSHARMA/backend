

const asyncHandler=(requestHandler)=>{
   return (req,res,next)=>{
            Promise.resolve(requestHandler(req,res,next))
            .catch((err)=>{
                console.log(err);
            })
    }


}


export  {asyncHandler}





// const asyncHandler=()=>{async ()=>{}} //higher order function which accept function as parameter another way of writting this is remove curly bracket

//by using try catch 

// const asyncHandler = (fn)=> async (req,res,next)=>{
//     try {
//         await fn(req,res,next)
        
//     } catch (error) {
//         req.status(error.code || 500).json({
//             sucess:false,
//             message:error.message
//         })
//     }
// }


// using promises

