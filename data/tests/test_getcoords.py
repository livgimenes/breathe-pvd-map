from datetime import datetime, timedelta
import pytz
import pandas as pd

def pst_to_est(pst_time_str):
    # Create a timezone object for PST
    pst_timezone = pytz.timezone('US/Pacific')
    
    # Convert the input time string to a datetime object in PST
    pst_time = datetime.strptime(pst_time_str, '%Y-%m-%d %H:%M:%S')
    pst_time = pst_timezone.localize(pst_time)
    
    # Convert the PST datetime to EST
    est_timezone = pytz.timezone('US/Eastern')
    est_time = pst_time.astimezone(est_timezone)
    
    # Format the EST datetime as a string
    est_time_str = est_time.strftime('%Y-%m-%d %H:%M:%S')
    
    return est_time_str

pst_time_str = '2023-05-11 19:42:00'
est_time_str = pst_to_est(pst_time_str)
print(f'PST time: {pst_time_str}')
print(f'EST time: {est_time_str}')


### Read from the csv and check out the data




