# Canvas Analytics Dashboard

A secure analytics dashboard for Canvas LMS that tracks student assignment completion.

## Features

- 🔐 Secure login with @anniecannons.com email validation
- 📊 View missing, late, and incomplete assignments across all students
- 💬 View submission comments from Canvas
- 📈 Summary statistics for the entire course
- 🔍 Sortable student table

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and add your values:

```env
# Canvas API Configuration
CANVAS_BASE_URL=https://your-canvas-instance.instructure.com
CANVAS_API_TOKEN=your_canvas_api_token_here

# Authentication
MASTER_PASSWORD=YourSecurePasswordHere123!
SESSION_SECRET=a-long-random-string-for-sessions

# Server Configuration
PORT=3000
NODE_ENV=development
```

**Important:**
- `CANVAS_BASE_URL` - Your Canvas instance URL (no trailing slash)
- `CANVAS_API_TOKEN` - Your Canvas API token (generate in Canvas under Account → Settings → New Access Token)
- `MASTER_PASSWORD` - The password all users will use to login
- `SESSION_SECRET` - A random string for securing sessions (at least 32 characters recommended)

### 3. Run the Server

Development mode (with auto-restart):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

### 4. Access the Dashboard

Open your browser to: `http://localhost:3000`

## Login

- **Email:** Any email ending in `@anniecannons.com`
- **Password:** The `MASTER_PASSWORD` you set in your `.env` file

Examples:
- `catie@anniecannons.com`
- `instructor@anniecannons.com`
- `admin@anniecannons.com`

## Deployment

When deploying to production (Render, Heroku, etc.):

1. Set all environment variables in your hosting platform
2. Make sure to set `NODE_ENV=production`
3. Use a strong, random `SESSION_SECRET`
4. Use HTTPS (most platforms provide this automatically)

## Security Notes

- Sessions last for 24 hours
- All API endpoints require authentication
- Login attempts with invalid emails or passwords are rejected
- In production, sessions use secure cookies (HTTPS only)