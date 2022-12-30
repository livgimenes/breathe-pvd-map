import csv
import json
import pandas as pd


#TODO: change this to be optimized
rows = []
with open('locations.csv', 'r') as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        rows.append(row)

lat_lng_pairs = [[row['Latitude'], row['Longitude']] for row in rows]

converted_coordinates = []
for coord in lat_lng_pairs:
    lat, lon = coord
    lat_value = float(lat.split(' ')[0])
    lon_value = float(lon.split(' ')[0])
    if lat[-1] == 'S':
        lat_value *= -1
    if lon[-1] == 'W':
        lon_value *= -1
    converted_coordinates.append([lat_value, lon_value])

with open('coordinates.json', 'w') as f:
  json.dump(converted_coordinates, f)

print(converted_coordinates)