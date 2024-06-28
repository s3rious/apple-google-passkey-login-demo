# Apple/Google OAuth and WebAuthN demonstration project

This is a demonstration project to investigate how Apple and Google OAuth works in tandem with Passkey (also known as WebAuthN). 
This project is **not intended for production use** and should only be used for educational purposes.

## Prerequisites

Before running the project, ensure you have the following:

- Node.js (20+) and npm installed.
- Your own `.env` file with the necessary configuration (see `.env.sample`).

## Setup

1. Clone the repository:
    ```sh
    git clone https://github.com/s3rious/apple-google-passkey-login-demo.git
    cd apple-google-passkey-login-demo
    ```

2. Install the dependencies:
    ```sh
    npm install
    ```

3. Create a `.env` file in the root directory with the following contents, and replace the placeholder values with your actual credentials and secrets:
    ```plaintext
    HTTPS_PATH_TO_CERT=path_to_cert
    HTTPS_PATH_TO_KEY=path_to_key

    ORIGIN=https://your.domain
    JWT_SECRET=your_secret_key
    SESSION_SECRET=your_session_secret

    APPLE_CLIENT_ID=your_apple_client_id
    APPLE_TEAM_ID=your_apple_team_id
    APPLE_PRIVATE_KEY_ID=your_apple_private_key_id
    APPLE_PRIVATE_KEY=your_apple_private_key

    GOOGLE_CLIENT_ID=your_google_client_id
    GOOGLE_CLIENT_SECRET=your_google_client_secret
    ```

4. Ensure you have HTTPS certificates (key and cert) and provide their paths in the `.env` file as `HTTPS_PATH_TO_KEY` and `HTTPS_PATH_TO_CERT`.

5. Register your own Apple and Google applications and obtain the necessary client IDs, secrets, and keys. Provide these details in the `.env` file.

## Running the Project

1. Start the HTTPS server:
    ```sh
    npm start
    ```

2. Open your browser and navigate to the login page:
    ```
    https://your.domain/login
    ```

## Project Structure

- `index.js`: Main server setup and route definitions.
- `auth.js`: Basic email/password authentication routes.
- `apple.js`: Apple OAuth routes and handlers.
- `google.js`: Google OAuth routes and handlers.
- `passkey.js`: Passkey (WebAuthN) routes and handlers.
- `utils.js`: Utility functions for user data management and token authentication.
- `public/`: Contains static files such as `login.html` and `dashboard.html`.

## Key Features

- **Email/Password Authentication**: Basic user registration and login using email and password.
- **Apple OAuth**: Login and link functionality using Apple OAuth.
- **Google OAuth**: Login and link functionality using Google OAuth.
- **Passkey (WebAuthN)**: Registration and authentication using Passkeys.

## Notes

- This project uses HTTPS, so ensure your certificates are correctly configured.
- This project is for demonstration purposes only and should not be used in a production environment.
- Always keep your `.env` file secure and never expose it in a public repository.

## License

This project is licensed under the MIT License.
