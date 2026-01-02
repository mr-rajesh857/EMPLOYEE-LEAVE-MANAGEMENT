# Employee Leave Management System - Technical Documentation

## System Overview
The Employee Leave Management System is a web-based application built with Flask and MySQL that enables employees to submit leave requests and managers to approve or reject them with real-time notifications.

## Technology Stack

### Backend
- **Framework:** Flask 2.x (Python)
- **Real-time:** Flask-SocketIO with Socket.IO
- **Database:** MySQL 8.0+ (Relational Database)
- **Database Driver:** mysql-connector-python
- **Authentication:** Session-based with Werkzeug password hashing
- **CORS:** Flask-CORS for cross-origin requests

### Frontend
- **HTML5** with Jinja2 templating
- **CSS3** with custom styling
- **JavaScript** (Vanilla) with Socket.IO client
- **Real-time Updates:** WebSocket connections

### Database
- **MySQL Tables:**
  - `users` - Employee and manager accounts (with AUTO_INCREMENT primary key)
  - `leaves` - Leave request records (with foreign key to users)
  - `notifications` - System notifications (with foreign key to leaves)

## Architecture Patterns

### 1. MVC Pattern (Model-View-Controller)
- **Model:** MySQL tables (users, leaves, notifications) with foreign key relationships
- **View:** Jinja2 HTML templates
- **Controller:** Flask route handlers in app.py

### 2. Repository Pattern
- Database operations abstracted through mysql.connector
- Tables accessed via parameterized SQL queries to prevent SQL injection
- Connection pooling for efficient database access

### 3. Decorator Pattern
- `@login_required` - Protects routes requiring authentication
- `@manager_required` - Restricts access to manager-only routes

## Key Features

### 1. Authentication System
- Email/password login with hashed passwords
- Session management for user state
- Role-based access control (Employee/Manager)

### 2. Department-based Leave Management
- Employees submit requests to their department manager
- Managers only see requests from their department
- Department filtering for all queries

### 3. Leave Request Workflow
```
Employee → Submit Request → Pending State → Manager Reviews
                                ↓
                    Approved ← or → Rejected
                        ↓
                Balance Updated & Notifications Sent
```

### 4. Real-time Notifications
- Socket.IO WebSocket connections
- Managers join department-specific rooms: `managers_{department}`
- Employees join user-specific rooms: `{user_id}`
- Instant updates without page refresh

### 5. Leave Balance Management
- Automatic balance deduction on approval
- Separate tracking for vacation and sick leave
- Balance displayed in employee dashboard

### 6. Team Calendar
- View approved department leaves
- Filter by department automatically
- Visual representation of team availability

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/register` - New user registration
- `GET /logout` - User logout

### Employee Endpoints
- `GET /api/user/profile` - Get current user profile
- `POST /api/leaves/submit` - Submit new leave request
- `GET /api/leaves/my-requests` - Get user's leave history
- `GET /api/calendar/leaves` - Get department calendar

### Manager Endpoints
- `GET /api/leaves/pending` - Get pending department requests
- `GET /api/leaves/all` - Get all department leaves
- `POST /api/leaves/<id>/approve` - Approve leave request
- `POST /api/leaves/<id>/reject` - Reject leave request
- `GET /api/managers/department` - Get department managers

## Socket.IO Events

### Client → Server
- `connect` - Establish WebSocket connection

### Server → Client
- `connected` - Confirmation of connection
- `new_leave_request` - New request submitted (to managers)
- `leave_status_update` - Request approved/rejected (to employee)

## Database Schema

### users Table
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('employee', 'manager') NOT NULL,
    department VARCHAR(50) NOT NULL,
    vacation_balance INT DEFAULT 20,
    sick_balance INT DEFAULT 10,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_department (department)
);
```

### leaves Table
```sql
CREATE TABLE leaves (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    department VARCHAR(50) NOT NULL,
    leave_type ENUM('vacation', 'sick', 'other') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    manager_comment TEXT,
    approved_by VARCHAR(100),
    approved_at DATETIME,
    rejected_by VARCHAR(100),
    rejected_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_department (department),
    INDEX idx_status (status),
    INDEX idx_user_id (user_id)
);
```

### notifications Table
```sql
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    leave_id INT,
    department VARCHAR(50) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    `read` BOOLEAN DEFAULT 0,
    FOREIGN KEY (leave_id) REFERENCES leaves(id) ON DELETE CASCADE,
    INDEX idx_department (department)
);
```

## Security Measures

1. **Password Security:** Werkzeug password hashing (PBKDF2)
2. **Session Management:** Flask secure sessions with secret key
3. **SQL Injection Prevention:** Parameterized queries with mysql.connector
4. **Access Control:** Decorator-based route protection
5. **Department Isolation:** Queries filtered by department with prepared statements
6. **CORS Protection:** Configured allowed origins

## Deployment Instructions

### Prerequisites
- Python 3.8+
- MySQL 8.0+
- pip package manager

### Installation Steps
```bash
# Install dependencies
pip install -r requirements.txt

# Start MySQL and create database
mysql -u root -p
CREATE DATABASE leave_management;
exit;

# Create tables
mysql -u root -p leave_management < scripts/create_tables.sql

# Update MySQL password in app.py and seed_db.py

# Seed database (first time only)
python seed_db.py

# Run application
python app.py
```

### Default Accounts
**Engineering:**
- Manager: manager@company.com / manager123
- Employee: sarah@company.com / employee123

**Marketing:**
- Manager: lisa@company.com / manager123
- Employee: mike@company.com / employee123

**Sales:**
- Manager: robert@company.com / manager123
- Employee: emily@company.com / employee123

## Performance Considerations

1. **Database Indexing:**
   - INDEX on `users.email` for fast login queries
   - INDEX on `leaves.department` for filtering department requests
   - INDEX on `leaves.status` for pending queries
   - INDEX on `leaves.user_id` for user request history
   - Foreign key indexes automatically created

2. **Query Optimization:**
   - Parameterized queries prevent SQL injection and improve performance
   - Connection pooling reduces database connection overhead
   - SELECT only needed columns instead of SELECT *

3. **Real-time Optimization:**
   - Room-based Socket.IO broadcasting
   - Only relevant users receive notifications

## Future Enhancements

1. **Email Notifications:** Send email alerts for leave status changes
2. **Mobile App:** React Native mobile application
3. **Analytics Dashboard:** Leave trends and statistics with MySQL aggregation
4. **Integration:** Calendar sync (Google Calendar, Outlook)
5. **Advanced Features:** Recurring leave, half-day support, leave carry-forward
6. **Database Replication:** MySQL master-slave replication for high availability

## Maintenance

### Database Backup
```bash
mysqldump -u root -p leave_management > backup_$(date +%Y%m%d).sql
```

### Database Restore
```bash
mysql -u root -p leave_management < backup_20260102.sql
```

### Logs
- Application logs available in console output
- Consider adding file-based logging for production

### Monitoring
- Monitor MySQL connection health
- Track Socket.IO connection count
- Monitor API response times

---

**Version:** 1.0.0  
**Last Updated:** January 2026  
**Author:** Leave Management System Team
