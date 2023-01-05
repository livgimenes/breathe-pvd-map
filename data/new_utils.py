
"Adaptation of calibration scripts for Breathe Providence Group"


import pandas as pd
import numpy as np
import seaborn as sns
import math
import calendar
from datetime import datetime
from pytz import timezone
from statistics import mean
import matplotlib.pyplot as plt
import datetime
import utils

#also include Decimal
from decimal import Decimal

from sklearn.linear_model import LinearRegression
import io

from inspect import getframeinfo, stack



#TODO: Compile it into one dictionary
NODE_NUM_LIST = ["250","267","270","274","276","261","252","257","263"]
NODE_NAME_LIST = ["Bs12022","Bs62022","Bs72022","Bs82022","Bs92022","Bs102022","Bs112022","Bs132022","Bs162022"]



def get_requests(node_name,node_id,variable,start_date,start_time,end_date,end_time):
  """Given a node_id, measure, start date and end date return the raw cvs files for that node """

  #generating the url 
  base_url = "http://128.32.208.8"
  
  custom_url = ("/node/" + str(node_id) 
  + "/measurements_all/csv?name=" + str(node_name) + "&interval=60&variables=" + variable + "&start=" + 
  str(start_date) + "%20" + str(start_time)+ "&end=" + str(end_date) + "%20" + str(end_time) + "&char_type=measurement")

  #response = requests.get(base_url + custom_url)
  return base_url + custom_url

#gave it by time period
def get_data():
  """Loads all the nodes from NODE_LIST from the beginning of the project to the end and will store them into a pandas dataframe"""

  #Note: Numbers have to be in the format year-month-day, this is not the standard datetime module
  start_date = "2022-9-1"
  end_date = str(datetime.datetime.now())[0:10]
  variable = "co2_corrected_avg,temp"
  default_time = "00:00:00" 
  all_data = []
  for i in range(len(NODE_NAME_LIST)):
    data = pd.read_csv(get_requests(NODE_NAME_LIST[i], NODE_NUM_LIST[i],variable, start_date,default_time,end_date,default_time))
    all_data.append(data)
  return pd.concat(all_data)

def pst_to_est(time):
  """Takes in time represented as a string and returns, in the same format, the time converted into est. Returns a str,"""

  #convert it to a time date module 
  date = datetime.datetime.strptime(time,"%Y-%m-%d %H:%M:%S")

  date = date.astimezone(timezone('US/Pacific'))
  #str(date)[0:19]
  return date

def clean_data(dataframe):
  """Cleans the panda dataframe removing missing data, drops unecessary columns and tranforms data from pst to est"""

  #drop unecessary columns
  dataframe = dataframe.drop(columns=['epoch', 'local_timestamp',"node_file_id"])

  #remove missing data, -999
  dataframe = dataframe.replace({'co2_corrected_avg': {-999.00000: np.NaN}})
  dataframe = dataframe.dropna(subset=['datetime', 'co2_corrected_avg'])

  #turn the datetime into a datetime function

  #change time zones 
  dataframe['datetime'] = dataframe['datetime'].map(lambda x: pst_to_est(x))

  return dataframe



def generate_reference_data(data):
  """"Generates the average of the median of all nodes to refernece for calculations"""
  ref = []
  for j, row in data.iterrows():
    med = data[data['datetime'] == row['datetime']]['co2_corrected_avg'].median()
    ref.append(med)
  data['co2_ref'] = ref
  return data


#add helpers
def get_fit(row,slope):
  if slope is not None:
    print(slope)
    _start_x = slope['start_x']
    current_x = calendar.timegm(row['datetime'].timetuple())
    start_x = current_x - _start_x
    offset = float(slope['m']) * start_x + float(slope['b'])
  else:
    offset=None

  return offset

def get_corrected(row,slope,slope_temp):
  _start_x = slope['start_x']
  current_x = calendar.timegm(row['datetime'].timetuple())
  start_x = current_x - _start_x
  offset = float(slope['m']) * start_x + float(slope['b'])

  # for additive
  val = float(row['co2_corrected_avg'])  - offset - slope_temp * float(row['temp'])
  return val


def generate_percentiles(data,time_window):
  temp_window = 1
  # creating empty rows in data frame for tenth percentile data
  data['tenth_percentile_ref'] = None
  data['tenth_percentile'] = None


  print("###### Pre-percentile data")
  print(data.shape)
  print(data.head())
  for j, row in data.iterrows():
    #row_time = datetime.datetime.strptime(row['datetime'],"%Y-%m-%d %H:%M:%S")
    row_time = row['datetime']
    start_time = row_time - datetime.timedelta(hours=time_window / 2)
    end_time = row_time + datetime.timedelta(hours=time_window / 2)

    #     time_index = np.where((data.index>=start_time) & (data.index<=end_time))
    # print(start_time,end_time)
    data_subset = data.loc[(data['datetime'] > start_time) & (data['datetime'] <= end_time)]
    start_T = row['temp'] - temp_window
    end_T = row['temp'] + temp_window

    #TODO: I am think I am getting the tenth percentile wrong 
    temp_index = np.where((data_subset['temp'] >= start_T) & (data_subset['temp'] <= end_T))
    data.loc[j, 'tenth_percentile'] = np.nanpercentile(data_subset.iloc[temp_index]['co2_corrected_avg'], int(10))
    data.loc[j, 'tenth_percentile_ref'] = np.nanpercentile(data_subset.iloc[temp_index]['co2_ref'], int(10))
  return data

def generate_slopes(data, time_window):
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
    #data_subset = data.loc[start_time:end_time, ['temp', 'tenth_percentile', 'tenth_percentile_ref']]

    reg = LinearRegression().fit(np.array(data_subset['temp']).reshape((-1, 1)),
                                     np.array(data_subset['tenth_percentile'] - data_subset['tenth_percentile_ref'],
                                              dtype=float))
    r_sq = reg.score(np.array(data_subset['temp']).reshape((-1, 1)),
                         np.array(data_subset['tenth_percentile'] - data_subset['tenth_percentile_ref'], dtype=float))

    intercept = reg.intercept_
    coef = reg.coef_.tolist()

    # populate our dictionary
    data.loc[j, 'm'] = coef[0]
    data.loc[j, 'b'] = intercept
  return data

def call_measurements(data):

  time_window = 24 * 7 * 3
  data = generate_reference_data(data)
  print(data)
  data= generate_percentiles(data,time_window)
  data = generate_slopes(data, time_window)

  
  print("###### Post percentiles, slopes data")
  print(data.shape)
  print(data.head())
        
  # visualize the temp dependence
  fig, ax = plt.subplots(num=None, facecolor='w', edgecolor='k',figsize=(30, 5))
  ax.plot(data.index,data['m'],"-",label = "temp dependence")
  ax.set_title('Temperature Dependence')
  fig.legend(bbox_to_anchor=(1, 1),bbox_transform=plt.gcf().transFigure,fontsize = 'xx-large')
  plt.show()

  if data is not None and not data.empty:

    slope_temp = np.median(data['m'])

    # for additive
    data['offset_Tcorrected'] = None
    data['offset_Tcorrected'] = data['tenth_percentile'] - slope_temp * data['temp'] - data['tenth_percentile_ref']


    data = data.dropna(subset=['b', 'offset_Tcorrected'])
    #data['datetime'] = data.index.astype('datetime64[ns]')

    print(data.head())

    
    slope = utils.calculate_slope(data, 'offset_Tcorrected', 'datetime')
    print(slope)
    #should the argument be slope
    data['offset_fit'] = data.apply(get_fit, axis=1, args=[slope])

    # visualize the drift
    fig, ax = plt.subplots(num=None, facecolor='w', edgecolor='k',figsize=(30, 5))
    ax.plot(data.index,data['offset_Tcorrected'],"-",label = "Offset")
    ax.plot(data.index,data['offset_fit'],"-",label = "Fit")
    ax.set_title('Off Set Plots')
    fig.legend(bbox_to_anchor=(0.9, 0.9),bbox_transform=plt.gcf().transFigure,fontsize = 'xx-large')
    plt.show()

    print('before changing')
    print(data.head())


    #here we are applying get_corrected to each of the 
    data['co2_corrected_avg_T_drift_applied'] = data.apply(get_corrected, axis=1, args=[slope, slope_temp])

    print("final data display")
    print(data.head())

    #figsize=(30, 5)
    fig, ax = plt.subplots(num=None, facecolor='w', edgecolor='k',figsize=(30, 5))
    ax.plot(data.index,data['co2_corrected_avg_T_drift_applied'],"-",label = "Corrected")
    ax.plot(data.index,data['co2_ref'],"-", label = "CO2 Reference Data")
    ax.plot(data.index,data['co2_corrected_avg'],"-", label = "Original")
    ax.set_title('Original, Reference, Correct CO2 Data')
    fig.legend(bbox_to_anchor=(1, 1),bbox_transform=plt.gcf().transFigure,fontsize = 'xx-large')
    plt.show()

    # utils.save_calculated_data(data,'node_file_id','co2_corrected_avg_T_drift_applied', 'co2_corrected_t')

  #why there only 5 rows
  return data
  

def make_pretty_graphs():
  data = pd.read_csv("corrected_avg.csv")
  fig, ax = plt.subplots(num=None, facecolor='w', edgecolor='k',figsize=(30, 5))
  ax.plot(data.index,data['co2_corrected_avg_T_drift_applied'],"-",label = "Corrected")
  fig.legend(bbox_to_anchor=(1, 1),bbox_transform=plt.gcf().transFigure,fontsize = 'xx-large')
  plt.show()



 




if __name__ == "__main__":
  #df = clean_data(get_data())
  #print(df)
  #print(generate_reference_data(df))
  #final_df = call_measurements(df)
  #final_df.to_csv("corrected_avg.csv", encoding='utf-8', index=False)
  make_pretty_graphs()
  









