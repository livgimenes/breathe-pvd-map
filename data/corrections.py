"C02 calibration scripts for Breathe Providence Group"


import pandas as pd
import numpy as np
import calendar
from datetime import datetime
from pytz import timezone
import matplotlib.pyplot as plt
import datetime
import utils

from sklearn.linear_model import LinearRegression

#TODO: See when you need to add the proper todos 
#TODO: Check to see if any of the functions can be optimized


#Change this to only reflect active nodes
ACTIVE_NODES = ["250","267","270","274","276","261","252","257","263"]

#Open available nodes
sensors_df = pd.read_csv("/Users/liviagimenes/Documents/CS/Breath Providence/breathe-pvd/data/breathe_providence_sensors.csv")
sensors_df = sensors_df[sensors_df["Node ID"].isin(ACTIVE_NODES)]

def get_requests(node_name,node_id,variable,start_date,start_time,end_date,end_time):
  """Given a node_id, measure, start date and end date return the raw cvs files for that node """

  #generating the url 
  base_url = "http://128.32.208.8"
  
  custom_url = ("/node/" + str(node_id) 
  + "/measurements_all/csv?name=" + str(node_name) + "&interval=60&variables=" + variable + "&start=" + 
  str(start_date) + "%20" + str(start_time)+ "&end=" + str(end_date) + "%20" + str(end_time) + "&char_type=measurement")

  return base_url + custom_url

def get_requests_for_row(row):
  """Helper for get_data.Gets requets for a given row, for a pre-defined start-date,end-date,pollution variant and time """

  #Variables bellow can be modified, to get a different time frame

  #Note: Numbers have to be in the format year-month-day, this is not the standard datetime module
  start_date = "2022-9-1"
  end_date = str(datetime.datetime.now())[0:10]
  variable = "co2_corrected_avg,temp"
  default_time = "00:00:00" 

  data = pd.read_csv(get_requests(row["Sensor ID"], row["Node ID"],variable, start_date,default_time,end_date,default_time))
  return data


def get_data():
  """Loads all the nodes from NODE_LIST from the beginning of the project to the end and will store them into a pandas dataframe"""
  all_data = sensors_df.apply(get_requests_for_row, axis=1)
  return pd.concat(all_data.values)

def pst_to_est(time):
  """Takes in time represented as a string and returns, in the same format, the time converted into est. Returns a str,"""

  #convert it to a time date module 
  date = datetime.datetime.strptime(time,"%Y-%m-%d %H:%M:%S")

  date = date.astimezone(timezone('US/Pacific'))
  return date

def clean_data(dataframe):
  """Cleans the panda dataframe removing missing data, drops unecessary columns and tranforms data from pst to est"""

  #drop unecessary columns
  dataframe = dataframe.drop(columns=['epoch', 'local_timestamp',"node_file_id"])

  #remove missing data, -999
  dataframe = dataframe.replace({'co2_corrected_avg': {-999.00000: np.NaN}})
  dataframe = dataframe.dropna(subset=['datetime', 'co2_corrected_avg'])

  #change time zones 
  dataframe['datetime'] = dataframe['datetime'].map(lambda x: pst_to_est(x))

  return dataframe

def generate_reference_data(data):
  """"Generates the average of the median of all nodes to refernece for calculations"""
  data['co2_ref'] = data.groupby('datetime')['co2_corrected_avg'].transform('median')
  return data


#add helpers
def get_fit(row,slope):
#TODO: Add description
  if slope is not None:
    _start_x = slope['start_x']
    current_x = calendar.timegm(row['datetime'].timetuple())
    start_x = current_x - _start_x
    offset = float(slope['m']) * start_x + float(slope['b'])
  else:
    offset=None

  return offset


def get_corrected(row,slope,slope_temp):
  #TODO: Add description
  _start_x = slope['start_x']
  current_x = calendar.timegm(row['datetime'].timetuple())
  start_x = current_x - _start_x
  offset = float(slope['m']) * start_x + float(slope['b'])

  # for additive
  val = float(row['co2_corrected_avg'])  - offset - slope_temp * float(row['temp'])
  return val


def generate_percentiles(data,time_window):
  #TODO: Add description
  temp_window = 1
  # creating empty rows in data frame for tenth percentile data
  data['tenth_percentile_ref'] = None
  data['tenth_percentile'] = None

  print("###### Pre-percentile data")
  print(data.shape)
  print(data.head())
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
  #TODO: Add description
  data['m'] = None
  data['b'] = None


  print("###### Pre slopes data")
  print(data.shape)
  print(data.head())

  for j, row in data.iterrows():

    row_time = row['datetime']
    start_time = row_time - datetime.timedelta(hours=time_window / 2)
    end_time = row_time + datetime.timedelta(hours=time_window / 2)

    mask = (data['datetime'] > start_time) & (data['datetime'] <= end_time)
    data_subset = data.loc[mask]

    reg = LinearRegression().fit(np.array(data_subset['temp']).reshape((-1, 1)),
                                     np.array(data_subset['tenth_percentile'] - data_subset['tenth_percentile_ref'],
                                              dtype=float))

    #TODO:See if I am using this for anything                                          
    r_sq = reg.score(np.array(data_subset['temp']).reshape((-1, 1)),
                         np.array(data_subset['tenth_percentile'] - data_subset['tenth_percentile_ref'], dtype=float))

    intercept = reg.intercept_
    coef = reg.coef_.tolist()

    data.loc[j, 'm'] = coef[0]
    data.loc[j, 'b'] = intercept
  return data

def generate_measurements(data):
  #TODO: Add description
  
  #Change to adjust the time window
  time_window = 24 * 7 * 3
  data = generate_reference_data(data)
  data = generate_percentiles(data,time_window)
  data = generate_slopes(data, time_window)

  if data is not None and not data.empty:

    slope_temp = np.median(data['m'])

    data['offset_Tcorrected'] = None
    data['offset_Tcorrected'] = data['tenth_percentile'] - slope_temp * data['temp'] - data['tenth_percentile_ref']

    #TODO: Look into if you need to change this 
    data = data.dropna(subset=['b', 'offset_Tcorrected'])

    slope = utils.calculate_slope(data, 'offset_Tcorrected', 'datetime')
    print(slope)
    data['offset_fit'] = data.apply(get_fit, axis=1, args=[slope])

    data['co2_corrected_avg_T_drift_applied'] = data.apply(get_corrected, axis=1, args=[slope, slope_temp])

    print("final data display")
    print(data.head())

  return data

def generate_corrections():
  """Compiles all of the functions to retrive the data, generate corrections, and save data into a csv"""
  pre_processed_data = generate_reference_data(clean_data(get_data()))
  corrected_data = generate_measurements(pre_processed_data)
  corrected_data.to_csv("corrected_avg.csv", encoding='utf-8', index=False)


if __name__ == "__main__":
  generate_corrections()
  









