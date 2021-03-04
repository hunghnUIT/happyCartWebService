<!-- # Web service distributing crawled data from crawlers. -->
<!-- :white_check_mark: -->

# Backend API Specifications

### Item
- Data for chart showing price of item at the different time.


### Users & Authentication
- Authentication will be on using JWT/cookies
  :white_large_square: JWT and cookie should expired in 30 days
  :white_large_square: Refresh token won't be expired as long as user stay sign in
- User registration
  :white_large_square: Register as a "user"
  :white_large_square: Once registered, a token will be sent along with a cookie (token = xxx)
  :white_large_square: Passwords must be hashed
- User login
  :white_large_square: User can login with email and password
  :white_large_square: Plain text password will compare with stored hashed password
  :white_large_square: Once logged in, a token will be sent along with a cookie (token = xxx)
- User logout
  :white_large_square: Cookie will be sent to set token = none
- Get user
  :white_large_square: Route to get the currently logged in user (via token)
- Password reset (forget password)
  :white_large_square: User can request to reset password
  :white_large_square: A hashed token will be emailed to the users registered email address
  :white_large_square: A put request can be made to the generated url to reset password
  :white_large_square: The token will expire after 10 minutes
- Update user info
  :white_large_square: Authenticated user only
  :white_large_square: Separate route to update password
- User C.R.U.D
  :white_large_square: Admin only
- Users can only be made admin by updating the database field manually

### Security
- Encrypt passwords and reset tokens
- Prevent NoSQL injections
- Add headers for security (helmet)
- Prevent cross site scripting - XSS
- Protect against HTTP Params Pollution
- Use cors to make API public (for now)