#see https://pinjiahe.github.io/papers/ISSRE16.pdf
import os
import pandas as pd
import re
from datetime import datetime

def fixedSize_window(raw_data, window_size, step_size):
    aggregated = [
        [raw_data['Content'].iloc[i:i + window_size].values,
        max(raw_data['Label'].iloc[i:i + window_size]),
         raw_data['Label'].iloc[i:i + window_size].values.tolist()
         ]
        for i in range(0, len(raw_data), step_size)
    ]
    return pd.DataFrame(aggregated, columns=list(raw_data.columns)+['item_Label'])



def sliding_window(raw_data, para):
    """
    split logs into time sliding windows
    :param raw_data: dataframe columns=[timestamp, label, time duration, content]
    :param para:{window_size: seconds, step_size: seconds}
    :return: dataframe
    """
    log_size = raw_data.shape[0]
    label_data, time_data = raw_data.iloc[:, 1], raw_data.iloc[:, 0]
    deltaT_data = raw_data.iloc[:, 2]
    content= raw_data.iloc[:, 3]

    new_data = []
    start_end_index_pair = set()

    start_time = time_data[0]
    end_time = start_time + para["window_size"]
    start_index = 0
    end_index = 0

    # get the first start, end index, end time
    for cur_time in time_data:
        if cur_time < end_time:
            end_index += 1
        else:
            break

    start_end_index_pair.add(tuple([start_index, end_index]))

    # move the start and end index until next sliding window
    num_session = 1
    while end_index < log_size:
        start_time = start_time + para['step_size']
        end_time = start_time + para["window_size"]
        for i in range(start_index, log_size):
            if time_data[i] < start_time:
                i += 1
            else:
                break
        for j in range(end_index, log_size):
            if time_data[j] < end_time:
                j += 1
            else:
                break
        start_index = i
        end_index = j

        # when start_index == end_index, there is no value in the window
        if start_index != end_index:
            start_end_index_pair.add(tuple([start_index, end_index]))

        num_session += 1
        if num_session % 1000 == 0:
            print("process {} time window".format(num_session), end='\r')

    for (start_index, end_index) in start_end_index_pair:
        dt = deltaT_data[start_index: end_index].values
        dt[0] = 0
        new_data.append([
            time_data[start_index: end_index].values,
            max(label_data[start_index:end_index]),
            dt,
            content[start_index: end_index].values,
            label_data[start_index:end_index].values.tolist(),
        ])

    assert len(start_end_index_pair) == len(new_data)
    print('there are %d instances (sliding windows) in this dataset\n' % len(start_end_index_pair))
    return pd.DataFrame(new_data, columns=list(raw_data.columns)+['item_Label'])

def log_to_dataframe(log_file, regex, headers, start_line, end_line):
    """ Function to transform log file to dataframe
    """
    log_messages = []
    linecount = 0
    cnt = 0

    if end_line is None:
        with open(log_file, 'r', encoding='latin-1') as fin:  # , encoding='latin-1'
            while True:
                line = fin.readline()
                if not line:
                    break
                # for line in fin.readlines():
                cnt += 1
                try:
                    match = regex.search(line.strip())
                    message = [match.group(header) for header in headers]
                    log_messages.append(message)
                    linecount += 1
                except Exception as e:
                    # print("\n", line)
                    # print(e)
                    pass

    else:
        line_pos = -1
        with open(log_file, 'r', encoding='latin-1') as fin:
            while True:
                line = fin.readline()
                line_pos += 1
                if line_pos < start_line:
                    continue
                if not line or line_pos >= end_line:
                    break
                cnt += 1
                try:
                    match = regex.search(line.strip())
                    message = [match.group(header) for header in headers]
                    log_messages.append(message)
                    linecount += 1
                except Exception as e:
                    # print("\n", line)
                    # print(e)
                    pass

    print("Total size is {}; Total size after encoding is {}".format(linecount, cnt))
    logdf = pd.DataFrame(log_messages, columns=headers)
    return logdf

def generate_logformat_regex(logformat):
    """ Function to generate regular expression to split log messages
    """
    headers = []
    splitters = re.split(r'(<[^<>]+>)', logformat)
    regex = ''
    for k in range(len(splitters)):
        if k % 2 == 0:
            splitter = re.sub(' +', '\\\s+', splitters[k])
            regex += splitter
        else:
            header = splitters[k].strip('<').strip('>')
            regex += '(?P<%s>.*?)' % header
            headers.append(header)
    regex = re.compile('^' + regex + '$')
    return headers, regex

def structure_log(input_dir, output_dir, log_name, log_format,  start_line = 0, end_line = None):
    print('Structuring file: ' + os.path.join(input_dir, log_name))
    start_time = datetime.now()
    headers, regex = generate_logformat_regex(log_format)
    df_log = log_to_dataframe(os.path.join(input_dir, log_name), regex, headers, start_line, end_line)

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    df_log.to_csv(os.path.join(output_dir, log_name + '_structured.csv'), index=False, escapechar='\\')

    print('Structuring done. [Time taken: {!s}]'.format(datetime.now() - start_time))
