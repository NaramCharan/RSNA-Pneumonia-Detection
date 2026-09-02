
import pandas as pd
from sklearn.model_selection import train_test_split

class Datasplit():
    def __init__(self):
        self.data = pd.read_csv('Dataset/rsna-pneumonia-detection-challenge/stage_2_train_labels.csv')

    def split_data(self):
        patient_ids = self.data['patientId'].unique().to_numpy()
        train, temp = train_test_split(patient_ids, test_size=0.3, shuffle=True)
        val, test = train_test_split(temp, test_size=0.2)
        train_set = self.data[self.data['patientId'].isin(train)].copy()
        val_set = self.data[self.data['patientId'].isin(val)].copy()
        test_set = self.data[self.data['patientId'].isin(test)].copy()
        return train_set, val_set, test_set


