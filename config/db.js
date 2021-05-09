const mongoose = require('mongoose');

const mongooseOption = {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    useFindAndModify: false, // NEW
};

const DB = 'MONGO_URI_CLOUD';

const connectDB = () => {
    mongoose.connect(process.env[DB], mongooseOption, (error)=>{
        if(error){
            console.log(error);
        }
        else{
            console.log(`Connected to ${DB}`);
        }
    })
};

module.exports = connectDB;
