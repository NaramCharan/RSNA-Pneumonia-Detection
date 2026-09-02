

from Backend import database
import pandas as pd

data = pd.read_csv('UserCase_studies.csv')
patiend_ids = data .loc[:, 'patientId'].tolist()
target = data.loc[:, 'Target'].tolist()

def add_data():
    db = database.session()
    for i in range(0, len(patiend_ids)):
        query = db.query(database.Dicom_database).filter(database.Dicom_database.storage_key==patiend_ids[i]).first()
        if not query:
            db.add(database.Dicom_database(storage_key=patiend_ids[i], target=target[i]))
    db.commit()
    db.close()


