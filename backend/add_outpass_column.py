from app import app, db
from sqlalchemy import text

with app.app_context():
    try:
        db.session.execute(text("ALTER TABLE outpass ADD COLUMN slip_generated_at DATETIME;"))
        db.session.commit()
        print("Column 'slip_generated_at' added to 'outpass' table successfully.")
    except Exception as e:
        print(f"Error adding column: {e}")
