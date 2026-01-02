# Employee Leave Management System

A professional leave management system built with Flask, MySQL, and real-time Socket.IO notifications.

## Features

- **User Authentication**: Secure login/registration for employees and managers
- **Leave Request Submission**: Employees can submit vacation, sick, and personal leave requests
- **Leave Approval Workflow**: Managers can review, approve, or reject leave requests
- **Leave Balance Tracking**: Automatic tracking of vacation and sick leave balances
- **Leave Calendar**: Visual calendar showing approved team leave schedules
- **Real-time Notifications**: Instant notifications using Socket.IO when:
  - Employees submit new leave requests (managers notified)
  - Managers approve/reject requests (employees notified)

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Flask (Python)
- **Database**: MySQL
- **Real-time**: Socket.IO

## Installation

1. **Install Python dependencies**:
```bash
pip install -r requirements.txt
```

2. **Install and setup MySQL**:
   - Download MySQL from https://dev.mysql.com/downloads/installer/
   - Start MySQL service
   - Create database:
     ```bash
     mysql -u root -p
     CREATE DATABASE leave_management;
     exit;
     ```

3. **Create database tables**:
```bash
mysql -u root -p leave_management < scripts/create_tables.sql
```

4. **Update database credentials**:
   - Open `app.py` and `seed_db.py`
   - Update MySQL password in the connection string

5. **Seed the database**:
```bash
python seed_db.py
```

6. **Run the application**:
```bash
python app.py
```

7. **Open your browser**:
   - Navigate to `http://localhost:5000`

## Demo Accounts

**Manager Account**:
- Email: manager@company.com
- Password: manager123

**Employee Accounts**:
- Email: sarah@company.com / Password: employee123
- Email: mike@company.com / Password: employee123
- Email: emily@company.com / Password: employee123

## Project Structure

```
├── app.py                      # Main Flask application
├── seed_db.py                  # Database seeding script
├── requirements.txt            # Python dependencies
├── scripts/
│   └── create_tables.sql      # MySQL database schema
├── static/
│   ├── css/
│   │   └── style.css          # Main stylesheet
│   └── js/
│       ├── login.js           # Login/registration logic
│       ├── employee.js        # Employee dashboard logic
│       └── manager.js         # Manager dashboard logic
└── templates/
    ├── login.html             # Login/registration page
    ├── employee_dashboard.html # Employee dashboard
    └── manager_dashboard.html  # Manager dashboard
```

## Usage

### For Employees:
1. Log in with your employee credentials
2. View your leave balances on the overview page
3. Submit a new leave request with dates and reason
4. View your request history and status
5. Check the team calendar to see when colleagues are on leave
6. Receive real-time notifications when your requests are approved/rejected

### For Managers:
1. Log in with your manager credentials
2. See all pending leave requests that need review
3. Click "Review" on any request to approve or reject it
4. Add comments when approving or rejecting requests
5. View all historical requests with filtering
6. Check the team calendar to manage workload
7. Receive real-time notifications when new requests are submitted

## Real-time Features

The system uses Socket.IO for real-time updates:
- Managers instantly see when employees submit new requests
- Employees instantly see when their requests are approved/rejected
- Notification badges update in real-time
- No page refresh needed to see updates

## Security Features

- Password hashing using Werkzeug security
- Session-based authentication
- Role-based access control (employee vs manager)
- Protected API endpoints

## Customization

To customize the system for your company:
1. Update the department list in `templates/login.html`
2. Modify leave balance defaults in `seed_db.py` and `app.py`
3. Add additional leave types in the leave request form
4. Customize the color scheme in `static/css/style.css`

## Production Deployment

For production use:
1. Change `SECRET_KEY` in `app.py` to a secure random string
2. Use environment variables for configuration
3. Set up proper MySQL user authentication and permissions
4. Use a production WSGI server like Gunicorn
5. Configure HTTPS with SSL certificates
6. Set up proper error logging
7. Configure automated MySQL backups

## License

This project is open source and available for educational and commercial use.
