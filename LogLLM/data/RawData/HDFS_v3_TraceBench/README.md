## HDFS TraceBench
TraceBench is an open data set for trace-oriented monitoring, collected using MTracer on a HDFS system deployed in a real IaaS environment. When collecting, we considered different scenarios, involving multiple scales of clusters, different kinds of user requests, various speeds of workloads, etc. In addition to recording the traces when the HDFS runs normally, we also collected the traces under the situations with various faults injected. There are 17 faults we have injected, including function and performance faults (and real system bugs). The total collection time of TraceBench is more than 180 hours, resulting 364 files that record more than 370,000 traces.

The data are collected through instrumenting the HDFS system. We have converted the raw sql files to csv files and preprocessed the trace logs for easy use in research, including:
+ normal_trace.csv
+ failure_trace.csv
+ eventId.json
+ normal_taskId.json
+ failure_taskId.json

For more detailed information, please visit the dataset project: https://mtracer.github.io/TraceBench.

### Citation
If you use this dataset from loghub in your research, please cite the following paper.
+ Jingwen Zhou, Zhenbang Chen, Ji Wang, Zibin Zheng, and Michael R. Lyu. [TraceBench: An Open Data Set for Trace-oriented Monitoring](http://zbchen.github.io/Papers_files/cloudcom2014.pdf), in Proceedings of the 6th IEEE International Conference on Cloud Computing Technology and Science (CloudCom), 2014.
+ Jieming Zhu, Shilin He, Pinjia He, Jinyang Liu, Michael R. Lyu. [Loghub: A Large Collection of System Log Datasets for AI-driven Log Analytics](https://arxiv.org/abs/2008.06448). IEEE International Symposium on Software Reliability Engineering (ISSRE), 2023.
