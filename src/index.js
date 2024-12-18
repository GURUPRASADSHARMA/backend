
import connectDB from "./db/index.js";
 

connectDB();




/*
//method to connnect database and handling all the error
import express from "express"
const app= express();

(async ()=>{
    try {
      await  mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
      app.on("error",(error)=>{
        console.log("ERROR",error);
        throw error;
      })

      app.listen(process.env.PORT,()=>{
            console.log(`server is running on port ${process.env.PORT}`)
      })
        
    } catch (error) {
        console.error("ERROR",error);
        throw error;
        
    }
})()
    */