from app import app
from config import db
from models import User, Admin
from werkzeug.security import generate_password_hash

def ensure_test_admin():
    with app.app_context():
        # Check if admin user exists in User table
        admin_user = User.query.filter_by(username="admin").first()
        if not admin_user:
            print("Creating test admin user...")
            
            # Create the Admin profile record
            admin_profile = Admin.query.filter_by(email="admin@test.com").first()
            if not admin_profile:
                admin_profile = Admin(
                    name="Test Admin",
                    email="admin@test.com",
                    contact="1234567890",
                    password_hash=generate_password_hash("admin")
                )
                db.session.add(admin_profile)
                db.session.flush()
                
            admin_user = User(
                username="admin",
                email="admin@test.com",
                role="Admin",
                is_first_login=False
            )
            admin_user.set_password("admin123")
            db.session.add(admin_user)
            db.session.commit()
            print("Test admin created. Username: admin, Password: admin123")
        else:
            print("Admin user already exists. Overwriting password to 'admin123'")
            admin_user.set_password("admin123")
            admin_user.is_first_login=False
            db.session.commit()

if __name__ == "__main__":
    ensure_test_admin()
