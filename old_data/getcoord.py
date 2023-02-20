

### ADDING THE DATA IN THE SAME FILE 

import pandas as pd
import os
from datetime import datetime
from pytz import timezone
import datetime
import urllib
import urllib.parse

###PRE-CODING READING

def get_requests(node_name, node_id, variable, start_date, start_time, end_date, end_time):
    """Given a node_id, measure, start date and end date return the raw cvs files for that node """

    base_url = "http://128.32.208.8"


    custom_url = ("/node/" + str(node_id)
                  + "/measurements_all/csv?name=" + str(node_name) + "&interval=60&variables=" + variable + "&start=" +
                  str(start_date) + "%20" + str(start_time) + "&end=" + str(end_date) + "%20" + str(end_time) + "&char_type=measurement")
    
    print(base_url + custom_url)
    return base_url + custom_url

def get_requests_for_row(row, start_date, end_date, variable, start_time, end_time):
    """Helper for get_data. Gets requets for a given row, for a pre-defined start-date, end-date, pollution variant and time """

    url = get_requests(urllib.parse.quote(row["Location"]), row["Node ID"], variable, start_date, start_time, end_date, end_time)
    try:
        data = pd.read_csv(url)
    except:
        data = pd.DataFrame()
        print(f"An error occurred while trying to fetch data from the server for node " + str(row["Node ID"]) + " at " + row["Location"])
    return data

def get_data(data, start_date, end_date, variable, start_time, end_time):
    """Loads all the measurements from the nodes and store them into a pandas dataframe. To modify specifics go to get_requests for row"""
    all_data = data.apply(get_requests_for_row, axis=1, args=(start_date, end_date, variable, start_time,end_time))
    return pd.concat(all_data.values)


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
  print(data.head(5))
  data = data.drop(columns=['epoch', 'local_timestamp',"node_file_id"])

  #remove missing data, -999
  data = data.replace({'co2_corrected_avg_t_drift_applied': {-999.00000: pd.NaT}})
  data = data.dropna(subset=['datetime', 'co2_corrected_avg_t_drift_applied'])

  #round to no decimals
  data['co2_corrected_avg_t_drift_applied'] = data['co2_corrected_avg_t_drift_applied'].map(lambda x: round(x))

  #change time zones 
  data['datetime'] = data['datetime'].map(lambda x: pst_to_est(x))

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
     
    directory = './old_data'
    file_name = 'breathe_providence_sensors.csv'
    file_path = os.path.join(directory, file_name)
    sensors_df = pd.read_csv(file_path,usecols=["Sensor ID","Node ID","Location","Latitude","Longitude"])



    curr_time = pst_to_est(datetime.datetime.now())

    end_date = str(curr_time)[0:10]
    end_time = str(curr_time)[11:19] 

    #change back to the time 

    rounded_time = curr_time.replace(minute=0, second=0, microsecond=0)
    print("this is the rounded time" + str(rounded_time))
    start_date = rounded_time.date()
    start_time = "00:00:00"
    #CO2_corrected_avg_t_drift_applied
    variable = "co2_corrected_avg_t_drift_applied,temp"


    data = clean_data(get_data(sensors_df,start_date, end_date, variable, start_time, end_time))
    data = data.rename(columns={'co2_corrected_avg_t_drift_applied': 'co2_corrected'})
    #TODO: Take out
    data.sort_values(by='datetime', ascending=False, inplace=True)


    #get the datetime for that value and then use tha column value to then get the desired times
    print(data)

    filter_data = str(rounded_time)


    #it has to be the rounded hour
    print(filter_data)
    

    # filter to only have the data from now
    hour_data = data[data["datetime"] == filter_data]


    #maybe add these late
    combined_data = pd.merge(hour_data, sensors_df, left_on='node_id', right_on='Node ID', how="right")
    combined_data.fillna(-1, inplace=True)


    combined_data = combined_data.drop("node_id", axis='columns')
    combined_data['Latitude'] = combined_data['Latitude'].apply(convert_latitude)
    combined_data['Longitude'] = combined_data['Longitude'].apply(convert_longitude)

    print(combined_data)

    #filter to only include 

    directory = "./public"
    combined_data.to_json(os.path.join(directory, 'coords.json'), orient='records')


convert_final()
