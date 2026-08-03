import csv

input_file = "dssv.csv"
output_file = "dssv_updated.csv"

with open(input_file, mode='r', encoding='utf-8') as infile:
    reader = csv.reader(infile)
    headers = next(reader)
    
    nat_idx = headers.index('nationality')
    headers.insert(nat_idx + 1, 'place_of_birth')
    
    rows = []
    for row in reader:
        address = row[headers.index('address') - 1]
        place = address.split(',')[-1].strip() if address else "TP.HCM"
        row.insert(nat_idx + 1, place)
        rows.append(row)

with open(output_file, mode='w', encoding='utf-8', newline='') as outfile:
    writer = csv.writer(outfile)
    writer.writerow(headers)
    writer.writerows(rows)

import os
os.replace(output_file, input_file)
print("Updated dssv.csv successfully!")
