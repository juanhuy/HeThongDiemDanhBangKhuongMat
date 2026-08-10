import pymysql
import re

# Connect to DB
conn = pymysql.connect(
    host='127.0.0.1',
    user='root',
    password='',
    database='ptit_diem_danh',
    autocommit=True
)

cursor = conn.cursor()

with open(r'd:\test\HeThongDiemDanhBangKhuongMat\backend\database\init\01_init.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

# Disable foreign key checks for dropping tables
cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")

# Custom parser for DELIMITER
statements = []
current_delimiter = ';'
current_statement = ''

lines = sql.split('\n')
for line in lines:
    stripped = line.strip()
    if stripped.startswith('DELIMITER'):
        current_delimiter = stripped.split(' ')[1]
        continue
    
    # We want to ignore empty lines and lines that just have the delimiter if it's on a new line
    if stripped == current_delimiter and current_delimiter != ';':
        # the delimiter is alone on this line
        stmt = current_statement.strip()
        if stmt:
            statements.append(stmt)
        current_statement = ''
        continue

    current_statement += line + '\n'
    if stripped.endswith(current_delimiter):
        stmt = current_statement.strip()
        # Remove the delimiter from the end of the statement
        if current_delimiter != ';':
            stmt = stmt[:-len(current_delimiter)].strip()
        elif stmt.endswith(';'):
            stmt = stmt[:-1].strip()
            
        if stmt:
            statements.append(stmt)
        current_statement = ''

if current_statement.strip():
    statements.append(current_statement.strip())

for i, stmt in enumerate(statements):
    if not stmt.strip():
        continue
    try:
        cursor.execute(stmt)
    except Exception as e:
        print(f"Error executing statement:\n{stmt[:100]}...\n{e}\n")

cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
cursor.close()
conn.close()
print("Finished executing 01_init.sql")
