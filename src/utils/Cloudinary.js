import {v2 as cloudinary} from "cloudinary"
import fs from "fs"



// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDBNARY_CLOUD_NAME , 
    api_key: process.env.CLOUDBNARY_API_KEY, 
    api_secret: process.env.CLOUDBNARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try{
        if(!localFilePath) return null
        //  Upload the file to Cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        //file has been uploaded suceesfully
        //console.log("File is uploaded Sucesfully on Cloudnary",response.url)
        fs.unlinkSync(localFilePath)
        return response
    }catch(error){
        fs.unlinkSync(localFilePath) // delete the file from local storage
        return null;
    }

}
export { uploadOnCloudinary }; // ✅ correct spelling
