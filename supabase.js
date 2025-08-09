import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ptqqbmfftalcoeimpoxc.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0cXFibWZmdGFsY29laW1wb3hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3MTg0OTQsImV4cCI6MjA3MDI5NDQ5NH0.f7BKdyGLYDBJ2yIIAud0ECgLS4quwx2KIx0TtWH8v4g'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database schema:
// users: id, email, role (admin/user), created_at
// mood_entries: id, user_id, date, color, created_at
// user_sessions: id, user_id, session_token, expires_at
