
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

test_all_inputs()