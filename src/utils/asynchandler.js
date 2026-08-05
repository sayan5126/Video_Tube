const asyncHandler = (requesthandler) => {
    return (req , res, next) => {
        Promise.resolve(requesthandler(req , res , next)).catch((error) => next(error))
    }
}

export {asyncHandler}



//  USING try-catch ----->>>>>


// const asynchandler = (fun) => {} 
// const asynchandler = (fun) => {()=>{}} 
// const asynchandler = (fun) => {async()=>{}} 

// const asynchandler = (fn) => async (err , req , res , next)=>{
//     try{
//         await fn(err , req , res , next)
//     }catch(error){
//         res.status(err.code || 500).json({
//             success : false,
//             message : err.message
//         }) 
//     }
// }