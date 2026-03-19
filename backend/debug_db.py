import pymysql

try:
    conn = pymysql.connect(
        host='localhost',
        user='root',
        password='Rose@1979',
        database='stu_track'
    )
    cursor = conn.cursor()
    cursor.execute("DESCRIBE outpass;")
    columns = cursor.fetchall()
    
    with open("db_cols.txt", "w") as f:
        f.write(str(columns))
        
    try:
        cursor.execute("ALTER TABLE outpass ADD COLUMN slip_generated_at DATETIME;")
        conn.commit()
    except Exception as inner_e:
        with open("db_cols.txt", "a") as f:
            f.write(f"\nAlter error: {str(inner_e)}")
            
    with open("db_cols.txt", "a") as f:
        f.write("\nFinished!")

except Exception as e:
    with open("db_cols.txt", "w") as f:
        f.write(f"Connection error: {str(e)}")
finally:
    if 'conn' in locals() and conn:
        conn.close()
