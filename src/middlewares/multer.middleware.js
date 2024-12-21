import multer from "multer"

const storage = multer.diskStorage({
    destination: function(req,file,cb){
        cb(null,"./public/temp")
    },
    filename: function(req,file,cb){
        cb(null,file.originalname)// note all the files are save with their orignal name same name can overwrite the files if you want change it 
    }
        
    
})

export const upload = multer(
    {
        storage:storage
    }
)