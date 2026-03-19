import sys
from pathlib import Path
import traceback
sys.path.insert(0, str(Path(__file__).parent))

try:
    from app import create_app, db
    from sqlalchemy import text
    app = create_app()
    with app.app_context():
        with open("db_status2.txt", "w") as f:
            try:
                db.session.execute(text("DROP TABLE IF EXISTS airwing"))
                db.session.commit()
                db.create_all()
                result = db.session.execute(text("DESCRIBE airwing")).fetchall()
                f.write("Columns in airwing:\n")
                for row in result:
                    f.write(f"- {row[0]}\n")
            except Exception as e:
                f.write(f"Error during DB ops: {e}\n")
except Exception as e:
    with open("db_status2.txt", "w") as f:
        f.write("Error during setup:\n")
        traceback.print_exc(file=f)
