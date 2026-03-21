from config import db
from datetime import datetime

from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin




class Admin(db.Model):
    __tablename__ = "admin"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(160), unique=True, nullable=False)
    contact = db.Column(db.String(20), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

# --- Student ---
class Student(db.Model):
    __tablename__ = "students"
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(50), unique=True, nullable=False)
    student_name = db.Column(db.String(120), nullable=False)
    room_number = db.Column(db.String(20), nullable=False)
    floor_number = db.Column(db.String(20), nullable=False)
    student_contact = db.Column(db.String(20), nullable=False)
    student_email = db.Column(db.String(120),unique=True,nullable=False) 
    address = db.Column(db.Text, nullable=False)
    
    father_name = db.Column(db.String(120), nullable=False)
    mother_name = db.Column(db.String(120), nullable=False)
    parent_contact = db.Column(db.String(20), nullable=False)
    parent_email = db.Column(db.String(120), nullable=False)
    parent_address = db.Column(db.Text, nullable=True)

    guardian_name = db.Column(db.String(120), nullable=False)
    guardian_contact = db.Column(db.String(20), nullable=False)
    guardian_address = db.Column(db.Text, nullable=False)
    guardian_email = db.Column(db.String(120), nullable=False)

    # Relationships
    attendance_records = db.relationship("Attendance", backref="student", lazy=True)
    outpasses = db.relationship("Outpass", backref="student", lazy=True)
    leave_requests = db.relationship("LeaveRequest", backref="student", lazy=True)
    reports = db.relationship("Report", backref="student", lazy=True)
    user = db.relationship("User", backref="student", uselist=False)

# --- Attendance ---
class Attendance(db.Model):
    __tablename__ = "attendance"
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    room_number = db.Column(db.String(20), nullable=False)
    floor_number = db.Column(db.String(20), nullable=False)
    marked_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)  # session timestamp
    status = db.Column(db.Enum("Present", "Absent", name="attendance_status"), nullable=False)

# --- Outpass ---
class Outpass(db.Model):
    __tablename__ = "outpass"
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    room_number = db.Column(db.String(20), nullable=False)
    floor_number = db.Column(db.String(20), nullable=False)
    place = db.Column(db.String(200), nullable=False)
    reason = db.Column(db.Text, nullable=False)
    leave_time = db.Column(db.DateTime, nullable=False)
    return_time = db.Column(db.DateTime, nullable=False)
    approved_leave_time = db.Column(db.DateTime)
    approved_return_time = db.Column(db.DateTime)
    times_modified = db.Column(db.Boolean, default=False, nullable=False)
    status = db.Column(db.Enum("Pending", "Approved", "Rejected", name="outpass_status"), default="Pending", nullable=False)
    slip_generated_at = db.Column(db.DateTime, nullable=True)

# --- Leave Requests ---
class LeaveRequest(db.Model):
    __tablename__ = "leave_requests"
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    room_number = db.Column(db.String(20), nullable=False)
    floor_number = db.Column(db.String(20), nullable=False)
    reason = db.Column(db.Text, nullable=False)
    leave_date = db.Column(db.Date, nullable=False)
    return_date = db.Column(db.Date, nullable=False)
    approved_leave_date = db.Column(db.Date)
    approved_return_date = db.Column(db.Date)
    status = db.Column(db.Enum("Pending", "Approved", "Rejected", name="leave_status"), default="Pending", nullable=False)
    dates_modified = db.Column(db.Boolean, default=False) 

# --- Reports ---
class Report(db.Model):
    __tablename__ = "reports"
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    room_number = db.Column(db.String(20), nullable=False)
    floor_number = db.Column(db.String(20), nullable=False)
    issue = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text, nullable=True) 
    date_submitted = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.Enum("Pending", "Resolved", "Rejected", name="report_status"), default="Pending", nullable=False)

# --- Notices ---
class Notice(db.Model):
    __tablename__ = "notices"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    posted_on = db.Column(db.Date, nullable=False)
    expiry_date = db.Column(db.Date)

# --- AirWing ---
class AirWing(db.Model):
    __tablename__ = "airwing"
    id = db.Column(db.Integer, primary_key=True)
    airwing_id = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(120), nullable=False)
    assigned_floor = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(160), unique=True, nullable=False)
    phone = db.Column(db.String(20), nullable=False)

class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)   # register number
    email = db.Column(db.String(160), unique=True, nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum("Student", "Admin", "AirWing", name="user_role"), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=True)
    airwing_id_fk = db.Column(db.Integer, db.ForeignKey("airwing.id"), nullable=True)

    # Fields required for first-login and password reset flows
    is_first_login = db.Column(db.Boolean, default=True, nullable=False)
    reset_token = db.Column(db.String(255), nullable=True)
    reset_token_expiry = db.Column(db.DateTime, nullable=True)
    reset_otp = db.Column(db.String(6), nullable=True)
    reset_otp_expiry = db.Column(db.DateTime, nullable=True)

    def set_password(self, password: str):
        """Hash and store the password."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Verify a plaintext password against the stored hash."""
        return check_password_hash(self.password_hash, password)

class PushSubscription(db.Model):
    __tablename__ = "push_subscriptions"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    endpoint = db.Column(db.Text, nullable=False)
    p256dh = db.Column(db.String(255), nullable=False)
    auth = db.Column(db.String(255), nullable=False)

    user = db.relationship("User", backref=db.backref("push_subscriptions", lazy=True))
