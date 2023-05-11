
"""C02 calibration scripts for Breathe Providence Group. Corrections for a network without a Picarro machine"""


import pandas as pd
import numpy as np
import calendar
from datetime import datetime
from pytz import timezone
import matplotlib.pyplot as plt
import datetime
import utils
import urllib
import os

from sklearn.linear_model import LinearRegression

#TODO:Change for the variables to be in the end function

#Change this to only reflect active nodes
ACTIVE_NODES = ["250","267","270","274","276","261","252","257","263"]


directory = './data'
file_name = 'breathe_providence_sensors.csv'
file_path = os.path.join(directory, file_name)
sensors_df = pd.read_csv(file_path)



#You will need these for future readings
sensors_df = sensors_df[sensors_df["Node ID"].isin(ACTIVE_NODES)]
sensors_list = sensors_df["Node ID"].tolist()


#TODO: Change these to be less specific and more generic
def get_requests(node_name,node_id,variable,start_date,start_time,end_date,end_time):
  """Given a node_id, measure, start date and end date return the raw cvs files for that node """

  #generating the url 
  base_url = "http://128.32.208.8"
  

  #TODO: Fix this construction
  custom_url = ("/node/" + str(node_id) 
  + "/measurements_all/csv?name=" + str(node_name) + "&interval=60&variables=" + variable + "&start=" + 
  str(start_date) + "%20" + str(start_time)+ "&end=" + str(end_date) + "%20" + str(end_time) + "&char_type=measurement")

  return base_url + custom_url

def get_requests_for_row(row):
  """Helper for get_data. Gets requets for a given row, for a pre-defined start-date,end-date,pollution variant and time """

  #Variables bellow can be modified, to get a different time frame

  #Note: Numbers have to be in the format year-month-day, this is not the standard datetime module
  start_date = "2022-9-1"
  end_date = str(datetime.datetime.now())[0:10]
  variable = "co2_corrected_avg,temp"
  default_time = "00:00:00" 
  url = get_requests(urllib.parse.quote(row["Location"]), row["Node ID"],variable, start_date,default_time,end_date,default_time)
  try:
    data = pd.read_csv(url)
  except:
    data = pd.DataFrame()
    print("This is the attempted url: " + url)
    print(f"An error occurred while trying to fetch data from the server")
  return data


def get_data(data):
  """Loads all the measurments from the nodes and store them into a pandas dataframe. To modify specifics go to get_requests for row"""
  all_data = data.apply(get_requests_for_row, axis=1)
  return pd.concat(all_data.values)


######Different way of formating the datas

def format_given_nodes(node_list):
  node_list = list(set(node_list))
  node_list.sort()
  node_string = ','.join(str(node) for node in node_list)
  return node_string

def get_url_for_all(variable,start_date,start_time,end_date,end_time):
  nodes = format_given_nodes(sensors_list)

  
  base_url = "http://128.32.208.8"

  formatted_start = start_date + start_time
  formatted_end = end_date + end_time

  custom_url = f"/node/{nodes}/measurements_all/zip?name=Multiselect%20Download&interval=60&variables={variable}&start={formatted_start}&end={formatted_end}&chart_type=measurement"
  return base_url + custom_url

def get_all_data_once():

  went_wrong = 0
  #TODO: Move it from here
  start_date = "2022-9-1"
  end_date = str(datetime.datetime.now())[0:10]
  variable = "co2_corrected_avg,temp"
  #TODO: might have todo something different for the time
  #print(str(datetime.datetime.now().time())[0:8])
  start_time = "00:00:00" 
  end_time = str(datetime.datetime.now().time())[0:8]

  print(get_url_for_all(variable, start_date,start_time,end_date,end_time))
  try:
    data = pd.read_csv(get_url_for_all(variable, start_date,start_time,end_date,end_time))
  except Exception as e:
    print(f"An error occurred while trying to fetch data from the server: {e}")
    went_wrong += 1
  return data

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

  #rename co2 column to this 
  #data.rename(columns={'co2_corrected_avg': 'orginal_co2_avg'}, inplace=True)

  return data


def get_fit(row,slope):
  """Helper functions used in generate_measurements to get the off_set for the calculated corrections"""

  if slope is not None:
    _start_x = slope['start_x']
    current_x = calendar.timegm(row['datetime'].timetuple())
    start_x = current_x - _start_x
    offset = float(slope['m']) * start_x + float(slope['b'])
  else:
    offset=None

  return offset


def get_corrected(row,slope,slope_temp):
  """"Helper function used in generate_measurements to get the correct co2 avg including drift"""

  _start_x = slope['start_x']
  current_x = calendar.timegm(row['datetime'].timetuple())
  start_x = current_x - _start_x
  offset = float(slope['m']) * start_x + float(slope['b'])
  val = float(row['co2_corrected_avg'])  - offset - slope_temp * float(row['temp'])
  return val


def generate_percentiles(data,time_window):
  """Helper function that calculates the tenth percentile for every time window for reference data and regular data """
  temp_window = 1

  for j, row in data.iterrows():
    row_time = row['datetime']
    start_time = row_time - datetime.timedelta(hours=time_window / 2)
    end_time = row_time + datetime.timedelta(hours=time_window / 2)

    data_subset = data.loc[(data['datetime'] > start_time) & (data['datetime'] <= end_time)]
    start_T = row['temp'] - temp_window
    end_T = row['temp'] + temp_window

    temp_index = np.where((data_subset['temp'] >= start_T) & (data_subset['temp'] <= end_T))
    data.loc[j, 'tenth_percentile'] = np.nanpercentile(data_subset.iloc[temp_index]['co2_corrected_avg'], int(10))
    data.loc[j, 'tenth_percentile_ref'] = np.nanpercentile(data_subset.iloc[temp_index]['co2_ref'], int(10))
  return data

def generate_slopes(data, time_window):
  """Helper that generates the m, b values for the slope by executing a linear regression"""

  for j, row in data.iterrows():

    row_time = row['datetime']
    start_time = row_time - datetime.timedelta(hours=time_window / 2)
    end_time = row_time + datetime.timedelta(hours=time_window / 2)

    mask = (data['datetime'] > start_time) & (data['datetime'] <= end_time)
    data_subset = data.loc[mask]

    reg = LinearRegression().fit(np.array(data_subset['temp']).reshape((-1, 1)),
                                     np.array(data_subset['tenth_percentile'] - data_subset['tenth_percentile_ref'],
                                              dtype=float))

    #Value but could be printed or for different types of modifications when calibrating                                   
    r_sq = reg.score(np.array(data_subset['temp']).reshape((-1, 1)),
                         np.array(data_subset['tenth_percentile'] - data_subset['tenth_percentile_ref'], dtype=float))

    intercept = reg.intercept_
    coef = reg.coef_.tolist()

    data.loc[j, 'm'] = coef[0]
    data.loc[j, 'b'] = intercept
  return data

def generate_measurements(data):
  """Compiles helpers and generates final dataframe with slope and offset + final correct co2 avg including drift"""
  
  #Change to adjust the time window
  time_window = 24 * 7 * 3

  #Adding reference data
  data['co2_ref'] = data.groupby('datetime')['co2_corrected_avg'].transform('median')

  #Calling helper functions 
  data = generate_percentiles(data,time_window)
  data = generate_slopes(data, time_window)

  if data is not None and not data.empty:

    slope_temp = np.median(data['m'])

    data['offset_Tcorrected'] = data['tenth_percentile'] - slope_temp * data['temp'] - data['tenth_percentile_ref']

    #dropping any null just in case
    data = data.dropna(subset=['b', 'offset_Tcorrected'])

    #function imported from utils.py, include this file for the function to work
    slope = utils.calculate_slope(data, 'offset_Tcorrected', 'datetime')
    print(slope)
    data['offset_fit'] = data.apply(get_fit, axis=1, args=[slope])

    data['co2_corrected_avg_T_drift_applied'] = data.apply(get_corrected, axis=1, args=[slope, slope_temp])

    print("final data display")
    print(data.head())

  return data

def generate_corrections():
  """Compiles all of the functions to retrive the data, generate corrections, and save data into a csv"""
  
  pre_processed_data = clean_data(get_data(sensors_df))
  print(pre_processed_data.head())

  corrected_data = generate_measurements(pre_processed_data)
  directory = './data'
  file_name = 'corrected_avg.csv'

  # Add supporting uncorrected data
  file_path = os.path.join(directory, file_name)
  corrected_data.to_csv(file_path, index=False)


if __name__ == "__main__":
  generate_corrections()
  









