# ♟️ Chess Master AI

A full-stack chess coaching chatbot web app with secure authentication, saved chat history, profile management, and shareable conversations. The project is organized into a clean `frontend/` and `backend/` structure so it’s easy to maintain and extend.

## ✨ Highlights

- **AI-powered chess conversations** with a polished chat interface
- **User authentication** using PHP + PDO + MySQL
- **Persistent chat history** with session-based conversation management
- **Profile photo uploads** with fallback avatars and responsive UI updates
- **Rename, delete, and share** conversation controls
- **Public shared conversation page** for read-only access via token links
- **Modern, responsive theme** with a refined blue/cyan chess-inspired design
- **Simple root redirect** so the app opens cleanly from the repository root

## 🏗️ Project Structure

```text
chesschatbot/
├── index.html                 # Root redirect to the frontend app
├── README.md                  # Project documentation
├── .gitignore                 # Ignore runtime uploads and editor files
├── uploads/                   # Uploaded profile images
├── frontend/
│   ├── index.html             # Main chat UI
│   ├── login.html             # Sign in page
│   ├── signup.html            # Account creation page
│   ├── shared_chat.html       # Public share viewer
│   ├── script.js              # Frontend logic and API calls
│   └── style.css              # Visual theme and layout
└── backend/
    ├── setup.sql              # Database schema and migration script
    └── api/
        ├── db.php             # PDO database connection
        ├── login.php          # Authentication endpoint
        ├── signup.php         # Registration endpoint
        ├── logout.php         # Session cleanup endpoint
        ├── get_chats.php      # Load saved conversations
        ├── save_chat.php      # Save user/bot messages
        ├── rename_chat.php    # Rename a conversation
        ├── delete_chat.php    # Permanently delete a conversation
        ├── share_chat.php     # Generate share link/token
        ├── get_shared_chat.php
        │                       # Fetch shared conversation content
        ├── profile.php        # Fetch/update profile details and photo
        └── chat_session_helpers.php
```

## 🚀 Features in Detail

### Chat Experience
- Start a new conversation instantly
- Send messages with real-time UI updates
- Load previous chats and resume where you left off
- View role-based chat bubbles for user and bot responses

### Profile Management
- Update your display name
- Upload a profile photo in `PNG`, `JPG`, or `WebP`
- Preview the selected image before saving
- Keep a fallback avatar if no image is present

### Conversation Controls
- **Rename** a conversation title
- **Delete** a conversation permanently
- **Share** a conversation to generate a public link
- **Open shared links** in a clean read-only page

## 🛠️ Local Setup

### 1. Install prerequisites
- XAMPP (Apache + MySQL + PHP)
- A browser such as Chrome or Edge

### 2. Create the database
Run the schema in `backend/setup.sql` using phpMyAdmin or MySQL CLI.

Example:

```bash
mysql -uroot -p < backend/setup.sql
```

### 3. Start Apache and MySQL
Open **XAMPP Control Panel** and start:
- Apache
- MySQL

### 4. Place the project in your web root
If your XAMPP document root is `C:/xampp/htdocs`, place the project there as:

```text
C:/xampp/htdocs/chesschatbot
```

### 5. Open the app
Use this URL in your browser:

```text
http://localhost/chesschatbot
```

## 🔐 Authentication Notes

The app uses session-based authentication with a PHP PDO connection defined in `backend/api/db.php`.

Default local database credentials are:

- **Host:** `localhost`
- **Database:** `chess_bot_db`
- **User:** `root`
- **Password:** empty string (`''`)

## 📦 Deployment Notes

- Ensure your web server has write access to `uploads/`
- Configure your PHP environment to allow file uploads
- Keep your database credentials secure before deploying publicly

## 🧪 Recommended Validation

After setup, verify these flows manually:

1. Sign up and log in
2. Create a new conversation
3. Update your profile picture
4. Rename and delete a chat session
5. Share a conversation and open the generated link

## 📚 Developer Notes

This app is intentionally separated into:

- **Frontend:** `frontend/` for HTML, CSS, and JavaScript
- **Backend:** `backend/api/` for PHP endpoints and database access
- **Database:** `backend/setup.sql` for schema and migration control

If you want, you can later expand this project with:

- OpenAI or local LLM integration
- Conversation export/import
- Dark/light theme toggling
- Admin analytics for chat usage

## 🙌 Credits

Built for the Chess Master AI project with a focus on a clean UI, practical functionality, and maintainable folder structure.
