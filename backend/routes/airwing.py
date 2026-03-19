from flask import Blueprint, render_template, request, jsonify, flash, redirect, url_for
from flask_login import login_required, current_user
from datetime import datetime
from models import Student, Attendance, AirWing
from config import db

airwing_bp = Blueprint("airwing_bp", __name__, url_prefix="/airwing")

@airwing_bp.route("/dashboard")
@login_required
def dashboard():
    if current_user.role.lower() != "airwing":
        flash("Unauthorized. Must be AirWing personnel to access.", "danger")
        return redirect(url_for("auth_bp.login"))

    airwing_profile = AirWing.query.get(current_user.airwing_id_fk)
    if not airwing_profile:
        flash("AirWing profile not linked correctly.", "danger")
        return redirect(url_for("auth_bp.login"))

    assigned_floor = airwing_profile.assigned_floor
    current_datetime = datetime.now()
    date_str = current_datetime.strftime("%d-%m-%Y")
    time_str = current_datetime.strftime("%H:%M")

    # Fetch students on the assigned floor, ordered ascending by room number
    students = Student.query.filter_by(floor_number=assigned_floor).order_by(Student.room_number.asc()).all()

    # Get recent attendance history mapping specifically for this floor, max 20 entries
    recent_sessions_raw = db.session.query(Attendance.marked_at).filter_by(floor_number=assigned_floor).distinct().order_by(Attendance.marked_at.desc()).limit(20).all()
    recent_sessions = []
    for s in recent_sessions_raw:
        marked_str = s.marked_at.strftime("%d-%m-%Y %I:%M %p")
        recent_sessions.append(marked_str)

    return render_template(
        "airwing_dashboard.html",
        airwing=airwing_profile,
        students=students,
        current_date=date_str,
        current_time=time_str,
        assigned_floor=assigned_floor,
        recent_sessions=recent_sessions
    )

@airwing_bp.route("/mark_attendance", methods=["POST"])
@login_required
def mark_attendance():
    if current_user.role.lower() != "airwing":
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    airwing_profile = AirWing.query.get(current_user.airwing_id_fk)
    if not airwing_profile:
        return jsonify({"success": False, "message": "AirWing profile error."}), 400

    assigned_floor = airwing_profile.assigned_floor
    
    # AirWing overrides: Always use current actual server time and the airwing's fixed floor
    marked_at = datetime.now()
    
    saved_records = []
    absent_students = []

    for key, value in request.form.items():
        if key.startswith("status_"):
            student_db_id = key.split("_")[1]
            student = Student.query.get(student_db_id)
            if student and student.floor_number == assigned_floor: # Ensure they can only mark their own floor
                new_record = Attendance(
                    student_id=student.id,
                    room_number=student.room_number,
                    floor_number=student.floor_number,
                    marked_at=marked_at,
                    status=value
                )
                db.session.add(new_record)
                saved_records.append(new_record)
                
                from utils import send_push_notification
                if student.user:
                    send_push_notification(student.user, "Attendance Update", f"You have been marked {value.upper()} for {marked_at.strftime('%Y-%m-%d %H:%M')}.", url="/student/dashboard#attendance")
                    
                if value == "Absent" and student.student_email:
                    absent_students.append((student.student_email, student.student_name))

    db.session.commit()
    saved_count = len(saved_records)

    from routes.admin import send_absent_notification
    for email, name in absent_students:
        send_absent_notification(email, name, marked_at)

    return jsonify({
        "success": True,
        "message": f"Attendance successfully saved for {saved_count} students on Floor {assigned_floor} at {marked_at.strftime('%d-%m-%Y %I:%M %p')}."
    })
