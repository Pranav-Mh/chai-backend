import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';


const connectDB = async () =>{
    try{
        const connectionInstances = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\n MOngoDB connected !! DB HosT: ${connectionInstances.connection.host} \n`);

    }catch(error){
        console.log("Error connecting to the database:", error);
        process.exit(1); // Exit the process with failure
    }
} 

export default connectDB