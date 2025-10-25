# Canvas Student Analytics Dashboard

A web application for Canvas LMS instructors to quickly view missing, late, and on-time assignments for all students in their courses.

## Features

- 📊 View all students' analytics in one place (no clicking through individual pages!)
- 🎯 See missing, late, and on-time assignment counts at a glance
- 📈 Course-level statistics showing totals across all students
- 🔄 Sortable columns to quickly identify students who need help
- ⚡ Fast loading - fetches all data at once via Canvas API

## Prerequisites

- Node.js (v14 or higher)
- A Canvas LMS account with instructor access
- Canvas API access token

## Setup

### 1. Get Your Canvas API Token

1. Log into Canvas
2. Click on **Account** → **Settings**
3. Scroll down to **Approved Integrations**
4. Click **+ New Access Token**
5. Enter a purpose (e.g., "Analytics Dashboard")
6. Click **Generate Token**
7. **Copy the token** (you won't see it again!)

### 2. Install Dependencies

```bash
cd canvas-analytics
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your Canvas information:

```env
CANVAS_BASE_URL=https://your-school.instructure.com
CANVAS_API_TOKEN=your_api_token_here
PORT=3000
```

**Important:** Replace `your-school.instructure.com` with your actual Canvas URL.

### 4. Run the Application

```bash
npm start
```

Or for development with auto-restart:

```bash
npm run dev
```

The application will be available at: `http://localhost:3000`

## Usage

1. Open the application in your web browser
2. Select a course from the dropdown
3. Wait for the data to load (may take a few seconds for large courses)
4. View the statistics and student table
5. Click column headers to sort by that column

## How It Works

The application uses the Canvas API to:

1. Fetch all courses where you're listed as an instructor
2. For each course, retrieve:
   - All enrolled students
   - All assignments with due dates
   - Each student's submission status
3. Calculate for each student:
   - **Missing**: Assignments past due date with no submission
   - **Late**: Assignments submitted after the due date
   - **On Time**: Assignments submitted before the due date

## Security Notes

⚠️ **Important Security Information:**

- Your API token is stored in the `.env` file and should **never** be committed to version control
- The `.env` file is listed in `.gitignore` to prevent accidental commits
- Keep your API token secure - it has the same access level as your Canvas account
- Only share this application with trusted users
- Consider using Canvas OAuth for production deployments with multiple users

## Deployment

### Option 1: Deploy to Your Own Server

1. Copy all files to your server
2. Set up environment variables on the server
3. Install dependencies: `npm install`
4. Run with a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start server.js --name canvas-analytics
   ```

### Option 2: Deploy to Heroku

1. Create a Heroku account
2. Install Heroku CLI
3. Deploy:
   ```bash
   heroku create your-app-name
   heroku config:set CANVAS_BASE_URL=your_url
   heroku config:set CANVAS_API_TOKEN=your_token
   git push heroku main
   ```

### Option 3: Deploy to Vercel/Railway/Render

These platforms support Node.js apps. Follow their documentation and set environment variables in their dashboard.

## Troubleshooting

### "Failed to fetch courses"
- Check that your Canvas URL is correct
- Verify your API token is valid
- Ensure you have instructor access to at least one course

### "No students found"
- Verify the course has active student enrollments
- Check that you're an instructor in the course

### Slow loading
- Large courses with many students/assignments may take 10-30 seconds
- This is normal - Canvas API requires multiple requests per student

## API Rate Limits

Canvas has API rate limits (typically 3000 requests per hour). For courses with many students:
- ~50 students = ~150 API requests
- ~100 students = ~300 API requests

If you hit rate limits, wait an hour or contact Canvas support to increase your limits.

## License

MIT

## Support

For issues with Canvas API or access tokens, contact your Canvas administrator or Canvas support.
