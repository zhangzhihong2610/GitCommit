import os
import re
import pandas as pd
from pathlib import Path
import numpy as np
import torch
from torch.utils.data import DataLoader
from tqdm import tqdm
from model import LogLLM
from customDataset import CustomDataset, CustomCollator


class LogAnomalyPredictor:
    def __init__(self, dataset_name='Liberty', batch_size=32, max_content_len=100, max_seq_len=128):
        self.dataset_name = dataset_name
        self.batch_size = batch_size
        self.max_content_len = max_content_len
        self.max_seq_len = max_seq_len

        # 路径配置
        self.Bert_path = r"D:\proj\LogLLM\bert-base-uncased"
        self.Llama_path = r"D:\proj\LogLLM\Meta-Llama-3-8B"

        ROOT_DIR = r"D:\proj\LogLLM"
        self.ft_path = os.path.join(r'D:\proj\LogLLM\LogLLM-master', "ft_model_{}".format(dataset_name))
        self.data_path = os.path.join(ROOT_DIR, r"data\{}\test1.csv".format(dataset_name))

        self.device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")

        # 初始化模型和组件
        self.model = None
        self.tokenizer = None
        self.dataloader = None

        print(f'Initialized LogAnomalyPredictor with:')
        print(f'dataset_name: {dataset_name}')
        print(f'batch_size: {batch_size}')
        print(f'max_content_len: {max_content_len}')
        print(f'max_seq_len: {max_seq_len}')
        print(f'device: {self.device}')

    def load_model(self):
        """加载训练好的模型"""
        print("Loading model...")
        self.model = LogLLM(
            self.Bert_path,
            self.Llama_path,
            ft_path=self.ft_path,
            is_train_mode=False,
            device=self.device,
            max_content_len=self.max_content_len,
            max_seq_len=self.max_seq_len
        )
        self.tokenizer = self.model.Bert_tokenizer
        print("Model loaded successfully.")

    def prepare_data(self, data_path=None):
        """准备数据"""
        if data_path is None:
            data_path = self.data_path

        print(f"Loading data from: {data_path}")
        dataset = CustomDataset(data_path)
        collator = CustomCollator(self.tokenizer, max_seq_len=self.max_seq_len, max_content_len=self.max_content_len)

        self.dataloader = DataLoader(
            dataset,
            batch_size=self.batch_size,
            collate_fn=collator,
            num_workers=4,
            shuffle=False,
            drop_last=False
        )
        print("Data prepared successfully.")

    def predict_anomalies(self):
        """预测日志序列中的异常"""
        if self.model is None:
            self.load_model()
        if self.dataloader is None:
            self.prepare_data()

        self.model.eval()
        all_predictions = []
        all_sequences = []

        print("Starting anomaly prediction...")
        with torch.no_grad():
            for batch_i in tqdm(self.dataloader, desc="Predicting anomalies"):
                inputs = batch_i['inputs']
                seq_positions = batch_i['seq_positions']

                inputs = inputs.to(self.device)

                outputs_ids = self.model(inputs, seq_positions)
                outputs = self.model.Llama_tokenizer.batch_decode(outputs_ids)

                # 解析预测结果
                batch_predictions = []
                for text in outputs:
                    match = re.search(r'normal|anomalous', text, re.IGNORECASE)
                    if match:
                        prediction = match.group().lower()
                        batch_predictions.append(prediction)
                    else:
                        print(f'Warning: Unable to parse prediction from: {text}')
                        batch_predictions.append('unknown')

                all_predictions.extend(batch_predictions)

                # 获取原始序列信息（如果有的话）
                if 'sequences' in batch_i:
                    all_sequences.extend(batch_i['sequences'])

        return all_predictions, all_sequences

    def locate_anomalous_sequences(self, predictions):
        """定位异常序列的位置"""
        anomalous_indices = []
        for i, pred in enumerate(predictions):
            if pred == 'anomalous':
                anomalous_indices.append(i)

        return anomalous_indices

    def get_detailed_anomaly_report(self, predictions, sequences=None):
        """生成详细的异常报告"""
        anomalous_indices = self.locate_anomalous_sequences(predictions)

        report = {
            'total_sequences': len(predictions),
            'anomalous_sequences': len(anomalous_indices),
            'normal_sequences': len(predictions) - len(anomalous_indices),
            'anomaly_rate': len(anomalous_indices) / len(predictions) if len(predictions) > 0 else 0,
            'anomalous_indices': anomalous_indices
        }

        # 如果有序列信息，添加更多细节
        if sequences is not None and len(sequences) == len(predictions):
            report['anomalous_sequences_details'] = [
                {'index': idx, 'sequence': sequences[idx]}
                for idx in anomalous_indices
            ]

        return report

    def save_predictions(self, predictions, output_path=None):
        """保存预测结果到文件"""
        if output_path is None:
            output_path = f'anomaly_predictions_{self.dataset_name}.csv'

        df = pd.DataFrame({
            'sequence_index': range(len(predictions)),
            'prediction': predictions,
            'is_anomalous': [1 if pred == 'anomalous' else 0 for pred in predictions]
        })

        df.to_csv(output_path, index=False)
        print(f"Predictions saved to: {output_path}")
        return output_path

    def predict_from_file(self, data_path=None, save_results=True):
        """从文件进行预测的主函数"""
        try:
            # 加载数据
            self.prepare_data(data_path)

            # 进行预测
            predictions, sequences = self.predict_anomalies()

            # 生成报告
            report = self.get_detailed_anomaly_report(predictions, sequences)

            # 打印报告
            print("\n" + "=" * 50)
            print("ANOMALY DETECTION REPORT")
            print("=" * 50)
            print(f"Total sequences analyzed: {report['total_sequences']}")
            print(f"Anomalous sequences detected: {report['anomalous_sequences']}")
            print(f"Normal sequences: {report['normal_sequences']}")
            print(f"Anomaly rate: {report['anomaly_rate']:.2%}")
            print(f"Anomalous sequence indices: {report['anomalous_indices']}")
            print("=" * 50)

            # 保存结果
            if save_results:
                output_file = self.save_predictions(predictions)
                print(f"Detailed predictions saved to: {output_file}")

            return predictions, report

        except Exception as e:
            print(f"Error during prediction: {e}")
            return None, None


def main():
    """主函数示例"""
    # 初始化预测器
    predictor = LogAnomalyPredictor(
        dataset_name='Liberty',  # 可以更改为 'Thunderbird', 'HDFS_v1', 'BGL'
        batch_size=32,
        max_content_len=100,
        max_seq_len=128
    )

    # 进行预测
    predictions, report = predictor.predict_from_file()

    if predictions is not None:
        print("\nPrediction completed successfully!")
        print(f"Found {len(report['anomalous_indices'])} anomalous sequences.")

        # 显示前几个异常的位置
        if report['anomalous_indices']:
            print("\nFirst 10 anomalous sequence indices:")
            for idx in report['anomalous_indices'][:10]:
                print(f"  - Sequence {idx}")


if __name__ == '__main__':
    main()