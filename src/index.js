import connectDB from "./db/index.js";
import { app } from "./app.js"
import dotenv from "dotenv"
dotenv.config({
    path : "./env"
})
connectDB()
.then(()=>{
    app.on("error" , (error) => {
        console.log(`Error occured :${error}`);
        process.exit(1);
    })
    app.listen( process.env.PORT || 5000 , ()=>{
        console.log(`MongoDb connected !! listening on port : ${process.env.PORT}`);
    })
})
.catch((error)=>{
    console.log(`MongoDB connection failed ! ERROR : ${error}`);
})