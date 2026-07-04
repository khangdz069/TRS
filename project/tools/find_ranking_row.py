import numpy as np
import os

files = {
    'RSVD': r"backend\app\files\matries\20240501_190028_mf_RSVD.npz",
    'LSTM': r"backend\app\files\matries\20240501_190453_mf_LSTM.npz",
    'timeSVD': r"backend\app\files\matries\20240501_191307_mf_timeSVD.npz"
}

for name, path in files.items():
    if os.path.exists(path):
        data = np.load(path, allow_pickle=True)
        matrix = data['matrix']
        matching = []
        
        # LSTM shape is (295, 1, 109)
        for idx in range(matrix.shape[0]):
            row = matrix[idx]
            if name == 'LSTM':
                row = row[0]
            
            s1 = row[0]
            s2 = row[1]
            s3 = row[2]
            s4 = row[3]
            
            if s2 > s4 > s3 > s1:
                matching.append((idx, s1, s2, s3, s4))
                
        print(f"Model {name} (shape {matrix.shape}): found {len(matching)} matching rows.")
        if matching:
            print(f"  Sample row index: {matching[0][0]}, values: {matching[0][1:]}")
