

### ADDING THE DATA IN THE SAME FILE 

import pandas as pd
import os
from datetime import datetime
from pytz import timezone
import datetime
import urllib
import urllib.parse
import numpy as np 
import requests
import json

###PRE-CODING READING

def get_requests(node_name, node_id, variable, start_date, start_time, end_date, end_time):
    """Given a node_id, measure, start date and end date return the raw cvs files for that node """

    base_url = "http://128.32.208.8"


    custom_url = ("/node/" + str(node_id)
                  + "/measurements_all/csv?name=" + str(node_name) + "&interval=60&variables=" + variable + "&start=" +
                  str(start_date) + "%20" + str(start_time) + "&end=" + str(end_date) + "%20" + str(end_time) + "&char_type=measurement")
    
    return base_url + custom_url



def get_requests_for_row(row, start_date, end_date, variable, start_time, end_time):
    """Helper for get_data. Gets requets for a given row, for a pre-defined start-date, end-date, pollution variant and time """


    url = get_requests(urllib.parse.quote(row["Location"]), row["Node ID"], variable, start_date, start_time, end_date, end_time)
    try:
        data = pd.read_csv(url)
    except:
        data = pd.DataFrame()
        print(f"An error occurred while trying to fetch data from the server for node " + str(row["Node ID"]) + " at " + row["Location"])
        print("This is the url: " + url)
    return data


#TODO: Comeback to reimplement this 
def store_failed_requests(failed_requests):
    #save failed requests to a csv file, add to already existing entries
    directory = './data'
    file_name = 'failed_requests.csv'
    file_path = os.path.join(directory, file_name)
    failed_requests.to_csv(file_path, mode='a', header=False)


def get_data(data, start_date, end_date, variable, start_time, end_time):
    """Loads all the measurements from the nodes and store them into a pandas dataframe. To modify specifics go to get_requests for row"""
    all_data = data.apply(get_requests_for_row, axis=1, args=(start_date, end_date, variable, start_time,end_time))
    combined = pd.concat(all_data.values)
    #how can i get all of the values for 'co2_corrected_avg_t_drift_applied' and print them as list
    print(combined['co2_corrected_avg_t_drift_applied'].tolist())
    return combined


### DATA CLEANING 


def pst_to_est(time):
  """Takes in time represented as a string and returns, in the same format, the time converted into est. Returns a str,"""

  #convert it to a time date module
  if type(time) == str:
    time = datetime.datetime.strptime(time,"%Y-%m-%d %H:%M:%S")

  new_time = time.astimezone(timezone('US/Pacific'))
  return new_time

def clean_data(data):
  """Cleans the panda dataframe removing missing data, drops unecessary columns and tranforms data from pst to est"""

  #drop unecessary columns

  ###TODO: change this to be using local_timestamp instead of datetime
  data = data.drop(columns=['epoch', 'local_timestamp',"node_file_id"])

  #remove missing data, -999
  data = data.replace({'co2_corrected_avg_t_drift_applied': {-999.00000: np.nan}})
  data = data.dropna(subset=['datetime', 'co2_corrected_avg_t_drift_applied'])

  #round to no decimals
  data['co2_corrected_avg_t_drift_applied'] = data['co2_corrected_avg_t_drift_applied'].map(lambda x: round(x))

  #change time zones 
  data['datetime'] = data['datetime'].map(lambda x: pst_to_est(x))

  #make the datetime be a string and not include -08:00
  data['datetime'] = data['datetime'].map(lambda x: str(x)[0:19])

  return data

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



def convert_final():
     
    directory = './data'
    file_name = 'sensors_with_nodes.csv'
    file_path = os.path.join(directory, file_name)
    sensors_df = pd.read_csv(file_path,usecols=["Sensor ID","Node ID","Location","Latitude","Longitude","Installation Date"])



    curr_time = pst_to_est(datetime.datetime.now())

    end_date = str(curr_time)[0:10]
    end_time = str(curr_time)[11:19] 

    #change back to the time 
    rounded_time = curr_time.replace(minute=0, second=0, microsecond=0)
    print("this is the rounded time: " + str(rounded_time))
    start_date = rounded_time.date()
    start_time = "00:00:00"
    variable = "co2_corrected_avg_t_drift_applied,temp"


    data = clean_data(get_data(sensors_df,start_date, end_date, variable, start_time, end_time))


    data = data.rename(columns={'co2_corrected_avg_t_drift_applied': 'co2_corrected'})
    data.sort_values(by='datetime', ascending=False, inplace=True)

    print("This is the renamed file ", data)
    print("this is the rounded time: " + str(rounded_time))
  
    print("Date list", list(data.columns.values))



    #maybe add these late
    combined_data = pd.merge(data, sensors_df, left_on='node_id', right_on='Node ID', how="right")
    print("this is the combined data post merging", combined_data)
    combined_data.fillna(-1, inplace=True)


    combined_data = combined_data.drop("node_id", axis='columns')
    combined_data['Latitude'] = combined_data['Latitude'].apply(convert_latitude)
    combined_data['Longitude'] = combined_data['Longitude'].apply(convert_longitude)

    print(combined_data)

    #filter to only include 


    #have it continously add to a csv file to see what has been displaying

    directory = "./public"
    print_comb = combined_data.to_json(orient='records')
    

    #comment this out if it works 
    combined_data.to_json(os.path.join(directory, 'coords.json'), orient='records')

    return print_comb


####### FINAL API END-POINT


# ### File is correct 
final_data = convert_final()
# print(final_data)
# url = 'http://localhost:3000/api/data'
# headers = {'Content-type': 'application/json'}
# response = requests.post(url, data=json.dumps(final_data), headers=headers)
# print(response.status_code)






