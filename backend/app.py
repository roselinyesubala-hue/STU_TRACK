import sys
from pathlib import Path
from werkzeug.security import generate_password_hash
sys.path.insert(0, str(Path(__file__).parent))
from flask import Flask, render_template
from flask_login import LoginManager
from flask_migrate import Migrate
from models import User
from config import Config,db
from flask_mail import Mail
from config import SECRET_KEY

from routes.home_routes import home_bp
from routes.auth_routes import auth_bp
from routes.admin import admin_bp
from routes.student import student_bp
from routes.user_routes import user_bp
from routes.airwing import airwing_bp

mail=Mail()
def create_app():
    # Initialize Flask app
    app = Flask(__name__, static_folder="static", template_folder="templates")
    app.config.from_object(Config)
    app.secret_key = Config.SECRET_KEY
   
    db.init_app(app)

    login_manager = LoginManager()
  
    login_manager.login_view = "auth_bp.login"
    login_manager.session_protection = "basic"  # Relaxed to prevent logouts on server restart
    login_manager.init_app(app)
    mail.init_app(app)



    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))


    # Register blueprints (modular routes)
    app.register_blueprint(home_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(student_bp)
    app.register_blueprint(airwing_bp)
   # app.register_blueprint(user_bp)
    

    # Create tables if they don’t exist
    with app.app_context():
        db.create_all()
        try:
            from sqlalchemy import text
            db.session.execute(text("ALTER TABLE outpass ADD COLUMN slip_generated_at DATETIME;"))
            db.session.commit()
        except Exception:
            db.session.rollback()

                # Seed admin if not present
        if not User.query.filter_by(username="admin").first():
            admin = User(
                username="admin",
                email="admin@example.com",
                password=generate_password_hash("admin123"),  # hashed password
                role="admin"
            )
            db.session.add(admin)
            db.session.commit()

    

    @app.after_request
    def add_header(response):
        """
        Prevent browser caching to secure the logout process and ensure
        that users cannot navigate back to protected pages after logging out.
        """
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response

    return app


app = create_app()
if __name__ == "__main__":
    app.run(debug=True)
    