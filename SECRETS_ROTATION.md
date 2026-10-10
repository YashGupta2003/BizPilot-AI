# BizPilot AI Secrets Rotation Guide

This document describes how to rotate the various secrets used in the application.

## 1. JSON Web Token (JWT) Secret
*   **Key:** `JWT_SECRET_KEY`
*   **Purpose:** Signs authentication tokens for users.
*   **Rotation:**
    1.  Generate a new random string (at least 32 characters, preferably 64). E.g., `openssl rand -hex 32`.
    2.  Update `JWT_SECRET_KEY` in the production environment.
    3.  Restart the backend server.
    4.  **Impact:** All current user sessions will be invalidated, and users will need to log in again. (To minimize impact, token versioning is used).

## 2. MongoDB Credentials
*   **Key:** `MONGO_URI`
*   **Purpose:** Connects to the primary database.
*   **Rotation:**
    1.  Create a new database user with required permissions in MongoDB Atlas (or local).
    2.  Update the connection string in `MONGO_URI` with the new credentials.
    3.  Restart the backend server.
    4.  Once the server is running stably, delete the old database user.

## 3. Groq API Key
*   **Key:** `GROQ_API_KEY`
*   **Purpose:** Used for fast LLM inference (e.g., invoice generation, chat).
*   **Rotation:**
    1.  Log in to the Groq Cloud Console.
    2.  Generate a new API Key.
    3.  Update the `GROQ_API_KEY` environment variable in production.
    4.  Restart the backend server.
    5.  Revoke/delete the old key in the Groq console.

## 4. Twilio Credentials (WhatsApp Agent)
*   **Keys:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
*   **Purpose:** Sending WhatsApp messages.
*   **Rotation:**
    1.  Log in to the Twilio Console.
    2.  In the Auth Tokens section, request a Secondary Auth Token (this allows zero-downtime rotation).
    3.  Update the `TWILIO_AUTH_TOKEN` in the production environment to the new secondary token.
    4.  Restart the backend server.
    5.  Promote the secondary token to primary in the Twilio Console, and delete the old token.

## Important Note
**NEVER commit the `.env` file to version control.** If a secret is accidentally committed, it must be considered compromised and rotated immediately using the steps above.
