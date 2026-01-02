import mysql.connector
from mysql.connector import Error
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta

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

print("Seeding database...")

connection = get_db_connection()
if not connection:
    print("Failed to connect to MySQL")
    exit(1)

cursor = connection.cursor()

cursor.execute("DELETE FROM notifications")
cursor.execute("DELETE FROM leaves")
cursor.execute("DELETE FROM users")
connection.commit()

print("Cleared existing data")

users = [
    ('John Manager', 'manager@company.com', generate_password_hash('manager123'), 'manager', 'Engineering', 25, 15, datetime.now()),
    ('Lisa Marketing Manager', 'lisa@company.com', generate_password_hash('manager123'), 'manager', 'Marketing', 25, 15, datetime.now()),
    ('Robert Sales Manager', 'robert@company.com', generate_password_hash('manager123'), 'manager', 'Sales', 25, 15, datetime.now()),
    ('Sarah Smith', 'sarah@company.com', generate_password_hash('employee123'), 'employee', 'Engineering', 18, 8, datetime.now()),
    ('Mike Johnson', 'mike@company.com', generate_password_hash('employee123'), 'employee', 'Marketing', 20, 10, datetime.now()),
    ('Emily Davis', 'emily@company.com', generate_password_hash('employee123'), 'employee', 'Sales', 15, 7, datetime.now())
]

user_query = """
    INSERT INTO users (name, email, password, role, department, vacation_balance, sick_balance, created_at)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
"""

user_ids = []
for user in users:
    cursor.execute(user_query, user)
    connection.commit()
    user_ids.append(cursor.lastrowid)

print(f"Created {len(user_ids)} users")

leaves = [
    (user_ids[3], 'Sarah Smith', 'Engineering', 'vacation', 
     (datetime.now() + timedelta(days=10)).strftime('%Y-%m-%d'),
     (datetime.now() + timedelta(days=14)).strftime('%Y-%m-%d'),
     'Family vacation to Hawaii', 'pending', datetime.now(), None, None, None),
    
    (user_ids[4], 'Mike Johnson', 'Marketing', 'sick',
     (datetime.now() - timedelta(days=2)).strftime('%Y-%m-%d'),
     (datetime.now() - timedelta(days=2)).strftime('%Y-%m-%d'),
     'Medical appointment', 'approved', datetime.now() - timedelta(days=3),
     'Approved. Get well soon!', 'Lisa Marketing Manager', datetime.now() - timedelta(days=2)),
    
    (user_ids[5], 'Emily Davis', 'Sales', 'vacation',
     (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d'),
     (datetime.now() + timedelta(days=35)).strftime('%Y-%m-%d'),
     'Summer holiday', 'pending', datetime.now(), None, None, None)
]

leave_query = """
    INSERT INTO leaves (user_id, user_name, department, leave_type, start_date, end_date, 
                       reason, status, submitted_at, manager_comment, approved_by, approved_at)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
"""

for leave in leaves:
    cursor.execute(leave_query, leave)
    connection.commit()

print(f"Created {len(leaves)} leave requests")

cursor.close()
connection.close()

print("\nTest Accounts:")
print("Engineering Manager: manager@company.com / manager123")
print("Marketing Manager: lisa@company.com / manager123")
print("Sales Manager: robert@company.com / manager123")
print("Engineering Employee: sarah@company.com / employee123")
print("Marketing Employee: mike@company.com / employee123")
print("Sales Employee: emily@company.com / employee123")
print("\nDatabase seeding completed!")
