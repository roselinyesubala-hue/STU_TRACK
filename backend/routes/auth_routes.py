# backend/routes/auth_routes.py

from datetime import datetime, timedelta
import secrets
from flask import Blueprint, render_template, request, redirect, url_for, session, flash, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
from flask_login import login_user, logout_user, login_required, current_user
from models import User, PushSubscription   # ✅ added PushSubscription
from config import db

auth_bp = Blueprint("auth_bp", __name__)

# -------------------------
# Token utilities
# -------------------------
def generate_reset_token():
    return secrets.token_urlsafe(32)

def set_reset_token(user, hours_valid=1):
    token = generate_reset_token()
    user.reset_token = token
    user.reset_token_expiry = datetime.utcnow() + timedelta(hours=hours_valid)
    db.session.commit()
    return token

def is_token_valid(user, token):
    if not user or not user.reset_token:
        return False
    if user.reset_token != token:
        return False
    if user.reset_token_expiry is None:
        return False
    return datetime.utcnow() <= user.reset_token_expiry


# -------------------------
# LOGIN
# -------------------------
@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        user = User.query.filter_by(username=username).first()

        if user and user.check_password(password):  # Use the model method
            login_user(user, remember=True)  # Use Flask-Login, not session
            session.permanent = True
            
            # Send login success notification
            from utils import send_push_notification
            send_push_notification(user, "Login Successful", f"Welcome back, {user.username}!", url="/admin/dashboard" if user.role.lower() == "admin" else "/student/dashboard")
            
            # First login → force password change
            if user.is_first_login:
                flash("Please change your password before continuing.", "warning")
                return redirect(url_for("auth_bp.change_password"))

            # Role‑based redirection
            if user.role.lower() == "admin":
                return redirect(url_for("admin.dashboard"))
            elif user.role.lower() == "student":
                return redirect(url_for("student.dashboard"))
            elif user.role.lower() == "airwing":
                return redirect(url_for("airwing_bp.dashboard"))
        else:
            flash("Invalid username or password.", "danger")
            return render_template("login.html")

    return render_template("login.html")


# -------------------------
# LOGOUT
# -------------------------
@auth_bp.route("/logout")
@login_required
def logout():
    user = current_user
    # Send logout notification before destroying session
    from utils import send_push_notification
    send_push_notification(user, "Logout Successful", f"You have been safely logged out, {user.username}.", url="/login")
    
    logout_user()
    flash("You have been logged out.", "info")
    return redirect(url_for("auth_bp.login"))


# -------------------------
# CHANGE PASSWORD (first login or manual)
# -------------------------
@auth_bp.route("/change_password", methods=["GET", "POST"])
@login_required
def change_password():
    if request.method == "POST":
        new_password = request.form.get("new_password")
        confirm_password = request.form.get("confirm_password")

        if new_password != confirm_password:
            flash("Passwords do not match", "danger")
            return redirect(url_for("auth_bp.change_password"))

        current_user.password_hash = generate_password_hash(new_password)
        current_user.is_first_login = False
        db.session.commit()

        flash("Password changed successfully!", "success")
        if current_user.role.lower() == "admin":
            return redirect(url_for("admin.dashboard", first_login="true"))
        elif current_user.role.lower() == "airwing":
            return redirect(url_for("airwing_bp.dashboard", first_login="true"))
        else:
            return redirect(url_for("student.dashboard", first_login="true"))

    return render_template("change_password.html")


# -------------------------
# FORGOT PASSWORD
# -------------------------
@auth_bp.route("/forgot_password", methods=["GET", "POST"])
def forgot_password():
    if request.method == "POST":
        identifier = request.form.get("identifier")
        user = User.query.filter((User.username == identifier) | (User.email == identifier)).first()
        if user:
            token = set_reset_token(user, hours_valid=1)
            reset_url = url_for("auth_bp.reset_password", token=token, _external=True)

            # Send email
            from flask_mail import Message
            from config import mail
            msg = Message("Password Reset Request", recipients=[user.email])
            msg.body = f"Click the link to reset your password:\n{reset_url}\n\nThis link expires in 1 hour."
            try:
                mail.send(msg)
                print(f"Email sent to {user.email}")
            except Exception as e:
                print(f"Failed to send email: {e}")

        flash("If an account with that identifier exists, a reset link has been sent.", "info")
        return redirect(url_for("auth_bp.login"))
    return render_template("forgot_password.html")


# -------------------------
# RESET PASSWORD
# -------------------------
@auth_bp.route("/reset_password/<token>", methods=["GET", "POST"])
def reset_password(token):
    user = User.query.filter_by(reset_token=token).first()
    
    if not user:
        # Debug why no user is found
        flash(f"Error: No user found for token '{token}'. Token might be misspelled or already used.", "danger")
        return redirect(url_for("auth_bp.forgot_password"))

    if not is_token_valid(user, token):
        # Debug exactly why it's invalid
        now = datetime.utcnow()
        expiry = user.reset_token_expiry
        msg = "Token is not valid. "
        if user.reset_token != token:
            msg += f"DB token doesn't match: {user.reset_token} vs {token}. "
        elif expiry is None:
            msg += "Expiry limit is missing in DB. "
        elif now > expiry:
            msg += f"Token expired at {expiry} (current time {now}). "
        
        flash(msg, "danger")
        return redirect(url_for("auth_bp.forgot_password"))

    if request.method == "POST":
        new_password = request.form.get("new_password")
        confirm_password = request.form.get("confirm_password")

        if new_password != confirm_password:
            flash("Passwords do not match", "warning")
            return render_template("reset_password.html", token=token)

        user.password_hash = generate_password_hash(new_password)
        user.is_first_login = False
        user.reset_token = None
        user.reset_token_expiry = None
        db.session.commit()

        flash("Password updated successfully!", "success")
        return render_template("reset_password.html", token=None, success=True)

    return render_template("reset_password.html", token=token)


# -------------------------
# PUSH NOTIFICATIONS
# -------------------------
@auth_bp.route("/api/push/subscribe", methods=["POST"])
@login_required
def subscribe_push():
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "message": "No data provided"}), 400

    subscription_info = data.get("subscription")
    if not subscription_info:
        return jsonify({"success": False, "message": "No subscription info"}), 400

    # Save to database
    try:
        # Check if subscription already exists for this endpoint
        existing = PushSubscription.query.filter_by(endpoint=subscription_info["endpoint"]).first()
        if existing:
            existing.user_id = current_user.id
            existing.p256dh = subscription_info["keys"]["p256dh"]
            existing.auth = subscription_info["keys"]["auth"]
            print(f"DEBUG PUSH: Updated existing subscription for user {current_user.id}")
        else:
            new_sub = PushSubscription(
                user_id=current_user.id,
                endpoint=subscription_info["endpoint"],
                p256dh=subscription_info["keys"]["p256dh"],
                auth=subscription_info["keys"]["auth"]
            )
            db.session.add(new_sub)
            print(f"DEBUG PUSH: Created new subscription for user {current_user.id}")
        
        db.session.commit()
        print("DEBUG PUSH: Successfully committed to database.")
        return jsonify({"success": True, "message": "Subscribed successfully"})
    except Exception as e:
        print(f"CRITICAL PUSH ERROR: Failed to save subscription to database: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
