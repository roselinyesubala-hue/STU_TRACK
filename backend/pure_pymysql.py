import pymysql

try:
    connection = pymysql.connect(host='localhost',
                                 user='root',
                                 password='Rose@1979',
                                 database='stu_track')
    with connection.cursor() as cursor:
        cursor.execute("DROP TABLE IF EXISTS airwing")
        connection.commit()
    print("Success")
    with open("pure_pymysql_out.txt", "w") as f:
        f.write("Success")
except Exception as e:
    with open("pure_pymysql_out.txt", "w") as f:
        f.write(str(e))
