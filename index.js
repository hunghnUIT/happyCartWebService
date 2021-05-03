const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const sanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const errorHandler = require('./middlewares/errorHandler');
const multer = require('multer');
const passport = require('passport');
const expressSession = require('express-session');

const adminRoute = require('./routes/admin');
const authRoute = require('./routes/auth');
const itemRoute = require('./routes/item');
const categoryRoute = require('./routes/category');
const userRoute = require('./routes/user');

const connectDB = require('./config/db');
const initLoginFacebook = require('./config/fb');

// Load env
dotenv.config({path: './config/config.env'})

// Connect to DB
connectDB();

// init log in with facebook
initLoginFacebook();

const app = express();

// Body Parser
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded
app.use(multer().array()); // for parsing application/form-data

// Cookie Parser
app.use(cookieParser());

// Mongo sanitize => Prevent mongodb ejections
app.use(sanitize()); 

// Set security headers => Add more header to prevent xss attack
app.use(helmet());

// Prevent xss attack
app.use(xss());

// Enable CORS
app.use(cors());

// prevent http params pollution
app.use(hpp());

//Logger only in development mode
if(process.env.NODE_ENV === 'development'){
    app.use(morgan('dev'));
}
// Session
app.use(expressSession({ 
    secret: process.env.SECRET, resave: false,
    cookie: { httpOnly: true }, saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());

app.use("/api/v1/items/", itemRoute);
app.use("/api/v1/admin/", adminRoute);
app.use("/api/v1/auth/", authRoute);
app.use("/api/v1/user/", userRoute);
app.use("/api/v1/categories/", categoryRoute);

// FIXME These lines below is temporary until I find some other way to do this, DELETE AS SOON AS POSSIBLE
// Reset password with token must be in GUI because mail is sent.
const { getUIResetPassword, postUIResetPassword } = require('./controllers/auth');
app.use(multer().array()); // don't understand why need to put this line here AGAIN for parsing form body
app.set('views', './public');
app.set('view engine', 'ejs');
app.get('/auth/reset-password/:token', getUIResetPassword);
app.post('/auth/reset-password/:token', postUIResetPassword);


app.use(errorHandler);


const PORT = process.env.PORT || 5000;
app.listen(PORT, console.log(`Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`));
