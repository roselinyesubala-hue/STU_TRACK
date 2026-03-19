import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from app import create_app, db
from models import AirWing

app = create_app()
with app.app_context():
    # test creation
    airwing = AirWing(airwing_id="AW002", name="Test AW2", assigned_floor="1", email="test@test.com", phone="1234567890")
    db.session.add(airwing)
    db.session.commit()
    print("Added AW002 with email and phone")
    
    aw = AirWing.query.filter_by(airwing_id="AW002").first()
    print(f"Found: email {aw.email}, phone {aw.phone}")
    
    db.session.delete(aw)
    db.session.commit()
    print("Cleaned up")
