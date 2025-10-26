require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - required for Render and other hosted platforms
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// Serve login page (public - no auth required)
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve main page (requires auth)
app.get('/', (req, res) => {
  if (!req.session.authenticated) {
    return res.redirect('/login.html');
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve static files for authenticated users
app.use(express.static('public'));

// Login credentials from environment variables
const MASTER_PASSWORD = process.env.MASTER_PASSWORD || 'changeThisPassword123';

// Middleware to check if user is authenticated
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
}

// Login endpoint
app.post('/api/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    // console.log('Login attempt:', { email: email || 'undefined', hasPassword: !!password });
    
    // Check if email ends with @anniecannons.com
    if (!email || !email.endsWith('@anniecannons.com')) {
      console.log('Invalid email domain');
      return res.status(401).json({ error: 'Invalid email. Must be an @anniecannons.com email address.' });
    }
    
    // Check password
    if (password !== MASTER_PASSWORD) {
      console.log('Invalid password');
      return res.status(401).json({ error: 'Invalid password.' });
    }
    
    // Set session
    req.session.authenticated = true;
    req.session.email = email;
    
    // console.log('Login successful for:', email);
    res.json({ success: true, email });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ error: 'Failed to logout' });
      }
      res.json({ success: true });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Server error during logout' });
  }
});

// Check auth status
app.get('/api/auth/status', (req, res) => {
  try {
    res.json({ 
      authenticated: !!req.session.authenticated,
      email: req.session.email || null
    });
  } catch (error) {
    console.error('Auth status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Canvas API configuration
const CANVAS_BASE_URL = process.env.CANVAS_BASE_URL;
const CANVAS_API_TOKEN = process.env.CANVAS_API_TOKEN;

// Axios instance for Canvas API
const canvasAPI = axios.create({
  baseURL: `${CANVAS_BASE_URL}/api/v1`,
  headers: {
    'Authorization': `Bearer ${CANVAS_API_TOKEN}`
  }
});

// Helper function to get all pages of results (Canvas uses pagination)
async function getAllPages(url, params = {}) {
  let allResults = [];
  let nextUrl = url;
  
  while (nextUrl) {
    const response = await canvasAPI.get(nextUrl, { params });
    allResults = allResults.concat(response.data);
    
    // Check for pagination link in headers
    const linkHeader = response.headers.link;
    if (linkHeader) {
      const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      if (nextMatch) {
        // Extract just the path from the full URL
        nextUrl = nextMatch[1].replace(CANVAS_BASE_URL + '/api/v1', '');
        params = {}; // Params are already in the URL
      } else {
        nextUrl = null;
      }
    } else {
      nextUrl = null;
    }
  }
  
  return allResults;
}

// Get all courses for the instructor
app.get('/api/courses', requireAuth, async (req, res) => {
  try {
    const courses = await getAllPages('/courses', {
      enrollment_type: 'teacher',
      enrollment_state: 'active',
      include: ['total_students'],
      per_page: 100
    });
    
    // Filter and format courses
    const formattedCourses = courses
      .filter(course => course.name && !course.access_restricted_by_date)
      .map(course => ({
        id: course.id,
        name: course.name,
        course_code: course.course_code,
        total_students: course.total_students || 0
      }));
    
    res.json(formattedCourses);
  } catch (error) {
    console.error('Error fetching courses:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Get all students in a course with their analytics
app.get('/api/courses/:courseId/analytics', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Get all students in the course
    const students = await getAllPages(`/courses/${courseId}/users`, {
      enrollment_type: ['student'],
      enrollment_state: ['active'],
      per_page: 100
    });
    
    // Get all assignments for the course
    const assignments = await getAllPages(`/courses/${courseId}/assignments`, {
      per_page: 100
    });
    
    const now = new Date();
    
    // For each student, get their submission data
    const studentAnalytics = await Promise.all(
      students.map(async (student) => {
        try {
          // Get all submissions for this student - INCLUDE SUBMISSION_COMMENTS
          const submissions = await getAllPages(
            `/courses/${courseId}/students/submissions`,
            {
              student_ids: [student.id],
              include: ['submission_comments'],
              per_page: 100
            }
          );
          
          let missing = 0;
          let late = 0;
          let onTime = 0;
          let incomplete = 0;
          
          const now = new Date();
          
          // Track details for each category
          const missingList = [];
          const lateList = [];
          const incompleteList = [];
          
          // Only look at assignments that this student has a submission for
          submissions.forEach(submission => {
            const assignment = assignments.find(a => a.id === submission.assignment_id);
            
            // Skip if we can't find the assignment
            if (!assignment) {
              return;
            }
            
            // Check for due date - first check assignment override in submission, then fall back to assignment due date
            const dueDate = submission.cached_due_date || assignment.due_at;
            
            // Skip assignments without due dates (and no override)
            if (!dueDate) {
              return;
            }
            
            // Skip assignments that don't require submission
            if (assignment.submission_types.includes('none') || 
                assignment.submission_types.includes('not_graded') ||
                assignment.submission_types.includes('on_paper')) {
              return;
            }
            
            const dueDateObj = new Date(dueDate);
            const isPastDue = dueDateObj < now;
            
            // Check if marked as incomplete (Canvas uses workflow_state)
            if (submission.workflow_state === 'pending_review' || 
                (submission.grade === 'incomplete' || submission.entered_grade === 'incomplete')) {
              incomplete++;
              incompleteList.push({
                name: assignment.name,
                dueDate: dueDate,
                submittedAt: submission.submitted_at,
                comments: submission.submission_comments || [],
                assignmentId: assignment.id,
                submissionId: submission.id
              });
            }
            // Use Canvas's built-in flags, but also check for past due with no submission
            else if (submission.missing) {
              missing++;
              missingList.push({
                name: assignment.name,
                dueDate: dueDate,
                comments: submission.submission_comments || [],
                assignmentId: assignment.id,
                submissionId: submission.id
              });
            } else if (submission.late) {
              late++;
              lateList.push({
                name: assignment.name,
                dueDate: dueDate,
                submittedAt: submission.submitted_at,
                comments: submission.submission_comments || [],
                assignmentId: assignment.id,
                submissionId: submission.id
              });
            } else if (!submission.submitted_at && isPastDue && submission.workflow_state === 'unsubmitted') {
              // Past due, no submission, but Canvas didn't flag it as missing
              missing++;
              missingList.push({
                name: assignment.name,
                dueDate: dueDate,
                comments: submission.submission_comments || [],
                assignmentId: assignment.id,
                submissionId: submission.id
              });
            } else if (submission.submitted_at && !submission.missing && !submission.late) {
              // Has a submission and it's not late or missing
              onTime++;
            }
          });
          
          return {
            id: student.id,
            name: student.name,
            sortable_name: student.sortable_name,
            missing,
            late,
            onTime,
            incomplete,
            total: missing + late + onTime + incomplete,
            missingList,
            lateList,
            incompleteList
          };
        } catch (error) {
          console.error(`Error processing student ${student.id}:`, error.message);
          return {
            id: student.id,
            name: student.name,
            sortable_name: student.sortable_name,
            missing: 0,
            late: 0,
            onTime: 0,
            total: 0,
            error: true
          };
        }
      })
    );
    
    res.json(studentAnalytics);
  } catch (error) {
    console.error('Error fetching analytics:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch student analytics' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Canvas Analytics Dashboard running on http://localhost:${PORT}`);
});