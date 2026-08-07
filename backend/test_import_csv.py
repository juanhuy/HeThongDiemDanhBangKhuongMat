import sys; sys.stdout.reconfigure(encoding='utf-8')
import urllib.request, urllib.error

with open('lecturers.csv', 'rb') as f:
    csv_data = f.read()

boundary = b'--boundary'
body = boundary + b'\r\nContent-Disposition: form-data; name="file"; filename="lecturers.csv"\r\nContent-Type: text/csv\r\n\r\n' + csv_data + b'\r\n' + boundary + b'--\r\n'

req = urllib.request.Request('http://localhost:8000/api/admin/lecturers/import', data=body, headers={'Content-Type': 'multipart/form-data; boundary=boundary'})
try:
    print(urllib.request.urlopen(req).read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print('HTTP ERROR:', e.code)
    print(e.read().decode('utf-8'))
