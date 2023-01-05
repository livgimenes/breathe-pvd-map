"""
The following includes scripts for calibration of beacon nodes.


"""
try:
    from django.db import connection
except ModuleNotFoundError:
    print('django.db not found')



import pandas as pd
import numpy as np
import math
import calendar
import datetime

import types
import requests

from inspect import getframeinfo, stack


def calculate_slope(avg_row,x,y,coverage_col=False, local=False, verbose=False):
    verbose=2
    if verbose>0:
        print("calculate_slope", avg_row,x,y)

    # Calculate the sums - creating multiple arrays for each serial number encountered
    arr = {'x': [], 'y': [], 'x2': [], 'y2': [], 'xy': [], 'dates': [], 'coverage': []}
    x_start = None
    for index,avg in avg_row.iterrows():
        val = avg[x]
        if isinstance(val, (np.floating, float)) and not np.isnan(val) and val != None and val != "-999" and val != -999.0:
            if not x_start:
                x_start = calendar.timegm(avg[y].timetuple())

            # populate the object for slope calculation
            _datetime = calendar.timegm(avg[y].timetuple()) - x_start
            arr['x'].append(_datetime)
            arr['y'].append(val)
            arr['x2'].append(_datetime * _datetime)
            arr['y2'].append(val * val)
            arr['xy'].append(_datetime * val)
            arr['dates'].append(avg[y])
            # also consider the coverage
            if coverage_col:
                arr['coverage'].append(avg[coverage_col])

    if verbose > 1:
        print("needs to be larger than 0 is {}".format(len(arr['x'])))
    if len(arr['x']) > 1 and arr['x'][1] ==0:
        print("the second value should not be zero it's *not*. Likely overlapping data")

    if len(arr['x']) > 1 and arr['x'][1] != 0:
        residuals = []
        coverage_count = 0
        coverage = 0
        ##
        g = arr
        x = sum(g['x'])
        y = sum(g['y'])
        x2 = sum(g['x2'])
        y2 = sum(g['y2'])
        xy = sum(g['xy'])
        n = len(g['x'])

        if verbose > 1:
            print(x, y, n)
        # calculate the slope (m) and y-intercept (b)

        m = round((n * xy - (x * y)) / (n * x2 - x * x), 13)
        b = round((y - m * x) / n, 13)
        # calculate regression
        top = n * xy - x * y
        bottom = ((n * x2 - x * x) * (n * y2 - y * y))

        if verbose > 1:
            print(m, b, top,bottom)
        if bottom != 0:
            r2 = top * top / bottom
            version = 2# each slope has an version lending to it's uniqueness

            #####
            # rmse - store difference between predicted value vs actual value
            # loop over all the values to see how we faired
            for j in range(len(g['x'])):
                y_offset = m * g['x'][j] + b

                residuals.append(g['y'][j] - y_offset)

            # take all the residuals squared and add together
            r_sum = 0
            for r in residuals:
                r_sum += r * r
            rmse = math.sqrt(r_sum / (len(residuals) - 1))

            # get the starting value
            start_x = calendar.timegm(g['dates'][0].timetuple())
            slope = {"m": m, "b": b, "r2": r2, "start_x": start_x,
                     "start": g['dates'][0], "end": g['dates'][len(g['dates']) - 1], "rmse": rmse, "n": n}

            # calculate an indication of coverage - count of measure above 75% / total
            if len(residuals) > 0 and coverage_col:
                # the average  of all the coverages for the windows (number of values vs the length of time
                # lets use the number of hours
                start_date= arr['dates'][0]
                end_date = arr['dates'][-1]
                diff =  end_date - start_date

                slope['overall_coverage'] = len(arr['y']) / (diff.days*24 + diff.seconds // 3600)
                # beacon up-time
                slope['avg_coverage'] = sum(arr['coverage']) / len(arr['coverage'])
            #######

            return slope
        return None

# from utils
def save_slope(id,type,measure_id,base_measure, adjusted_measure,slope,local=False,verbose=False,slope_id=False,deployment_id=False):
    print("save_slope",slope)
    """
    Called from alphasense ratio and mlr calibration
    The purpose is to commit to the database slopes which can be later used to apply to data
    These slopes will assist with determining whether a calibration was applied effectively (ie. rmse and r2)
    :param id: the node_id
    :param type: 's'  # for sensitivity 'o' for offset
    :param base_measure:
    :param adjusted_measure:
    :param slope:
    :param local:
    :param verbose:
    :return:
    """

    # print(slope)
    b = slope["b"]

    if 'm' in slope:
        m = slope["m"]

    if "m2" in slope:
        m2 = slope["m2"]
    else:
        m2 = "NULL"

    r2 = slope["r2"]
    start_x = slope["start_x"]


    rmse = slope["rmse"]
    start = slope["start"]
    end = slope["end"]
    n = slope["n"]

    version=1
    overall_coverage="NULL"
    if 'overall_coverage' in slope:
        overall_coverage = slope["overall_coverage"]

    avg_coverage="NULL"
    if 'avg_coverage' in slope:
        avg_coverage = slope["avg_coverage"]

    if adjusted_measure != '':
        deployment_id1, adjusted_measure_id = get_deployment(id, adjusted_measure, start,local,verbose)  # _intermediate or _corrected
    else:
        adjusted_measure_id = 'NULL'

    if deployment_id ==False:
        deployment_id=deployment_id1

    if base_measure != '':
        # use different deployment variable since  'col10 - col11' can't be resolved
        deployment_id2, base_measure_id = get_deployment(id, base_measure, start,local,verbose) # either wrk-aux or _intermediate
    else:
        base_measure_id = 'NULL'

    if base_measure_id is None:
        base_measure_id = 'NULL'
    if adjusted_measure_id is None:
        adjusted_measure_id = 'NULL'

    ref_id='NULL'
    if "ref_id" in slope:
        ref_id=slope["ref_id"]

    # when recalculating always change the status to pending
    status='p'

    if deployment_id is not None:


        if slope_id:
            # instead of potentially inserting use and update to retain existing
            update_sql = """UPDATE beacon_sensor_drift SET m={m},m2={m2},b={b},r2={r2},start_x={start_x},
                                    last_updated=now(),status='{status}',start_date='{start}',end_date='{end}',
                                    rmse={rmse},n={n},ref_id={ref_id},change_date=now(),overall_coverage={overall_coverage},avg_coverage={avg_coverage},last_applied=Null
                                    where id={id};\n""".format(m=m,m2=m2, b=b, r2=r2, version=version, start_x=start_x,status=status,
                                                               measure_id=measure_id,
                                                               deployment_id=deployment_id,
                                                               start=start,
                                                               end=end, rmse=rmse,
                                                               overall_coverage=overall_coverage,
                                                               avg_coverage=avg_coverage,
                                                               n=n, type=type, id=slope_id,ref_id=ref_id)
        else:
            update_sql = "Insert into beacon_sensor_drift (m,m2,b,r2,version,start_x,measure_id,adjusted_measure_id,base_measure_id,deployment_id,last_updated,status,start_date,end_date,rmse,overall_coverage,avg_coverage,n,change_date,type,ref_id) " \
                         "VALUES({m},{m2},{b},{r2},{version},{start_x},{measure_id},{adjusted_measure_id},{base_measure_id},{deployment_id},now(), '{status}','{start}','{end}',{rmse},{overall_coverage},{avg_coverage},{n},now(),'{type}',{ref_id}) ON CONFLICT(deployment_id, measure_id,version,type,start_date)" \
                         "DO UPDATE SET m={m}, m2={m2},b={b},r2={r2},start_x={start_x},last_updated=now(),status='{status}',start_date=excluded.start_date,end_date=excluded.end_date,rmse={rmse},overall_coverage={overall_coverage},avg_coverage={avg_coverage},n={n},change_date=now(),type='{type}',ref_id={ref_id},last_applied=Null;\n" \
                .format(m=m, m2=m2, b=b, r2=r2, version=version, start_x=start_x,
                        measure_id=measure_id, adjusted_measure_id=adjusted_measure_id, base_measure_id=base_measure_id,
                        deployment_id=deployment_id, status='p',
                        start=start, end=end, rmse=rmse,
                        overall_coverage=overall_coverage, avg_coverage=avg_coverage, n=n, type=type, ref_id=ref_id)

        if verbose > 0:
            print(update_sql)

        print(update_sql)
        if update_sql != "":
            # execute the inserts - note that they will not overwrite existing drifts created for a deployment and measure
            # connection = watcher_database_manager.create_connection(local, verbose)
            with connection.cursor() as cursor:
                cursor.execute(update_sql)
                connection.commit()
    else:
        print("Unable to find deployment id with ",id,type,measure_id,base_measure, adjusted_measure)



def save_calculated_data(_df,_file_id_col,_col1,_name1,_col2=False,_name2=False, local=False, verbose=False):
    """
     Save data to the database
    Loops over all the records and creates sql updates
    :param df: a dataframe containing a datetime and values
    :param _col1: the dataframe column name where the data is stored
    :param _name1: the database column name for where the data is to be saved
    :param _col2: (optional)
    :param _name2: (optional)
    :return:
    """

    _df.dropna(subset=[_col1],inplace=True)
    if _col2 is not False:
        _df.dropna(subset=[_col2], inplace=True)

    update_sql = ""

    table="node_file_data_avg_60"

    for index, row in _df.iterrows():
        set_str=_name1+"="+str(row[_col1])
        if _name2:
            set_str +=","+_name2+"="+str(row[_col2])

        update_sql += "UPDATE {table} SET  {set_str}  WHERE  node_file_id = {node_file_id} and datetime='{datetime}';\n".format(
            table=table, datetime=index, node_file_id=row[_file_id_col], set_str=set_str)
    print(update_sql)
    # execute sql update_sql
    if update_sql != "":
        breakup_sql_query(update_sql, local, verbose)

def breakup_sql_query(sql, local=False, verbose=False):
    """
    The following takes an sql query and splits it up so that no more than a certain number are submitted at one
    :return:
    """
    sql_list=sql.rstrip().split(';')
    counter = 0
    executed=0
    sql = ""
    print("THERE ARE {} updates".format(len(sql_list),))
    for i in sql_list:
        # get the file id
        counter += 1
        sql += i+"; "

        if counter == 3000:
            print("About to execute",counter)
            commit_sql(sql, local, verbose)
            executed+=counter
            sql = ""
            counter = 0
    # execute any remaining sql commands
    commit_sql(sql, local, verbose)


def commit_sql(_sql,local, verbose):
    if _sql != "":
        with connection.cursor() as cursor:
            try:
                cursor.execute(_sql)
                connection.commit()
            except Exception as e:
                print(_sql+" did not execute!")
                print(e)
                pass

# from data_listen except lower(sensor_measure)
def get_deployment(node_id,ref_col,date=False,local=False, verbose=False):
    print("getting the deployment")
    #allow multiple ref cols
    ps = ref_col.split(',')
    extra = ""
    for i in range(len(ps)):
        extra += "lower(sensor_measure) = '" + ps[i] + "' "
        if i < len(ps) - 1:
            extra += " or "

    select_sql =""" select beacon_sensor_deployment.id as deployment_id,serial_number, start_date,end_date, array_agg(DISTINCT lower(sensor_measure)),beacon_sensor_measure.id as beacon_sensor_measure_id from beacon_sensor_deployment
           inner join beacon_sensor on  beacon_sensor.id = beacon_sensor_deployment.sensor_id
           inner join beacon_sensor_measure on  beacon_sensor_measure.sensor_type_id =beacon_sensor.sensor_type_id
           where node_id = %s and  (%s)
           group by beacon_sensor_deployment.id,serial_number, start_date,end_date,beacon_sensor_measure_id
           order by start_date""" % (node_id, extra)
    if verbose > 1:
        print(select_sql)

    with connection.cursor() as cursor:
        cursor.execute(select_sql)
        rows = dictfetchall(cursor)
        if rows:
            for row in rows:
                if verbose > 1:
                    print(row)

                #check if our deployment falls within a deployment range
                #make sure we have an end date
                if not row['end_date']:
                    row['end_date'] = datetime.date.today() + datetime.timedelta(days=1)

                if not row['start_date']:
                    row['start_date'] = datetime.date(2012, 1, 1)

                if date:
                    # we are just looking for the last deployment id
                    if row['start_date'] and row['end_date'] and row['start_date'] <= date.date() < row['end_date']:
                        return row['deployment_id'], row['beacon_sensor_measure_id']

                # and modify the date for comparison with a datetime
                row['start_date'] = datetime.datetime.combine(row['start_date'], datetime.datetime.min.time())
                row['end_date'] = datetime.datetime.combine(row['end_date'], datetime.datetime.min.time())
        if not date:
            return rows
    return None, None


#get the approvals for pollutant(s) - takes the deployments then adds the associated approvals
def get_deployment_approvals(node_id,pollutants,show_excluded=False):
    print("get_deployment_approvals",node_id,pollutants)
    #one or more pullutants to be checked
    ps = pollutants.split(',')
    extra =""
    for i in range(len(ps)):
        extra+= "lower(sensor_measure) = '"+ps[i]+"' "
        if i < len(ps)-1:
            extra += " or "


    with connection.cursor() as cursor:
        sql = """
           select beacon_sensor_deployment.id,serial_number, start_date,end_date, array_agg(DISTINCT lower(sensor_measure)) from beacon_sensor_deployment
           inner join beacon_sensor on  beacon_sensor.id = beacon_sensor_deployment.sensor_id
           inner join beacon_sensor_measure on  beacon_sensor_measure.sensor_type_id =beacon_sensor.sensor_type_id
           where node_id = %s and  (%s)
           group by beacon_sensor_deployment.id,serial_number, start_date,end_date
           order by start_date
           """ % (node_id, extra)

        print(sql)
        cursor.execute(sql)
        rows = dictfetchall(cursor)
        approvals_array = []
        # manually add all the approvals

        for row in rows:
            # allow exception to show -333 aprovals
            extra = "and quality_level != '-333'"
            if show_excluded:
                extra = ""

            sql_approvals = """
               Select beacon_sensor_data_approval.*, sensor_measure from beacon_sensor_data_approval
               inner join beacon_sensor_measure on  beacon_sensor_measure.id =beacon_sensor_data_approval.measure_id
               where deployment_id = %s %s and lower(sensor_measure) = ANY ('{%s}')
               """%(row['id'], extra,",".join(row["array_agg"]))

            # print("sql_approvals",sql_approvals)
            with connection.cursor() as cursor:
                cursor.execute(sql_approvals)
                approvals = dictfetchall(cursor)
                #
                if len(approvals):
                    for a in approvals:
                        # find a matching location and inject it's details
                        if a['start_date']:
                            a['start_date'] = a['start_date'].replace(tzinfo=None)
                        if a['end_date']:
                            a['end_date'] = a['end_date'].replace(tzinfo=None)
                        else:
                            a['end_date'] = datetime.datetime.now()
                        approvals_array.append(a)


        return approvals_array

    return None

def dictfetchall(cursor):
    "Returns all rows from a cursor as a dict"
    # Need to inject calculation for
    desc = cursor.description
    return [
            dict(zip([col[0] for col in desc], row))
            for row in cursor.fetchall()
    ]

def remove_values_between(node_id, table, _variables, start, end):
    """
    for a clean sweep of the data start by removing the existing values for the period
    :param node_id:
    :param table:
    :param variable: a list of variables
    :param start:
    :param end:
    :return:
    """
    variables=""
    for v in _variables:
        variables+=v+"=Null,"

    variables=variables[:-1]

    sql ="""Update {table} set {variables}
        where node_folder_id= ANY (
        select node_folder_id from node_folder
        inner join beacon_node on beacon_node.id =node_id
        WHERE node_type = 'b' and node_id={node_id} 
        and datetime between '{start}' and '{end}'
        ) """.format(table=table,node_id=node_id,variables=variables,start=start, end=end)

    print(sql)
    with connection.cursor() as cursor:
        cursor.execute(sql)
        connection.commit()

def calculate_night_percentile(node_id,start_date,end_date ,_measure,_dest_var, verbose=False):
    """
    load the data for the period and generate an offset variable saved with the node
    called automatically when trying to generate an offset slope calibration
    Note: this works based on the minute data having a no_intermediate value saved

    :param node_id:
    :param start_date:
    :param end_date:
    :param _measure:
    :param _dest_var:
    :param verbose:
    :return:
    """
    SAVE_PERCENTILE = True
    table = "node_file_data_avg_1"

    # start by selecting all the minute data for the period
    avg_sql = get_sql_data_night_select( _measure,table,node_id,start_date,end_date)
    print(avg_sql)
    _df_sub = None
    with connection.cursor() as cursor:
        cursor.execute(avg_sql)

        _df_sub = pd.DataFrame(cursor.fetchall(), columns=[column[0] for column in cursor.description])


    if _df_sub is not None and not _df_sub.empty:

        # Aug 7th 2020 check that there is data
        _df_sub.dropna(subset=[_measure], inplace=True)
        if _df_sub.empty:
            print("There were no minute data values saved !!!")
            return


        # set datetime as index for use with timeseries functions
        # note we are able to use datetime instead of 'local_timestamp' because this data is alrady filtered using the localized time conversion
        _df_sub['datetime'] = _df_sub['datetime'].astype('datetime64[ns]')
        _df_sub = _df_sub.set_index('datetime')
        ## START OF COPY FROM def get_no_offset in generate_ratio_calibration.py
        # we are grouping by day
        day_avgs = _df_sub.groupby(pd.Grouper(freq='D'))[_measure].quantile(.1)

        # generate month range moving window,
        month_avg = day_avgs.rolling('30D').quantile(.1)# using 10th percentile not median

        #save the data to the no_offset value
        if SAVE_PERCENTILE:
            # to conform to the structure, each offset value must be stored in the hour table
            # this allows it to be inspected and slope fitted using the standard method used with CO2
            # we have grouped by day then averaged by month so we'll need to associate with nearest hour for each
            # lets load in the available hour for the time and set the no_offset value for the closest one
            table = "node_file_data_avg_60"
            avg_sql = get_sql_data_night_select(None, table, node_id, start_date, end_date)
            df=None
            with connection.cursor() as cursor:
                cursor.execute(avg_sql)

                df = pd.DataFrame(cursor.fetchall(), columns=[column[0] for column in cursor.description])

            # todo remove -333 -999 -666 values!

            if df is not None and not df.empty:
                print("Looking to save to df ")
                print(df.head())

                # convert to dataframe

                if not isinstance(month_avg, pd.DataFrame):
                    # convert to dataframe if not already - most likely a series
                    month_avg = month_avg.to_frame()

                print(" here's month_avg")
                print(month_avg.head())
                # since we average by day convert to date instead of date time

                month_avg.index = month_avg.index.astype('datetime64[ns]').date
                month_avg['datetime'] = month_avg.index

                # now take each of the month_avg values and inset the closest time and file_id from the hour table
                month_avg=match_on_time(month_avg,df)

                remove_values_between(node_id, "node_file_data_avg_60", [_dest_var],
                                      start_date, end_date)
                save_calculated_data(month_avg, 'node_file_id_new', _measure, _dest_var)
            else:
                print("ERROR no PERCENTILE data to save",_dest_var)

def match_on_time(month_avg,df):
    """
    Take the minute table and match to the hour one
    :param month_avg: minute table series
    :param df:hour table dataframe
    :return: dataframe with hours to be saved
    """

    month_avg["node_file_id_new"] = np.nan
    month_avg["datetime_new"] = np.nan


    # now reset the index so we can access data using iloc
    # note this move the datetime into it's own column
    if "datetime" not in month_avg:
        month_avg.reset_index(inplace=True)

    is_datetime = False
    # check the first item to see if we are working with datetime object
    if isinstance(month_avg['datetime'].iloc[0], datetime.datetime):
        is_datetime = True
    else:
        print("WE ARE WORKING WITH DATES not DATETIME")

    # now set two values in the dataframe
    for index, row in month_avg.iterrows():
        for i, r in df.iterrows():
            date =  row["datetime"]
            if is_datetime:
                date= row["datetime"].date()

            if  date == r["datetime"].date():
                # note that we may have a date object (match on day) or a datetime object (match on hour)
                if not is_datetime or row["datetime"].hour== r["datetime"].hour:
                    # set the file id for the row

                    month_avg.at[index, "node_file_id_new"] = r["node_file_id"]
                    # set the date time
                    month_avg.at[index, "datetime_new"] = r["datetime"]
                    break
    # there maybe multiple minute values matched to the hour - remove duplicate hours
    month_avg.drop_duplicates(subset="node_file_id_new", inplace=True)


    # remove values not able to be associated
    month_avg.dropna(subset=['datetime_new'], inplace=True)
    # convert to type int as node_file_id_new should not have a decimal
    month_avg["node_file_id_new"] = month_avg["node_file_id_new"].astype(int)

    month_avg.index = month_avg['datetime_new']
    print(month_avg.head())
    return month_avg

def get_sql_data_night_select(_measure,table,node_id,start_date,end_date):
    """
    returns values between 12AM and 3 AM
    :param _measure:
    :param table:
    :param node_id:
    :param start_date:
    :param end_date:
    :return: an sql string
    """
    return get_data_time_selection(_measure,table,node_id,start_date,end_date,0,2)

def get_sql_data_afternoon_select(_measure,table,node_id,start_date,end_date):
    """
    returns values between 12PM and 3 PM
    :param _measure:
    :param table:
    :param node_id:
    :param start_date:
    :param end_date:
    :return: an sql string
    """
    return get_data_time_selection(_measure,table,node_id,start_date,end_date,12,14)

def get_data_time_selection(_measure,table,node_id,start_date,end_date,s_hour,e_hour):
    extra = ""
    # allow for optional data request

    if _measure:
        extra = _measure + ","
    # todo need to consider the time zone of the nodes not in the bay area
    # todo need to clear out value which might be masked out.
    return """Select {extra} datetime,{table}.node_file_id
        from {table} 
        Inner join node_folder on node_folder.node_folder_id = {table}.node_folder_id 
        Inner join beacon_node on beacon_node.id=node_folder.node_id 
        Where 

        node_file_id = ANY (select node_file_id from node_file  tbl
                            Inner join node_folder on node_folder.node_folder_id = tbl.node_folder_id
                            Inner join beacon_node on beacon_node.id=node_folder.node_id
                            Where  tbl.start_time >= node_folder.deployed  AND beacon_node.id = {node_id}
                            AND tbl.start_time between 
        					--start of hour
        					to_timestamp('{start_date}', 'YYYY-MM-DD HH24')
        					and '{end_date}'
                            AND  (node_folder.end is NULL OR tbl.end_time <= node_folder.end)
                            )
        and extract(hour from (datetime AT TIME ZONE 'UTC') AT TIME ZONE 'America/Los_Angeles') between {s_hour} and {e_hour}

        Order By datetime;""".format(
        extra=extra, table=table, node_id=node_id, start_date=start_date, end_date=end_date,s_hour=s_hour,e_hour=e_hour
    )

# for database
def _get_level(_datetime,_approvals):
    # get the temp group
    for i in _approvals:

        if i["start_date"] < _datetime < i["end_date"]:
            return i["quality_level"]
    # assume it's good until we have run 'detect broken sensors'
    return str("1") # default 1



# create a standard wa to access all the tables from the interval parme
def get_table(interval):
    table = 'node_file_data_avg_' + interval
    if interval == str(-1):
        table = 'node_file_data'
    return table

def get_variables():
    with connection.cursor() as cursor:
        cursor.execute("""select id, data_column,lower(sensor_measure) from beacon_sensor_measure""")
        return cursor.fetchall()

def get_col_name_from_id(_variables,id):
    for v in _variables:
        if v[0]==id:
            return v[1]

def get_item_from_id(_variables,id):
    """
    :param _variables:
    :param id:
    :return: a col as var statement for use in database select - able to support compound columns i.e col10 - col11
    """
    for v in _variables:
        if v[0]==id:
            return v

def get_var_col_name_from_id(_variables,id):
    """

    :param _variables:
    :param id:
    :return: a col as var statement for use in database select - able to support compound columns i.e col10 - col11
    """
    for v in _variables:
        if v[0]==id:
            return v[1]+" as "+v[2]


def get_last_node_column_record(node_id, col, local=False, verbose=False, table=False):
    """

    :param node_id:
    :param col: the actual table column
    :param local:
    :param verbose:
    :param table:
    :return:
    """
    verbose =1

    if table == False:
        table = 'node_file_data_avg_60'

    with connection.cursor() as cursor:
        sql = """select datetime from {table} tbl
            Inner join node_folder on node_folder.node_folder_id = tbl.node_folder_id
            Inner join beacon_node on beacon_node.id=node_folder.node_id
            Where beacon_node.id = {node_id} and {col} is not Null
            ORDER BY datetime DESC LIMIT 1;""".format(table=table, node_id=node_id, col=col)

        if verbose>0:
            print(sql)

        cursor.execute(sql)
        return cursor.fetchone()

# https://www.oreilly.com/library/view/python-cookbook/0596001673/ch15s03.html
# https://stackoverflow.com/questions/55905240/python-dynamically-import-modules-code-from-string-with-importlib
def import_code(code, name):
    # create blank module
    module = types.ModuleType(name)
    # populate the module with code
    print("import_code init...")
    exec(code, module.__dict__)
    return module


# https://stackoverflow.com/questions/24438976/python-debugging-get-filename-and-line-number-from-which-a-function-is-called
def log_print(_table,_id,_col,_stack,*_msg):
    """
    makes a record in the database associated with a row id

    :param _table: db table
    :param _id: table id
    :param _col: column
    :param _msg: the message, could an anything since we are saving to an XML output
    :param _stack: The number of jumps back to determine the calling function
    :return:
    """
    caller = getframeinfo(stack()[_stack][0])
    print("save to",_table,_id,_col)
    print ("%s:%d - %s" % (caller.filename, caller.lineno, _msg))
    # adjust the message to support saving as json

    # _msg = " ".join(str(x) for x in _msg)
    temp_msg=""
    was_bytes=False
    for x in _msg:
        for m in x:
            try:
                m = m.decode('utf-8')
                was_bytes=True
            except:
                pass
            print("are message part is...")
            print(m)
            m = str(m).replace("'", "''").replace('"', '\\"')

            # leave in the breaks if was bytes
            if not was_bytes:
                m= m.replace('\n', '<br/>').replace('\r', '<br/>')
            else:
                m = m.replace('\n', '\\n').replace('\r', '\\n')

            temp_msg+=" "+m
    _msg=temp_msg



    json="""[{{"datetime":"{_datetime}", "msg":"{_msg}", "filename":"{filename}","lineno":{lineno} }}]""".format(_datetime=datetime.datetime.now(tz=None),filename=caller.filename,lineno=caller.lineno,_msg=_msg)

    update_sql= """
    UPDATE {_table}
    SET {_col} = {_col} || '{json}'
    where id={_id};
    """.format(_table=_table,_id=_id,_col=_col,json=json)
    print(update_sql)
    with connection.cursor() as cursor:
        cursor.execute(update_sql)
        connection.commit()


def log_print_cal(_id, *_msg):
    """
    Add log information to the calibration
    All we need is the id since we know the
    _table,_col
    :param _id:
    :param msg:
    :return:
    """
    log_print("beacon_sensor_drift", _id, "log",2, _msg)

def get_data(node_id,_measure,start_date,end_date,flag_variable):
    # base_url = "{0}://{1}".format(request.scheme, request.get_host())
    base_url ="http://128.32.208.8"

    print("base_url",base_url)

    return get_data_from_url(
        base_url + get_data_url(node_id, _measure, start_date, end_date,
                                flag_variable))
    # return get_data_from_url(base_url+get_data_url(row["node_id"], row["base_measure"] + "," + extra_measure, start_date, end_date,flag_measure))

def get_data_url(node_id,_measure,start_date,end_date,flag_variable):
    url = ("/node/" + str(
    node_id) + "/measurements_all/csv?name=&interval=60&variables=" + _measure + "&start=" + str(
    start_date) + "&end=" + str(end_date) + "&variable_level_id=" + flag_variable).replace(" ", "%20")

    print(url)
    return url

def get_data_from_url(url):
    response = requests.get(url)
    return response.text