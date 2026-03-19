import sys
from pathlib import Path
import traceback
sys.path.insert(0, str(Path(__file__).parent))

try:
    from app import create_app, db
    from sqlalchemy import text
    app = create_app()
    with app.app_context():
        with open("migrate_out.txt", "w") as f:
            try:
                db.session.execute(text("ALTER TABLE users MODIFY COLUMN role ENUM('Student', 'Admin', 'AirWing') NOT NULL;"))
                db.session.execute(text("ALTER TABLE users ADD COLUMN airwing_id_fk INT NULL;"))
                db.session.execute(text("ALTER TABLE users ADD CONSTRAINT fk_user_airwing FOREIGN KEY (airwing_id_fk) REFERENCES airwing(id);"))
                db.session.commit()
                f.write("Schema update successful.\n")
            except BaseException as e:
                db.session.rollback()
                f.write(f"Error updating schema: {e}\n")
except BaseException as e:
    with open("migrate_out.txt", "w") as f:
        f.write("Error during setup:\n")
        traceback.print_exc(file=f)
