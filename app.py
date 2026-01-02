from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_socketio import SocketIO, emit, join_room
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
import os
from functools import wraps

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-in-production'
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host='localhost',
            database='leave_management',
            user='root',
            password='Rajesh@857'  # Change this to your MySQL password
        )
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

# Login required decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Manager required decorator
def manager_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT role FROM users WHERE id = %s", (session['user_id'],))
        user = cursor.fetchone()
        cursor.close()
        connection.close()
        
        if not user or user.get('role') != 'manager':
            return jsonify({'error': 'Unauthorized'}), 403
        return f(*args, **kwargs)
    return decorated_function

# Routes
@app.route('/')
def index():
    if 'user_id' in session:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT role FROM users WHERE id = %s", (session['user_id'],))
        user = cursor.fetchone()
        cursor.close()
        connection.close()
        
        if user and user.get('role') == 'manager':
            return redirect(url_for('manager_dashboard'))
        return redirect(url_for('employee_dashboard'))
    return redirect(url_for('login'))

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
    user = cursor.fetchone()
    cursor.close()
    connection.close()
    
    if user and check_password_hash(user['password'], password):
        session['user_id'] = str(user['id'])
        session['user_name'] = user['name']
        session['user_role'] = user['role']
        
        return jsonify({
            'success': True,
            'role': user['role'],
            'name': user['name']
        })
    
    return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.json
    
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT id FROM users WHERE email = %s", (data.get('email'),))
    existing_user = cursor.fetchone()
    
    if existing_user:
        cursor.close()
        connection.close()
        return jsonify({'success': False, 'message': 'Email already exists'}), 400
    
    query = """
        INSERT INTO users (name, email, password, role, department, vacation_balance, sick_balance, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """
    values = (
        data.get('name'),
        data.get('email'),
        generate_password_hash(data.get('password')),
        data.get('role', 'employee'),
        data.get('department', 'General'),
        20,
        10,
        datetime.now()
    )
    
    cursor.execute(query, values)
    connection.commit()
    user_id = cursor.lastrowid
    cursor.close()
    connection.close()
    
    return jsonify({
        'success': True,
        'message': 'Registration successful',
        'user_id': str(user_id)
    })

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/employee')
@login_required
def employee_dashboard():
    return render_template('employee_dashboard.html')

@app.route('/manager')
@login_required
@manager_required
def manager_dashboard():
    return render_template('manager_dashboard.html')

@app.route('/api/user/profile')
@login_required
def get_user_profile():
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT name, email, department, role, vacation_balance, sick_balance FROM users WHERE id = %s", 
                   (session['user_id'],))
    user = cursor.fetchone()
    cursor.close()
    connection.close()
    
    if user:
        return jsonify(user)
    return jsonify({'error': 'User not found'}), 404

@app.route('/api/managers/department')
@login_required
def get_department_managers():
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT department FROM users WHERE id = %s", (session['user_id'],))
    user = cursor.fetchone()
    
    if not user:
        cursor.close()
        connection.close()
        return jsonify({'error': 'User not found'}), 404
    
    user_department = user.get('department', 'General')
    
    # Find all managers in the same department
    cursor.execute("""
        SELECT id, name, department 
        FROM users 
        WHERE role = 'manager' AND department = %s
    """, (user_department,))
    managers = cursor.fetchall()
    cursor.close()
    connection.close()
    
    return jsonify(managers)

@app.route('/api/leaves/submit', methods=['POST'])
@login_required
def submit_leave():
    data = request.json
    
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT department FROM users WHERE id = %s", (session['user_id'],))
    user = cursor.fetchone()
    user_department = user.get('department', 'General')
    
    query = """
        INSERT INTO leaves (user_id, user_name, department, leave_type, start_date, end_date, 
                           reason, status, submitted_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    values = (
        session['user_id'],
        session['user_name'],
        user_department,
        data.get('leave_type'),
        data.get('start_date'),
        data.get('end_date'),
        data.get('reason'),
        'pending',
        datetime.now()
    )
    
    cursor.execute(query, values)
    connection.commit()
    leave_id = cursor.lastrowid
    
    notification_query = """
        INSERT INTO notifications (type, message, leave_id, department, created_at, is_read)
        VALUES (%s, %s, %s, %s, %s, %s)
    """
    notification_values = (
        'new_leave_request',
        f'{session["user_name"]} ({user_department}) submitted a new leave request',
        leave_id,
        user_department,
        datetime.now(),
        False
    )
    cursor.execute(notification_query, notification_values)
    connection.commit()
    
    cursor.close()
    connection.close()
    
    socketio.emit('new_leave_request', {
        'leave_id': str(leave_id),
        'user_name': session['user_name'],
        'department': user_department,
        'leave_type': data.get('leave_type'),
        'start_date': data.get('start_date'),
        'end_date': data.get('end_date')
    }, room=f'managers_{user_department}')
    
    return jsonify({
        'success': True,
        'message': 'Leave request submitted successfully',
        'leave_id': str(leave_id)
    })

@app.route('/api/leaves/my-requests')
@login_required
def get_my_requests():
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("""
        SELECT id, user_id, user_name, department, leave_type, start_date, end_date, 
               reason, status, submitted_at, manager_comment, approved_by, approved_at
        FROM leaves 
        WHERE user_id = %s 
        ORDER BY submitted_at DESC
    """, (session['user_id'],))
    leaves = cursor.fetchall()
    cursor.close()
    connection.close()
    
    # Convert datetime objects to ISO format strings
    for leave in leaves:
        if isinstance(leave.get('submitted_at'), datetime):
            leave['submitted_at'] = leave['submitted_at'].isoformat()
        if isinstance(leave.get('approved_at'), datetime):
            leave['approved_at'] = leave['approved_at'].isoformat()
        if isinstance(leave.get('start_date'), datetime):
            leave['start_date'] = leave['start_date'].strftime('%Y-%m-%d')
        if isinstance(leave.get('end_date'), datetime):
            leave['end_date'] = leave['end_date'].strftime('%Y-%m-%d')
        # Rename id to _id for frontend compatibility
        leave['_id'] = str(leave['id'])
    
    return jsonify(leaves)

@app.route('/api/leaves/pending')
@login_required
@manager_required
def get_pending_leaves():
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT department FROM users WHERE id = %s", (session['user_id'],))
    manager = cursor.fetchone()
    manager_department = manager.get('department', 'General')
    
    cursor.execute("""
        SELECT id, user_id, user_name, department, leave_type, start_date, end_date, 
               reason, status, submitted_at, manager_comment
        FROM leaves 
        WHERE status = 'pending' AND department = %s 
        ORDER BY submitted_at DESC
    """, (manager_department,))
    leaves = cursor.fetchall()
    cursor.close()
    connection.close()
    
    # Convert datetime objects to ISO format strings
    for leave in leaves:
        if isinstance(leave.get('submitted_at'), datetime):
            leave['submitted_at'] = leave['submitted_at'].isoformat()
        if isinstance(leave.get('start_date'), datetime):
            leave['start_date'] = leave['start_date'].strftime('%Y-%m-%d')
        if isinstance(leave.get('end_date'), datetime):
            leave['end_date'] = leave['end_date'].strftime('%Y-%m-%d')
        leave['_id'] = str(leave['id'])
    
    return jsonify(leaves)

@app.route('/api/leaves/all')
@login_required
@manager_required
def get_all_leaves():
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT department FROM users WHERE id = %s", (session['user_id'],))
    manager = cursor.fetchone()
    manager_department = manager.get('department', 'General')
    
    cursor.execute("""
        SELECT id, user_id, user_name, department, leave_type, start_date, end_date, 
               reason, status, submitted_at, manager_comment, approved_by, approved_at
        FROM leaves 
        WHERE department = %s 
        ORDER BY submitted_at DESC
    """, (manager_department,))
    leaves = cursor.fetchall()
    cursor.close()
    connection.close()
    
    # Convert datetime objects to ISO format strings
    for leave in leaves:
        if isinstance(leave.get('submitted_at'), datetime):
            leave['submitted_at'] = leave['submitted_at'].isoformat()
        if isinstance(leave.get('approved_at'), datetime):
            leave['approved_at'] = leave['approved_at'].isoformat()
        if isinstance(leave.get('start_date'), datetime):
            leave['start_date'] = leave['start_date'].strftime('%Y-%m-%d')
        if isinstance(leave.get('end_date'), datetime):
            leave['end_date'] = leave['end_date'].strftime('%Y-%m-%d')
        leave['_id'] = str(leave['id'])
    
    return jsonify(leaves)

@app.route('/api/leaves/<leave_id>/approve', methods=['POST'])
@login_required
@manager_required
def approve_leave(leave_id):
    data = request.json
    comment = data.get('comment', '')
    
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    
    # Get leave details
    cursor.execute("""
        SELECT user_id, leave_type, start_date, end_date 
        FROM leaves 
        WHERE id = %s
    """, (leave_id,))
    leave = cursor.fetchone()
    
    if leave:
        # Update leave status
        cursor.execute("""
            UPDATE leaves 
            SET status = 'approved', 
                manager_comment = %s, 
                approved_by = %s, 
                approved_at = %s
            WHERE id = %s
        """, (comment, session['user_name'], datetime.now(), leave_id))
        connection.commit()
        
        # Update user leave balance
        leave_type = leave['leave_type']
        start_date = leave['start_date']
        end_date = leave['end_date']
        days = (end_date - start_date).days + 1
        
        if leave_type == 'vacation':
            cursor.execute("""
                UPDATE users 
                SET vacation_balance = vacation_balance - %s 
                WHERE id = %s
            """, (days, leave['user_id']))
        elif leave_type == 'sick':
            cursor.execute("""
                UPDATE users 
                SET sick_balance = sick_balance - %s 
                WHERE id = %s
            """, (days, leave['user_id']))
        
        connection.commit()
        cursor.close()
        connection.close()
        
        # Emit real-time notification to employee
        socketio.emit('leave_status_update', {
            'leave_id': leave_id,
            'status': 'approved',
            'comment': comment
        }, room=str(leave['user_id']))
        
        return jsonify({'success': True, 'message': 'Leave approved'})
    
    cursor.close()
    connection.close()
    return jsonify({'error': 'Leave not found'}), 404

@app.route('/api/leaves/<leave_id>/reject', methods=['POST'])
@login_required
@manager_required
def reject_leave(leave_id):
    data = request.json
    comment = data.get('comment', '')
    
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    
    cursor.execute("""
        SELECT user_id FROM leaves WHERE id = %s
    """, (leave_id,))
    leave = cursor.fetchone()
    
    if leave:
        cursor.execute("""
            UPDATE leaves 
            SET status = 'rejected', 
                manager_comment = %s, 
                approved_by = %s, 
                approved_at = %s
            WHERE id = %s
        """, (comment, session['user_name'], datetime.now(), leave_id))
        connection.commit()
        cursor.close()
        connection.close()
        
        # Emit real-time notification to employee
        socketio.emit('leave_status_update', {
            'leave_id': leave_id,
            'status': 'rejected',
            'comment': comment
        }, room=str(leave['user_id']))
        
        return jsonify({'success': True, 'message': 'Leave rejected'})
    
    cursor.close()
    connection.close()
    return jsonify({'error': 'Leave not found'}), 404

@app.route('/api/calendar/leaves')
@login_required
def get_calendar_leaves():
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT department FROM users WHERE id = %s", (session['user_id'],))
    user = cursor.fetchone()
    user_department = user.get('department', 'General')
    
    cursor.execute("""
        SELECT id, user_name, leave_type, start_date, end_date 
        FROM leaves 
        WHERE status = 'approved' AND department = %s
    """, (user_department,))
    leaves = cursor.fetchall()
    cursor.close()
    connection.close()
    
    calendar_events = []
    for leave in leaves:
        calendar_events.append({
            'id': str(leave['id']),
            'title': f"{leave['user_name']} - {leave['leave_type'].title()}",
            'start': leave['start_date'].strftime('%Y-%m-%d') if isinstance(leave['start_date'], datetime) else leave['start_date'],
            'end': leave['end_date'].strftime('%Y-%m-%d') if isinstance(leave['end_date'], datetime) else leave['end_date'],
            'type': leave['leave_type']
        })
    
    return jsonify(calendar_events)

# Socket.IO events
@socketio.on('connect')
def handle_connect():
    if 'user_id' in session:
        join_room(session['user_id'])
        
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT role, department FROM users WHERE id = %s", (session['user_id'],))
        user = cursor.fetchone()
        cursor.close()
        connection.close()
        
        if user and user.get('role') == 'manager':
            join_room('managers')
            department = user.get('department', 'General')
            join_room(f'managers_{department}')
        
        emit('connected', {'message': 'Connected to real-time updates'})

@socketio.on('disconnect')
def handle_disconnect():
    pass

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000)
