import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from app import create_app, db
from sqlalchemy import text

app = create_app()
with app.app_context():
    try:
        db.session.execute(text("DROP TABLE airwing"))
        db.session.commit()
        print("Dropped airwing table successfully.")
    except Exception as e:
        db.session.rollback()
        print(f"Failed to drop table: {e}")
        
    db.create_all()
    print("Recreated all tables successfully.")
