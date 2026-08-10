import urllib.request, urllib.error
body = b'--boundary\r\nContent-Disposition: form-data; name="file"; filename="test.csv"\r\nContent-Type: text/csv\r\n\r\nlecturer_id,full_name\r\nGV1,Test\r\n--boundary--\r\n'
req = urllib.request.Request('http://localhost:8000/api/admin/lecturers/import', data=body, headers={'Content-Type': 'multipart/form-data; boundary=boundary'})
try:
    print(urllib.request.urlopen(req).read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print('HTTP ERROR:', e.code)
    print(e.read().decode('utf-8'))
