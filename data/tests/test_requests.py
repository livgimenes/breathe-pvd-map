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
import pytz
import time

################# 


### Global variable for failed requests
FAILED_REQUESTS = {"node_id":[], "location":[], "time":[]}



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
        print(url)

        #storing logs
        FAILED_REQUESTS["node_id"].append(row["Node ID"])
        FAILED_REQUESTS["location"].append(row["Location"])
        FAILED_REQUESTS["time"].append(datetime.datetime.now()) 

    return data

def store_failed_requests(failed_requests):
    
    #get values from the failed requests from the csv
    failed_df = pd.read_csv("data/logs/failed_logs.csv")

    #add the most recent FAILED_REQUESTS to the dataframe
    failed_df = failed_df.append(failed_requests, ignore_index=True)

    #add the current logs to table, add to the csv file
    failed_df.to_csv("data/logs/failed_logs.csv", index=False)


def get_data(data, start_date, end_date, variable, start_time, end_time):
    """Loads all the measurements from the nodes and store them into a pandas dataframe. To modify specifics go to get_requests for row"""
    all_data = data.apply(get_requests_for_row, axis=1, args=(start_date, end_date, variable, start_time,end_time))
    combined = pd.concat(all_data.values)
    return combined

directory = './data'
file_name = 'sensors_with_nodes.csv'
file_path = os.path.join(directory, file_name)
sensors_df = pd.read_csv(file_path,usecols=["Sensor ID","Node ID","Location","Latitude","Longitude","Installation Date"])

def est_to_pst(time):
  """Takes in time represented as a datetime and returns, in the same format, the time converted into pst. Assumes the time is est. Returns a str,"""


  # Convert to Pacific Timezone
  date = time.astimezone(timezone('US/Pacific'))

  # Format the date as a string and return
  return date

curr_time = est_to_pst(datetime.datetime.now())

##subtract 1 day from current time
start_time = curr_time - datetime.timedelta(days=1)


#round curr_time and start_time to the nearest hour
curr_time = curr_time.replace(minute=0, second=0, microsecond=0)
start_time = start_time.replace(minute=0, second=0, microsecond=0)

## converting both of them to strings
start_date = str(start_time)[0:10]
start_time = str(start_time)[11:19]

end_date = str(curr_time)[0:10]
end_time = str(curr_time)[11:19] 


variable = "co2_corrected_avg_t_drift_applied,temp"


# data = get_data(sensors_df,start_date, end_date, variable, start_time, end_time)


# print(data)


#try to generate all of the nodes

url = "http://128.32.208.8/node/268/measurements_all/csv?name=Providence%20College&interval=60&variables=co2_corrected_avg_t_drift_applied&start=2023-09-13%2011:00:00&end=2023-09-14%2011:00:00&char_type=measurement"

response = requests.get(url)
print(response.text)











