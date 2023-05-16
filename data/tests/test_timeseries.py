
from timeseries import *



##### TESTING DATA

#get all of the values in the node column
nodes = sensor_data["Node ID"].values
ranges = ["day","week","month","all"]


def test_all_inputs():
    fail_dict = {}

    for node in nodes:
        for date in ranges:
            try: 
                output = generate_data(date,node,sensor_data)
                print(output)
                if output.empty:
                    fail_dict[node] = date
            except:
                print("Something went wrong with node: " + str(node) + " and for range:  " + str(date))
                fail_dict[node] = date
    return fail_dict

def test_report(fail_dict):
    failure_compiled = []

    for node in fail_dict.keys():
        location = sensor_data[sensor_data["Node ID"] == node]["Location"].values[0]
        failure_str = "Node: " + str(node) + " at " + location + " failed for range: " + fail_dict[node]
        failure_compiled.append(failure_str)
        print(failure_str)
    return failure_compiled

def mine_failures():
    i = 0
    super_compile_failures = []
    while i < 100:
        fail_dict = test_all_inputs()
        super_compile_failures.append(test_report(fail_dict))
        i += 1
    return super_compile_failures

#test_all_inputs()


#### test week 
def test_week():
    report = {"node":[],"min":[],"max":[]}
    for node in nodes:
        # request data for a week, print out the dates includes
        week_data = generate_data("week",node,sensor_data)
        report["node"].append(node)
        print(node)
        if not(week_data.empty):
            #get the min and max from the week
            report["min"].append(week_data["datetime"].min())
            report["max"].append(week_data["datetime"].max())
        else:
            report["min"].append(-1)
            report["max"].append(-1)
    return report 

# print(test_week())

#turn into a dataframe
# df = pd.DataFrame.from_dict(test_week())

# print(df)

# #save into a csv in test folder
# df.to_csv("data/tests/test_week.csv")

#### test month

def test_month():
    report = {"node":[],"min":[],"max":[]}
    for node in nodes:
        # request data for a week, print out the dates includes
        month_data = generate_data("month",node,sensor_data)
        report["node"].append(node)
        print(node)
        if not(month_data.empty):
            #get the min and max from the week
            report["min"].append(month_data["datetime"].min())
            report["max"].append(month_data["datetime"].max())
        else:
            report["min"].append(-1)
            report["max"].append(-1)
    return report 

# print(test_month())

# #turn into a dataframe
# df = pd.DataFrame.from_dict(test_month())

# print(df)

# #save into a csv in test folder
# df.to_csv("data/tests/test_month.csv")


#### test all

def test_all():
    report = {"node":[],"min":[],"max":[]}
    for node in nodes:
        # request data for a week, print out the dates includes
        all_data = generate_data("all",node,sensor_data)
        report["node"].append(node)
        print(node)
        if not(all_data.empty):
            #get the min and max from the week
            report["min"].append(all_data["datetime"].min())
            report["max"].append(all_data["datetime"].max())
        else:
            report["min"].append(-1)
            report["max"].append(-1)
    return report

print(test_all())

# #turn into a dataframe
df = pd.DataFrame.from_dict(test_all())

print(df)

# #save into a csv in test folder
df.to_csv("data/tests/test_all.csv")    


