<!-- # Web service distributing crawled data from crawlers. -->
<!-- :white_check_mark: -->

# Backend API Specifications

### Item & User Services
<!-- - Data for chart showing price of item at the different time. -->
  :heavy_check_mark: Available with **Tiki and Shopee platform** by now.

- Show relative information about item by receiving: *item ID, seller ID and item URL*.

  :white_check_mark: Price of item at different time

  :white_check_mark: Preview images

  :white_check_mark: Information about the seller selling that item

- Users are able to follow items and get notifications if there is changing in item's price.

  :white_check_mark: Choose an item to tracking it's price

  :white_large_square: Get notifications if prices are changes



### Users & Authentication
- Authentication will be on using JWT/cookies
  
  :white_check_mark: JWT and cookie should expired in 1 hour
  
  :white_check_mark: Refresh token won't be expired until 90 days 

  :white_check_mark: Access token is renewable by using refresh token
- User registration

  :white_check_mark: Register as a "user"

  :white_check_mark: Once registered, a token will be sent along with a cookie (accessToken = xxx)

  :white_check_mark: Passwords must be hashed
- User login

  :white_check_mark: User can login with phone and password

  :white_check_mark: Plain text password will compare with stored hashed password

  :white_check_mark: Once logged in, a token will be sent along with a cookie (token = xxx)
- User logout

  :white_check_mark: Cookie will be sent to set token = none
- Get user

  :white_check_mark: Route to get the currently logged in user (via token)
- Password reset (forget password)

  :white_large_square: User can request to reset password

  :white_large_square: A hashed token will be emailed to the users registered email address

  :white_large_square: A put request can be made to the generated url to reset password

  :white_large_square: The token will expire after 10 minutes
- Update user info

  :white_large_square: Authenticated user only

  :white_large_square: Separate route to update password
- User C.R.U.D

  :white_check_mark: Admin only
- Users can only be made admin by updating the database field manually

### Security
- Encrypt passwords and reset tokens
- Prevent NoSQL injections
- Add headers for security (helmet)
- Prevent cross site scripting - XSS
- Protect against HTTP Params Pollution
- Use cors to make API public (for now)