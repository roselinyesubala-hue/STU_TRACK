import os
from datetime import timedelta
from flask_sqlalchemy import SQLAlchemy
from flask_mail import Mail 
basedir = os.path.abspath(os.path.dirname(__file__))

db = SQLAlchemy()
mail=Mail()



# Secret key for sessions and CSRF protection
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-me")

class Config:
    SECRET_KEY = SECRET_KEY 
    PERMANENT_SESSION_LIFETIME = timedelta(days=30)
    SESSION_COOKIE_SAMESITE = "Lax" 
    # Database connection (update with your credentials)
    SQLALCHEMY_DATABASE_URI = (
        os.environ.get("DATABASE_URL")
        or "postgresql://stu_track_db_liua_user:GGHs4SOiQC2H7xk30cKdO0E7qiEvdgPV@dpg-d6u120euk2gs73943kd0-a.oregon-postgres.render.com/stu_track_db_liua"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Email configuration
    MAIL_SERVER = "smtp.gmail.com"
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.environ.get("MAIL_USERNAME", "sju.stutrack@gmail.com")
    MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD", "gtbmovnrxzbdyykq")
    MAIL_DEFAULT_SENDER = os.environ.get("MAIL_DEFAULT_SENDER","sju.stutrack@gmail.com" )

    # VAPID keys for Web Push
    VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "BD84GMn22pdAdjz6DnsAcyBiUq1ui4RdnARelHjwl8n6BIK_XkgHfyLMQirYw69IGNOkH7wjalzssqCpVz6Xth4")
    VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "stPhqOMEW5L5b2A9KLRricCsYLzBKY7P8dEv51Gho8A")
    VAPID_CLAIM_EMAIL = os.environ.get("VAPID_CLAIM_EMAIL", "mailto:sju.stutrack@gmail.com")



  
