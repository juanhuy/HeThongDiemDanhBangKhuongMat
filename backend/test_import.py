import asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import UploadFile
import io
import sys

# Must add backend to path to import
sys.path.append(r'd:\test\HeThongDiemDanhBangKhuongMat\backend')

from app.db.session import SessionLocal
from app.api.endpoints.api_admin_lecturers import import_lecturers_from_csv

async def test_import():
    db = SessionLocal()
    with open(r'd:\test\HeThongDiemDanhBangKhuongMat\backend\lecturers.csv', 'rb') as f:
        content = f.read()
    
    file = UploadFile(filename='lecturers.csv', file=io.BytesIO(content))
    
    try:
        res = await import_lecturers_from_csv(file=file, db=db)
        print("Success:", res)
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == '__main__':
    asyncio.run(test_import())
