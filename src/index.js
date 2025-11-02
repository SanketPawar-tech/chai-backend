import app from "./app.js";
import ConnectDB from "./db/index.js";
import dotenv from "dotenv";

dotenv.config({
    path: './env'
})

ConnectDB()
.then(
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running on port: ${process.env.PORT}`);
    })
)
.catch( (error) => {
    console.log(`mongoDB connection failed !!! `, error);
})









/*


import express from "express";

const app = express();
( async () => {
try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
    app.on( "errror",(error)=>{
        console.log("Errror: ", error);
        throw error;
    })

    app.listen(process.env.PORT, ()=> {
        console.log(`App is listening on port: ${process.env.PORT}`);
    })
} catch (error) {
    console.error(`ERROR: ${error}`);
    throw error;
}

})()

*/