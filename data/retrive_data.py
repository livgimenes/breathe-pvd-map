import csv
import json
import pandas as pd
import os
from datetime import datetime
from pytz import timezone
import matplotlib.pyplot as plt
import datetime
import urllib
import numpy as np


#TODO: Change so that it already has the other points from the data loaded and it does that directly 


def get_requests(node_name, node_id, variable, start_date, start_time, end_date, end_time):
    """Given a node_id, measure, start date and end date return the raw cvs files for that node """

    base_url = "http://128.32.208.8"

    custom_url = ("/node/" + str(node_id)
                  + "/measurements_all/csv?name=" + str(node_name) + "&interval=60&variables=" + variable + "&start=" +
                  str(start_date) + "%20" + str(start_time) + "&end=" + str(end_date) + "%20" + str(end_time) + "&char_type=measurement")

    return base_url + custom_url

def get_requests_for_row(row, start_date, end_date, variable, default_time):
    """Helper for get_data. Gets requets for a given row, for a pre-defined start-date, end-date, pollution variant and time """

    url = get_requests(urllib.parse.quote(row["Location"]), row["Node ID"], variable, start_date, default_time, end_date, default_time)
    try:
        data = pd.read_csv(url)
    except:
        data = pd.DataFrame()
        print("This is the attempted url: " + url)
        print(f"An error occurred while trying to fetch data from the server")
    return data

def get_data(data, start_date, end_date, variable, default_time):
    """Loads all the measurements from the nodes and store them into a pandas dataframe. To modify specifics go to get_requests for row"""
    all_data = data.apply(get_requests_for_row, axis=1, args=(start_date, end_date, variable, default_time))
    return pd.concat(all_data.values)


### DATA CLEANING 


def pst_to_est(time):
  """Takes in time represented as a string and returns, in the same format, the time converted into est. Returns a str,"""

  #convert it to a time date module 
  date = datetime.datetime.strptime(time,"%Y-%m-%d %H:%M:%S")

  date = date.astimezone(timezone('US/Pacific'))
  return date

def clean_data(data):
  """Cleans the panda dataframe removing missing data, drops unecessary columns and tranforms data from pst to est"""

  #drop unecessary columns
  data = data.drop(columns=['epoch', 'local_timestamp',"node_file_id"])

  #remove missing data, -999
  data = data.replace({'co2_corrected_avg': {-999.00000: np.NaN}})
  data = data.dropna(subset=['datetime', 'co2_corrected_avg'])

  #change time zones 
  data['datetime'] = data['datetime'].map(lambda x: pst_to_est(x))

  return data
