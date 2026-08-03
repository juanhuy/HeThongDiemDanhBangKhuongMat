from .account import AccountBase, AccountCreate, AccountUpdate, AccountResponse
from .token import Token, TokenData
from .student import StudentBase, StudentCreate, StudentUpdate, StudentResponse, PaginatedStudentResponse
from .lecturer import LecturerBase, LecturerCreate, LecturerUpdate, LecturerResponse, PaginatedLecturerResponse
from .subject import SubjectBase, SubjectCreate, SubjectUpdate, SubjectResponse, PaginatedSubjectResponse
from .credit_class import CreditClassBase, CreditClassCreate, CreditClassResponse
from .class_enrollment import ClassEnrollmentBase, ClassEnrollmentCreate, ClassEnrollmentResponse
from .classroom import ClassroomBase, ClassroomCreate, ClassroomResponse
from .class_session import ClassSessionBase, ClassSessionCreate, ClassSessionUpdate, ClassSessionResponse
from .attendance import AttendanceResponse
from .face_feature import FaceFeatureResponse

__all__ = [
    # Account & Auth
    "AccountBase", "AccountCreate", "AccountUpdate", "AccountResponse",
    "Token", "TokenData",
    
    # Users
    "StudentBase", "StudentCreate", "StudentUpdate", "StudentResponse", "PaginatedStudentResponse",
    "LecturerBase", "LecturerCreate", "LecturerUpdate", "LecturerResponse", "PaginatedLecturerResponse",
    
    # Academic
    "SubjectBase", "SubjectCreate", "SubjectUpdate", "SubjectResponse", "PaginatedSubjectResponse",
    "CreditClassBase", "CreditClassCreate", "CreditClassResponse",
    "ClassEnrollmentBase", "ClassEnrollmentCreate", "ClassEnrollmentResponse",
    
    # Scheduling & Infrastructure
    "ClassroomBase", "ClassroomCreate", "ClassroomResponse",
    "ClassSessionBase", "ClassSessionCreate", "ClassSessionUpdate", "ClassSessionResponse",
    
    # AI & Attendance
    "AttendanceResponse",
    "FaceFeatureResponse",
]