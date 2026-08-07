import sys; sys.stdout.reconfigure(encoding='utf-8')
import urllib.request, urllib.error, json

payload = {"lecturer_id":"GV2026102","full_name":"Test Name","email":"","phone_number":"","date_of_birth":"","gender":"","citizen_id":"","ethnicity":"","religion":"","nationality":"Việt Nam","address":"","place_of_birth":"","faculty_id":"FIT2","academic_title":"","position":"Giảng viên","employment_type":"","teaching_status":"Active"}

req = urllib.request.Request('http://localhost:8000/api/admin/lecturers/', data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
try:
    print(urllib.request.urlopen(req).read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print('HTTP ERROR:', e.code)
    print(e.read().decode('utf-8'))
