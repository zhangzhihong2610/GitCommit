import pandas as pd
import ast


def find_anomaly_content(csv_file):
    # 读取CSV文件
    df = pd.read_csv(csv_file)

    # 筛选Label为1的行
    label_1_rows = df[df['Label'] == 1]

    results = []

    for index, row in label_1_rows.iterrows():
        content_parts = row['Content'].split(' ;-; ')
        item_label = ast.literal_eval(row['item_Label'])

        # 查找item_Label中为1的位置
        anomaly_positions = [i for i, val in enumerate(item_label) if val == 1]

        for pos in anomaly_positions:
            if pos < len(content_parts):
                anomaly_content = content_parts[pos].strip()
                results.append({
                    'row_index': index,
                    'anomaly_position': pos,
                    'anomaly_content': anomaly_content,
                    'content_length': len(content_parts),
                    'item_label_length': len(item_label)
                })

    return results


# 返回异常位置
def return_anomaly_content(file_path):
    anomalies = find_anomaly_content(file_path)

    # 输出结果
    print(f"找到 {len(anomalies)} 个异常内容:")
    print("=" * 80)

    for i, anomaly in enumerate(anomalies, 1):
        print(f"{i}. 行索引: {anomaly['row_index']}")
        print(f"   异常位置: {anomaly['anomaly_position']}")
        print(f"   异常内容: {anomaly['anomaly_content']}")
        print(f"   Content长度: {anomaly['content_length']}, item_Label长度: {anomaly['item_label_length']}")
        print("-" * 80)

    # 统计信息
    if anomalies:
        unique_rows = len(set(anomaly['row_index'] for anomaly in anomalies))
        print(f"\n统计信息:")
        print(f"涉及的行数: {unique_rows}")
        print(f"总异常数量: {len(anomalies)}")
    else:
        print("未找到符合条件的异常内容")

    return anomalies