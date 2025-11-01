import os
import re
from pathlib import Path
import numpy as np
import torch
import pandas as pd
from torch.utils.data import DataLoader
from tqdm import tqdm
from model import LogLLM
from customDataset import CustomDataset, CustomCollator
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

max_content_len = 100
max_seq_len = 128
batch_size = 32
dataset_name = 'Liberty'   # 'Thunderbird' 'HDFS_v1'  'BGL'  'Liberty‘
data_path = r'D:\proj\LogLLM\data\{}\test3.csv'.format(dataset_name)

Bert_path = r"D:\proj\LogLLM\bert-base-uncased"
Llama_path = r"D:\proj\LogLLM\Meta-Llama-3-8B"

ROOT_DIR = Path(__file__).parent
ft_path = os.path.join(ROOT_DIR, r"ft_model_{}".format(dataset_name))

device = torch.device("cuda:0")

print(
f'dataset_name: {dataset_name}\n'
f'batch_size: {batch_size}\n'
f'max_content_len: {max_content_len}\n'
f'max_seq_len: {max_seq_len}\n'
f'device: {device}')


def evalModel(model, dataloader):
    model.eval()

    preds = []

    with (torch.no_grad()):
        for bathc_i in tqdm(dataloader):
            print('bathc_i: \n',bathc_i)
            #
            # contents = bathc_i['input_ids']
            # sequences = np.array(contents, dtype=object)

            inputs = []
            inputs.append(bathc_i['input_ids'])
            inputs.append("cuda:0")
            # sequences['device'] = sequences.to(device)

            inputs = tokenizer(
                inputs,
                return_tensors="pt",
                max_length=max_content_len,
                padding=True,
                truncation=True
            )

            print('inputs: \n', inputs)
            seq_positions = []

            # inputs = inputs.to(device)
            # seq_positions = seq_positions

            outputs_ids = model(torch.tensor(inputs, dtype=torch.long),seq_positions)
            # outputs_ids = model(inputs)
            outputs = model.Llama_tokenizer.batch_decode(outputs_ids)

            # print(outputs)

            for text in outputs:
                match = re.search(r'normal|anomalous', text, re.IGNORECASE)
                if match:
                    preds.append(match.group())
                else:
                    print(f'error :{text}')
                    preds.append('')

    preds_copy = np.array(preds)
    preds = np.zeros_like(preds_copy,dtype=int)
    preds[preds_copy == 'anomalous'] = 1
    preds[preds_copy != 'anomalous'] = 0
    gt = dataloader.dataset.get_label()

    # precision = precision_score(gt, preds, average="binary", pos_label=1)
    # recall = recall_score(gt, preds, average="binary", pos_label=1)
    # f = f1_score(gt, preds, average="binary", pos_label=1)
    # acc = accuracy_score(gt, preds)

    num_anomalous = (gt == 1).sum()
    num_normal = (gt == 0).sum()

    print(f'Number of anomalous seqs: {num_anomalous}; number of normal seqs: {num_normal}')

    pred_num_anomalous = (preds == 1).sum()
    pred_num_normal =  (preds == 0).sum()

    print(
        f'Number of detected anomalous seqs: {pred_num_anomalous}; number of detected normal seqs: {pred_num_normal}')

    # print(f'precision: {precision}, recall: {recall}, f1: {f}, acc: {acc}')

# 替换函数
def replace_patterns(text):
    text = re.sub(r'[\.]{3,}', '.. ', text)    # Replace multiple '.' with '.. '
    text = re.sub(combined_pattern, '<*>', text)
    return text

if __name__ == '__main__':
    print(f'dataset: {data_path}')
    # dataset = CustomDataset(data_path)

    patterns = [
        r'True',
        r'true',
        r'False',
        r'false',
        r'\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion)\b',
        r'\b(Mon|Monday|Tue|Tuesday|Wed|Wednesday|Thu|Thursday|Fri|Friday|Sat|Saturday|Sun|Sunday)\b',
        r'\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})\s+\b',
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d{1,5})?',  # IP
        r'([0-9A-Fa-f]{2}:){11}[0-9A-Fa-f]{2}',  # Special MAC
        r'([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}',  # MAC
        r'[a-zA-Z0-9]*[:\.]*([/\\]+[^/\\\s\[\]]+)+[/\\]*',  # File Path
        r'\b[0-9a-fA-F]{8}\b',
        r'\b[0-9a-fA-F]{10}\b',
        r'(\w+[\w\.]*)@(\w+[\w\.]*)\-(\w+[\w\.]*)',
        r'(\w+[\w\.]*)@(\w+[\w\.]*)',
        r'[a-zA-Z\.\:\-\_]*\d[a-zA-Z0-9\.\:\-\_]*',  # word have number
    ]
    # 合并所有模式
    combined_pattern = '|'.join(patterns)

    csv_df = pd.read_csv(data_path)
    csv_df['Content'] = csv_df['Content'].apply(replace_patterns)  # filter invalid character
    contents = csv_df['Content'].values
    # sequences = np.array([content.split(' ;-; ') for content in contents], dtype=object)

    print(f'contents: {contents}')

    model = LogLLM(Bert_path, Llama_path, ft_path=ft_path, is_train_mode=False, device=device,
                   max_content_len=max_content_len, max_seq_len=max_seq_len)

    tokenizer = model.Bert_tokenizer
    # collator = CustomCollator(tokenizer, max_seq_len=max_seq_len, max_content_len=max_content_len)
    dataloader = DataLoader(
        contents,
        batch_size=batch_size,
        collate_fn=tokenizer,
        num_workers=4,
        shuffle=False,
        drop_last=False
    )

    evalModel(model, dataloader)