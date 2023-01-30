import csv
import json
import pandas as pd
import os
from corrections import *


WEB_BASED = False

#TODO: Figure out what's wrong with this date thing
TARGET_DATE = '2022-12-15 05:00:00-08:00'

directory = './data'
file_name = 'breathe_providence_sensors.csv'
file_path = os.path.join(directory, file_name)
sensor_data = pd.read_csv(file_path,usecols=["Sensor ID", "Node ID", "Location","Latitude","Longitude"])

#TODO: Add pulling non corrected data 

if WEB_BASED:
    directory = './data'
    file_name = 'corrected_avg.csv'
    file_path = os.path.join(directory, file_name)
    corrected_data = pd.read_csv(file_path,usecols=["datetime","node_id","co2_corrected_avg_T_drift_applied"])
    corrected_data = corrected_data.rename(columns={'co2_corrected_avg_T_drift_applied': 'co2_corrected'})
    corrected_data = corrected_data.loc[corrected_data['datetime'] == '2022-12-15 05:00:00-08:00']
    combined_data = pd.merge(corrected_data, sensor_data, left_on='node_id', right_on='Node ID', how="right")
else:
    #TODO: Rework this so it's faster
    non_corrected_data = clean_data(get_data(sensor_data))
    non_corrected_data = non_corrected_data.rename(columns={'co2_corrected_avg': 'co2_corrected'})
    print(non_corrected_data)
    non_corrected_data = non_corrected_data.loc[non_corrected_data['datetime']  == '2023-01-30 05:00:00']
    combined_data = pd.merge(non_corrected_data, sensor_data, left_on='node_id', right_on='Node ID', how="right")


combined_data = combined_data.fillna(-999)
print(combined_data)
combined_data = combined_data.drop("node_id", axis='columns')

def convert_latitude(latitude):
    value, direction = latitude.split()
    value = float(value)
    if direction == 'S':
        value = -value
    return value

def convert_longitude(longitude):
    value, direction = longitude.split()
    value = float(value)
    if direction == 'W':
        value = -value
    return value

#Convert Latitute and Longitude
combined_data['Latitude'] = combined_data['Latitude'].apply(convert_latitude)
combined_data['Longitude'] = combined_data['Longitude'].apply(convert_longitude)

print(combined_data)

directory = "./public"
combined_data.to_json(os.path.join(directory, 'coords.json'), orient='records')


