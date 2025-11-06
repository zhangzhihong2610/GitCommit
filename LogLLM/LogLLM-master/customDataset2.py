import pandas as pd
file_path = r'D:\proj\LogLLM\data\BGL\test.csv'
df = pd.read_csv(file_path)
indexs = list(df.query('Label==1').index)
log_content= []
for i in indexs:
    # print('Anomalous window', i+1, ', starts from line', i*100,'and ends to line ', (i+1)*100)
    # print('Full log as follows: ')
    # print(df['Content'][i].split(' ;-; '))
    log_content.append(df['Content'][i])
print(log_content)