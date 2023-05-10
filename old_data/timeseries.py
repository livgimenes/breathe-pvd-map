import sys
import json
import datetime
from datetime import timedelta
import calendar
import pandas as pd
import urllib
import urllib.parse
from pytz import timezone
import numpy as np

# Get the date parameter from the command-line arguments

#TODO: Remove all of the prints

#### REAL DATA

node = int(sys.argv[1])
date = sys.argv[2]

sensor_data = pd.read_csv("/Users/liviagimenes/Documents/CS/Breath Providence/breathe-pvd/old_data/sensors_with_nodes.csv")

### generate the correct data according to the parameter

def calculate_timerange(date,node):
    """Given a date, calculate the timerange and returns the start and end date"""

    if date == "week":
        # Get the current date
        end_date = datetime.datetime.now()
        end_date = end_date.replace(minute=0, second=0, microsecond=0)

        # Get the start and end date of the week
        start_date = end_date - datetime.timedelta(days=end_date.weekday())

    elif date == "month":
        # Get the current date
        end_date = datetime.datetime.now()
        end_date = end_date.replace(minute=0, second=0, microsecond=0)

        # Get the start and end date of the month
        start_date = end_date - timedelta(days=30)

    elif date == "all":

        end_date = datetime.datetime.now()
        end_date = end_date.replace(minute=0, second=0, microsecond=0)

        start_date = str(sensor_data[sensor_data["Node ID"] == node]["Installation Date"].values[0])
       
        start_date = datetime.datetime.strptime(start_date, "%m/%d/%Y")

    return start_date, end_date


def get_requests(node_name, node_id, variable, start_date, start_time, end_date, end_time):
    """Given a node_id, measure, start date and end date return the raw cvs files for that node """

    base_url = "http://128.32.208.8"


    custom_url = ("/node/" + str(node_id)
                  + "/measurements_all/csv?name=" + str(node_name) + "&interval=60&variables=" + variable + "&start=" +
                  str(start_date) + "%20" + str(start_time) + "&end=" + str(end_date) + "%20" + str(end_time) + "&char_type=measurement")
    
    return base_url + custom_url


def get_data(node,sensor_data, start_date, end_date, variable, start_time, end_time):
    """Helper for get_data. Gets requets for a given row, for a pre-defined start-date, end-date, pollution variant and time """

    location = str(sensor_data[sensor_data["Node ID"] == node]["Location"].values[0])


    location_parsed = urllib.parse.quote(location)

 

    url = get_requests(location_parsed, node, variable, start_date, start_time, end_date, end_time)
    try:
        data = pd.read_csv(url)
    except:
        data = pd.DataFrame()
    return data

def pst_to_est(time):
  """Takes in time represented as a string and returns, in the same format, the time converted into est. Returns a str,"""

  #convert it to a time date module
  if type(time) == str:
    time = datetime.datetime.strptime(time,"%Y-%m-%d %H:%M:%S")

  new_time = time.astimezone(timezone('US/Pacific'))
  return new_time

def est_to_pst(time):
  """Takes in time represented as a datetime and returns, in the same format, the time converted into pst. Assumes the time is est. Returns a str,"""

  # Convert the string to a datetime object

  # Convert to Pacific Timezone
  date = time.astimezone(timezone('US/Pacific'))

  # Format the date as a string and return
  return date



def clean_data(data):
  """Cleans the panda dataframe removing missing data, drops unecessary columns and tranforms data from pst to est"""

  # if empty just return the data frame
  if data.empty:
    return data

  #drop unecessary columns
  data = data.drop(columns=['epoch',"node_file_id"])
  #TODO: change this to use localtime instead of datetime

  data = data.replace({'co2_corrected_avg_t_drift_applied': {-999.00000: np.nan}})
  data = data.dropna(subset=['datetime', 'co2_corrected_avg_t_drift_applied'])

  #round to no decimals
  data['co2_corrected_avg_t_drift_applied'] = data['co2_corrected_avg_t_drift_applied'].map(lambda x: round(x))


  #change time zones 


  data['datetime'] = data['datetime'].map(lambda x: pst_to_est(x))

  #make the datetime be a string and not include -08:00
  data['datetime'] = data['datetime'].map(lambda x: str(x)[0:19])

  data = data.rename(columns={'co2_corrected_avg_t_drift_applied': 'co2_corrected'})

  return data


def generate_data(date,node,sensor_data):
    """Generates the data for the timeseries"""

    start_range, end_range = calculate_timerange(date,node)

    #change the timezone
    start_range = est_to_pst(start_range)
    end_range = est_to_pst(end_range)

    #convert the proper dates to strings 
    start_date = str(start_range)[0:10]
    end_date = str(end_range)[0:10]
    start_time = str(start_range)[11:19]
    end_time = str(end_range)[11:19]

    variable = "co2_corrected_avg_t_drift_applied"

    data = get_data(node,sensor_data, start_date, end_date, variable, start_time, end_time)

    data = clean_data(data)

    return data

######## API end point that sends over the data ########

newdata = generate_data(date,node,sensor_data)

##### turn it into a json 
newdata = newdata.to_json(orient='records')
print(newdata)










