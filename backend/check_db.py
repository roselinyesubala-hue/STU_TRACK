import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from app import create_app, db
from sqlalchemy import text

app = create_app()
with app.app_context():
    with open("db_status.txt", "w") as f:
        try:
            db.session.execute(text("DROP TABLE IF EXISTS airwing"))
            db.session.commit()
            db.create_all()
            
            result = db.session.execute(text("DESCRIBE airwing")).fetchall()
            f.write("Columns in airwing:\n")
            for row in result:
                f.write(f"- {row[0]}\n")
        except Exception as e:
            f.write(f"Error: {e}\n")
