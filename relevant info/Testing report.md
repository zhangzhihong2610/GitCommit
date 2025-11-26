# GitCommit 项目软件测试文档（V1.0）
## 文档信息
| 文档状态                       | 保密级别 | 文档编号          |
| ------------------------------ | -------- | ----------------- |
| [√] 草稿 [ ] 修订 [ ] 发布 | 内部公开 | GIT-TEST-20250920 |
| 管理部门                       | 修订年月 | 版本号            |
| GitCommit 测试组               | 2025.9.20 | V1.0              |

## 变更履历
| 序号 | 变更日期  | 版本 | 变更位置 | 变更原因   |
| ---- | --------- | ---- | -------- | ---------- |
| 1    | 2025.9.20 | V1.0 | 全文     | 建立初稿   |

## 目录
1. 测试概述
2. 测试策略
3. 功能测试
4. 非功能测试
5. 测试环境与工具
6. 测试执行与交付物

---

## 1. 测试概述
### 1.1 测试目的
验证 GitCommit 项目（VS Code 大模型日志分析插件）功能与非功能需求的实现符合性，确保插件在目标场景稳定高效运行，识别各类缺陷与风险，保障用户日志分析工作体验。

### 1.2 测试范围
- **功能范围**：日志上传与预处理、解析分析、可视化交互、异常解决方案排序4大核心模块。
- **非功能范围**：性能（响应时间、准确率）、可靠性、安全性、兼容性。
- **环境范围**：VS Code 最新3个稳定版；Windows 10/11、macOS 最新2版、Ubuntu 20.04/22.04。

### 1.3 参考资料
- 《GitCommit 项目需求规格说明书（V1.0）》
- 学术论文《LogLLM: Log-based Anomaly Detection Using Large Language Models》
- 《VS Code Extension API Documentation》（版本1.84）

---

## 2. 测试策略
### 2.1 测试类型
功能测试（黑盒为主）、性能测试、兼容性测试、安全性测试、易用性测试。

### 2.2 测试优先级
- P0（阻塞级）：核心功能失效、性能不达标、严重安全漏洞。
- P1（高）：重要功能异常、影响主要场景的兼容性问题。
- P2（中）：边缘功能缺陷、轻微性能优化点。
- P3（低）：界面小瑕疵，不影响核心使用。

### 2.3 测试方法
功能测试：手动执行+关键流程自动化；性能测试：JMeter 模拟并发；兼容性测试：多环境矩阵验证；安全性测试：静态扫描+抓包分析。

---

## 3. 功能测试
### 3.1 日志上传与预处理（LOG-UP）
#### 核心用例
| 用例ID   | 测试场景                          | 测试步骤                                                                 | 预期结果                                                                 |
| --------- | --------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| TC-UP-001 | 拖拽上传100MB .log文件            | 1. 打开插件面板；2. 拖拽文件至上传区；3. 观察上传流程                     | 进度实时更新，上传成功无数据丢失                                         |
| TC-UP-002 | 上传超1GB文件                     | 选择1.2GB .txt文件尝试上传                                               | 系统拦截，提示“文件最大支持1GB”                                          |
| TC-UP-003 | IP地址隐私屏蔽                    | 上传含192.168.1.1的.log文件，查看预处理结果                               | IP地址被替换，其他内容不变                                               |
| TC-UP-004 | 网络中断后恢复上传                | 上传200MB文件至30%时断网，10秒后恢复                                     | 自动续传，最终上传成功                                                   |

### 3.2 日志解析与分析（LOG-PA）
#### 核心用例
| 用例ID   | 测试场景                          | 测试步骤                                                                 | 预期结果                                                                 |
| --------- | --------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| TC-PA-001 | 本地LogLLM解析100MB日志           | 配置本地模型路径，上传预处理日志并触发解析                               | 模型加载成功，解析完成<30秒，模板提取准确                                 |
| TC-PA-002 | 异常检测验证                      | 上传含3条异常日志的.txt文件（含“Error receiving packet”等真实异常）       | 准确标识异常，置信度≥0.9                                                 |
| TC-PA-003 | 解析准确率验证                    | 上传1000条已知模板日志，统计正确解析数                                   | 正确率≥96%                                                               |
| TC-PA-004 | 实时解析增量日志                  | 上传10MB基础日志后，追加5MB增量日志触发解析                               | 仅处理增量数据，解析时间≈0秒                                             |

### 3.3 可视化与交互（LOG-VI）
#### 核心用例
| 用例ID   | 测试场景                          | 测试步骤                                                                 | 预期结果                                                                 |
| --------- | --------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| TC-VI-001 | 侧边栏展示异常列表                | 上传含5条异常的日志，打开侧边栏面板                                       | 按时间戳排序，异常条目高亮，显示关键信息                                 |
| TC-VI-002 | 对话查询异常原因                  | 解析后输入“这条日志为什么异常？”                                         | 3秒内返回上下文相关解释（如网络数据包接收错误）                           |
| TC-VI-003 | 跨系统界面兼容性                  | 在Ubuntu 22.04上安装VS Code最新版，上传日志查看可视化面板                 | 界面无错乱，图表渲染正常                                                 |

### 3.4 异常解决方案排序（LOG-SS）
#### 核心用例
| 用例ID   | 测试场景                          | 测试步骤                                                                 | 预期结果                                                                 |
| --------- | --------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| TC-SS-001 | 多模型检索解决方案                | 触发“Lustre mount FAILED”等异常，启动解决方案检索                         | 集成LogLLM+Stack Overflow API，返回3+相关方案，相关性>85%                 |
| TC-SS-002 | 离线场景解决方案                  | 断网后触发异常检测，尝试检索解决方案                                     | 加载缓存方案，提示“离线模式”                                             |

---

## 4. 非功能测试
### 4.1 性能测试
| 用例ID     | 测试场景                          | 预期结果                                                                 |
| ----------- | --------------------------------- | ------------------------------------------------------------------------ |
| TC-PERF-001 | 100MB日志上传                     | 平均响应时间<5秒                                                         |
| TC-PERF-002 | 1GB日志解析                       | 解析速度≥30MB/s，CPU使用率≤80%                                           |
| TC-PERF-003 | 10用户并发上传50MB日志            | 无崩溃，平均响应时间<8秒                                                 |

### 4.2 可靠性与安全性测试
| 测试类型   | 核心场景                          | 预期结果                                                                 |
| ----------- | --------------------------------- | ------------------------------------------------------------------------ |
| 可靠性     | 72小时连续运行，每小时上传50MB日志 | 可用性≥99.9%，无崩溃                                                     |
| 安全性     | API密钥存储与日志传输             | 密钥加密存储，日志传输通过HTTPS，无明文泄露                               |

---

## 5. 测试环境与工具
### 5.1 硬件配置
CPU：Intel i7-12700H/AMD Ryzen 7 5800H；内存：16GB DDR4；存储：1TB NVMe SSD；网络：1Gbps以太网/5GHz Wi-Fi。

### 5.2 软件与工具
| 类别       | 详情                              |
|------------|-----------------------------------|
| 依赖软件   | Python 3.10+、Node.js 16+、LogLLM v1.0 |
| 测试工具   | JMeter 5.6、Postman 10.17、Wireshark 4.0、PyTest 7.4 |

---

## 6. 测试执行与交付物
### 6.1 执行流程
按P0→P1→P2→P3优先级执行用例，缺陷通过Jira管理，修复后执行回归测试。

### 6.2 交付物
- 测试用例说明书、测试执行报告、缺陷报告汇总
- 测试环境配置指南、测试数据资源包（含真实异常日志样本）

---

# GitCommit Project Software Test Document (V1.0)
## Document Information
| Document Status               | Confidentiality Level | Document ID       |
|-------------------------------|-----------------------|-------------------|
| [√] Draft [ ] Revised [ ] Released | Internal Public       | GIT-TEST-20250920 |
| Managing Department           | Revision Date         | Version           |
| GitCommit Testing Team        | 2025.9.20             | V1.0              |

## Change History
| No. | Change Date | Version | Change Scope | Change Reason       |
|-----|-------------|---------|--------------|---------------------|
| 1   | 2025.9.20   | V1.0    | Entire Document | Initial draft creation |

## Table of Contents
1. Test Overview
2. Test Strategy
3. Functional Testing
4. Non-Functional Testing
5. Test Environment & Tools
6. Test Execution & Deliverables

---

## 1. Test Overview
### 1.1 Test Objectives
Verify the compliance of functional and non-functional requirements for the GitCommit project (a VS Code LLM-powered log analysis extension), ensure stable and efficient operation in target scenarios, identify defects and risks, and guarantee user experience in log analysis workflows.

### 1.2 Test Scope
- **Functional Scope**: 4 core modules including Log Upload & Preprocessing, Parsing & Analysis, Visualization & Interaction, and Anomaly Solution Sorting.
- **Non-Functional Scope**: Performance (response time, accuracy), reliability, security, compatibility.
- **Environment Scope**: Latest 3 stable VS Code versions; Windows 10/11, latest 2 macOS versions, Ubuntu 20.04/22.04.

### 1.3 Reference Materials
- *GitCommit Project Requirements Specification (V1.0)*
- Academic Paper: *LogLLM: Log-based Anomaly Detection Using Large Language Models*
- *VS Code Extension API Documentation* (Version 1.84)

---

## 2. Test Strategy
### 2.1 Test Types
Functional testing (black-box dominated), performance testing, compatibility testing, security testing, usability testing.

### 2.2 Test Priority
- P0 (Blocker): Core function failure, unmet performance metrics, critical security vulnerabilities.
- P1 (High): Important function anomalies, compatibility issues affecting key scenarios.
- P2 (Medium): Edge function defects, minor performance optimizations.
- P3 (Low): Interface glitches without impacting core usage.

### 2.3 Test Methods
Functional testing: Manual execution + automated critical workflows; Performance testing: JMeter for concurrent simulation; Compatibility testing: Multi-environment matrix verification; Security testing: Static scanning + packet capture analysis.

---

## 3. Functional Testing
### 3.1 Log Upload & Preprocessing (LOG-UP)
#### Core Test Cases
| Test Case ID | Test Scenario                          | Test Steps                                                                 | Expected Results                                                         |
|--------------|----------------------------------------|-----------------------------------------------------------------------------|--------------------------------------------------------------------------|
| TC-UP-001    | Drag-and-drop upload 100MB .log file   | 1. Open plugin panel; 2. Drag file to upload area; 3. Monitor upload process | Real-time progress update, successful upload without data loss           |
| TC-UP-002    | Upload file exceeding 1GB              | Attempt to upload 1.2GB .txt file                                           | System blocks upload with message "Max file size: 1GB"                   |
| TC-UP-003    | IP address privacy masking             | Upload .log file containing 192.168.1.1 and check preprocessed result       | IP address masked, other content intact                                  |
| TC-UP-004    | Resume upload after network recovery   | Interrupt 200MB file upload at 30%, reconnect after 10 seconds              | Automatic resumption and final successful upload                         |

### 3.2 Log Parsing & Analysis (LOG-PA)
#### Core Test Cases
| Test Case ID | Test Scenario                          | Test Steps                                                                 | Expected Results                                                         |
|--------------|----------------------------------------|-----------------------------------------------------------------------------|--------------------------------------------------------------------------|
| TC-PA-001    | Local LogLLM parses 100MB log          | Configure local model path, upload preprocessed log and trigger parsing     | Successful model loading, parsing completed in <30s, accurate template extraction |
| TC-PA-002    | Anomaly detection verification         | Upload .txt file with 3 anomaly logs (including real anomalies like "Error receiving packet") | Accurate anomaly identification with confidence ≥0.9                     |
| TC-PA-003    | Parsing accuracy verification          | Upload 1000 logs with known templates and count correct parsing             | Accuracy ≥96%                                                            |
| TC-PA-004    | Real-time incremental log parsing      | Upload 10MB base log, append 5MB incremental log and trigger parsing        | Only processes incremental data, parsing time ≈0s                        |

### 3.3 Visualization & Interaction (LOG-VI)
#### Core Test Cases
| Test Case ID | Test Scenario                          | Test Steps                                                                 | Expected Results                                                         |
|--------------|----------------------------------------|-----------------------------------------------------------------------------|--------------------------------------------------------------------------|
| TC-VI-001    | Anomaly list display in sidebar        | Upload logs with 5 anomalies and open sidebar panel                         | Sorted by timestamp, highlighted anomaly entries, key info displayed     |
| TC-VI-002    | Conversational query for anomaly cause | Enter "Why is this log anomalous?" after parsing                            | Context-aware explanation (e.g., network packet reception error) returned within 3s |
| TC-VI-003    | Cross-system interface compatibility   | Install latest VS Code on Ubuntu 22.04, upload logs and check visualization panel | No interface distortion, normal chart rendering                          |

### 3.4 Anomaly Solution Sorting (LOG-SS)
#### Core Test Cases
| Test Case ID | Test Scenario                          | Test Steps                                                                 | Expected Results                                                         |
|--------------|----------------------------------------|-----------------------------------------------------------------------------|--------------------------------------------------------------------------|
| TC-SS-001    | Multi-model solution retrieval         | Trigger anomalies like "Lustre mount FAILED" and initiate solution retrieval | Integrates LogLLM+Stack Overflow API, returns 3+ relevant solutions with relevance >85% |
| TC-SS-002    | Offline solution availability          | Trigger anomaly detection without network, attempt solution retrieval       | Loads cached solutions with "Offline mode" notification                  |

---

## 4. Non-Functional Testing
### 4.1 Performance Testing
| Test Case ID | Test Scenario                          | Expected Results                                                         |
|--------------|----------------------------------------|--------------------------------------------------------------------------|
| TC-PERF-001  | 100MB log upload                       | Average response time <5s                                                |
| TC-PERF-002  | 1GB log parsing                        | Parsing speed ≥30MB/s, CPU usage ≤80%                                     |
| TC-PERF-003  | Concurrent upload by 10 users (50MB each) | No crashes, average response time <8s                                    |

### 4.2 Reliability & Security Testing
| Test Type   | Core Scenario                          | Expected Results                                                         |
|-------------|----------------------------------------|--------------------------------------------------------------------------|
| Reliability | 72-hour continuous operation with 50MB log upload per hour | Availability ≥99.9%, no crashes                                          |
| Security    | API key storage & log transmission     | Encrypted key storage, log transmission via HTTPS with no plaintext leakage |

---

## 5. Test Environment & Tools
### 5.1 Hardware Configuration
CPU: Intel i7-12700H/AMD Ryzen 7 5800H; Memory: 16GB DDR4; Storage: 1TB NVMe SSD; Network: 1Gbps Ethernet/5GHz Wi-Fi.

### 5.2 Software & Tools
| Category       | Details                                        |
|----------------|------------------------------------------------|
| Dependent Software | Python 3.10+, Node.js 16+, LogLLM v1.0          |
| Test Tools     | JMeter 5.6, Postman 10.17, Wireshark 4.0, PyTest 7.4 |

---

## 6. Test Execution & Deliverables
### 6.1 Execution Process
Execute test cases in P0→P1→P2→P3 priority order, manage defects via Jira, and perform regression testing after fixes.

### 6.2 Deliverables
- Test Case Specification
- Test Execution Report
- Defect Report Summary
- Test Environment Configuration Guide
- Test Data Package (including real anomaly log samples)