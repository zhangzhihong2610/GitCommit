from flask import Flask, request, jsonify
import os
from flask_cors import CORS
from werkzeug.utils import secure_filename
from eval import init_model
from returnfunc import return_anomaly_content
import pandas as pd

# 初始化Flask应用
app = Flask(__name__)
CORS(app)  # 启用 CORS，允许跨端口通信

# # 加载模型和分词器
# model_path = "path/to/your/model"  # 替换为你的模型路径
# tokenizer = AutoTokenizer.from_pretrained(model_path)
# model = AutoModelForSeq2SeqLM.from_pretrained(model_path)
#
# # 确保模型在正确的设备上运行
# device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
# model.to(device)

# 定义API接口
@app.route('/evaluate', methods=['POST'])
def evaluate():

    # 文件保存路径
    UPLOAD_FOLDER = r'D:\proj\LogLLM\LogLLM-master\uploads'
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)

    # 检查是否有文件上传
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400


    logType = request.form.get('logType', '')
    # print('logType: ',logType)

    # 保存文件到指定目录
    filename = secure_filename(file.filename)
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(file_path)
    print('file_path: ', file_path)
    result = init_model(logType,file_path)

    print('result: ', result)

    # return log window detail
    df = pd.read_csv(file_path)
    indexs = list(df.query('Label==1').index)
    log_content = []
    for i in indexs:
        log_content.append(df['Content'][i])
    print('log_content :', log_content)

    # 获取异常窗口，并返回异常所在位置

    anomaly_content = return_anomaly_content(file_path)
    print("anomaly_content: ", anomaly_content[0])
    print('type: ', type(anomaly_content[0]))

    # 返回结果
    return jsonify({"result": result, "anomaly_content": anomaly_content, "log_content":log_content})

# 启动API服务
if __name__ == '__main__':
    app.run(host='127.0.0.10', port=2610)