import { v2 as cloudinary} from "cloudinary";
import fs from "fs"

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath)=>{
try {
    if(!localFilePath) return null;
    // uploading file 
   const response = await cloudinary.uploader.upload(localFilePath,{
        resource_type:"auto"
    })
// file sucessfully uploaded
//console.log("file uploaded sucesfully",response.url)
fs.unlinkSync(localFilePath)
return response;
} catch (error) {
    fs.unlinkSync(localFilePath) // remove the temporary saved file on our server after file uploading get cancelled or failed
    return null
}
}

export {uploadOnCloudinary}