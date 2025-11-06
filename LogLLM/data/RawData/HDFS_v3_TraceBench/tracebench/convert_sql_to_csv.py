import re
import numpy as np
import glob, os, sys
import csv
from os.path import basename

para = {
    'path': './mtracer-TraceBench-44b29e5/'
}

def sql2csv(para):
    sqlFilelist = glob.glob(para['path'] + "*.sql")
    fileNum = len(sqlFilelist)
    print('Total number of sql files: %d'%(fileNum))
    for filePath in sqlFilelist:
        fileName = os.path.splitext(os.path.basename(filePath))[0]
        print(fileName)
        outputFolder =  './tracebench/'+ fileName +'/'	
        outputFileName = ['edge','operation','event','trace']
        templates = ['.*INSERT INTO `Edge` VALUES.*',
        '.*INSERT INTO `Operation` VALUES.*',
        '.*INSERT INTO `Report` VALUES.*',
        '.*INSERT INTO `Task` VALUES.*']
    
        outputList=[[['TaskID', 'FatherTID', 'FatherStartTime', 'ChildTID']], 
                    [['OpName', 'Num', 'MaxDelay', 'MinDelay', 'AverageDelay']], 
                    [['TaskID', 'TID', 'OpName', 'StartTime', 'EndTime', 'HostAddress', 'HostName', 'Agent', 'Description']], 
                    [['TaskID', 'Title', 'NumReports', 'NumEdges', 'FirstSeen', 'LastUpdated', 'StartTime', 'EndTime']]]
        with open(filePath,'r') as fid:
            for line in fid:
                for i in range(len(templates)):
                    pattern = re.compile(templates[i])
                    if pattern.match(line):
                        split = re.search(r"\(.*\)",line)
                        splitList = split.group(0).split('),')
                        for item in splitList:
                            item = item.strip('(').strip(')')
                            itemList = [it.strip("'") for it in item.split(',')]
                            outputList[i].append(itemList)

        if not os.path.exists(outputFolder):
            os.makedirs(outputFolder)
        else:
            filelist = glob.glob(outputFolder + "*.csv")
            for f in filelist:
                os.remove(f)

        for j in xrange(len(outputFileName)):
            with open(outputFolder + outputFileName[j] + '.csv', "wb") as f:
                writer = csv.writer(f)
                writer.writerows(outputList[j])	

        print('All done.')
      
sql2csv(para)
