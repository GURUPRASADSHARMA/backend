import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
import dotenv from 'dotenv'

dotenv.config();
const connectDB = async ()=>{
    try {
     const connectionInstances= await  mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\n mongodb connection host ${connectionInstances.connection.host} `)  
        // console.log(connectionInstances) 
    } catch (error) {
      console.error("error",error);
      process.exit(1);  
    }
}

export default connectDB