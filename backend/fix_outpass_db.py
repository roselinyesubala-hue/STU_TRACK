import pymysql

try:
    conn = pymysql.connect(
        host='localhost',
        user='root',
        password='Rose@1979',
        database='stu_track'
    )
    cursor = conn.cursor()
    cursor.execute("ALTER TABLE outpass ADD COLUMN slip_generated_at DATETIME;")
    conn.commit()
    print("Successfully added slip_generated_at to outpass table.")
except Exception as e:
    print(f"Error: {e}")
finally:
    if 'conn' in locals() and conn:
        conn.close()
