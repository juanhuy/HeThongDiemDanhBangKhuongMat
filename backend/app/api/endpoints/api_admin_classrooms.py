from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.schemas.classroom import ClassroomCreate, ClassroomUpdate, ClassroomResponse
from app.crud import crud_classroom as crud

router = APIRouter()

@router.get("/", response_model=List[ClassroomResponse])
def read_all_classrooms(skip: int = 0, limit: int = 200, search: Optional[str] = None, status_filter: Optional[str] = None, db: Session = Depends(get_db)):
    return crud.get_classrooms(db, skip=skip, limit=limit, search=search, status=status_filter)

@router.get("/{room_id}", response_model=ClassroomResponse)
def read_classroom_by_id(room_id: str, db: Session = Depends(get_db)):
    db_room = crud.get_classroom(db, room_id=room_id)
    if not db_room:
        raise HTTPException(status_code=404, detail="Khong tim thay phong hoc")
    return db_room

@router.post("/", response_model=ClassroomResponse, status_code=status.HTTP_201_CREATED)
def create_new_classroom(classroom: ClassroomCreate, db: Session = Depends(get_db)):
    db_room = crud.get_classroom(db, room_id=classroom.room_id)
    if db_room:
        raise HTTPException(status_code=400, detail="Ma phong hoc da ton tai")
    return crud.create_classroom(db=db, classroom=classroom)

@router.put("/{room_id}", response_model=ClassroomResponse)
def update_existing_classroom(room_id: str, classroom_in: ClassroomUpdate, db: Session = Depends(get_db)):
    db_room = crud.update_classroom(db, room_id=room_id, classroom_update=classroom_in)
    if not db_room:
        raise HTTPException(status_code=404, detail="Khong tim thay phong hoc")
    return db_room

@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_classroom(room_id: str, db: Session = Depends(get_db)):
    db_room = crud.delete_classroom(db, room_id=room_id)
    if not db_room:
        raise HTTPException(status_code=404, detail="Khong tim thay phong hoc")
    return None
