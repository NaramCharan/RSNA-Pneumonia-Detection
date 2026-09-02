import torch
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from Backend import database
from Backend import seed
from fastapi.responses import StreamingResponse
import io
from sqlalchemy.orm import Session
import pandas as pd
from Final_model import Final_model
import pydicom
from PIL import Image



database.Base.metadata.create_all(database.engine)
seed.add_data()


model = Final_model()
app = FastAPI()
data = pd.read_csv('UserCase_studies.csv')

patiend_ids = data.loc[:, 'patientId'].tolist()
def session_manager():
    db = database.session()
    try:
        yield db
    finally:
        db.close()



@app.get('/')
def hello():
    return {
    "name": "RSNA Pneumonia Detection API",
    "status": "online"
}

@app.get('/samples')
def samples(db:Session=Depends(session_manager)):
    samples = []
    for i in patiend_ids:
        file = db.query(database.Dicom_database).filter(database.Dicom_database.storage_key==i).first()
        file.id = str(file.id)
        samples.append({"id":file.id,
                        "storage_key": file.storage_key})
    return samples


@app.post('/predict/sample/{id}')
def predictSample(id:int, db:Session=Depends(session_manager)):
    file = db.query(database.Dicom_database).filter(database.Dicom_database.id==id).first()
    patiend_id = file.storage_key
    path = f'selected_images/selected_images/{patiend_id}.dcm'
    array = pydicom.dcmread(path).pixel_array
    prediction = model.predict(array)
    output = torch.argmax(prediction, dim=1)
    if output==1:
        return {"label": "Pneumonia", "pneumonia": True, "probability":round(float(prediction[0][output]), 2)}
    return {"label": "No Pneumonia", "pneumonia": False, "probability":round(float(prediction[0][output]), 2)}


@app.get('/image/{id}')
def get_image(id:int, db:Session=Depends(session_manager)):
    file = db.query(database.Dicom_database).filter(database.Dicom_database.id==id).first()
    if file:
        patiend_id = file.storage_key
        path = f'selected_images/selected_images/{patiend_id}.dcm'
        array = pydicom.dcmread(path).pixel_array
        image = Image.fromarray(array)
        buffer = io.BytesIO()
        image.save(buffer, format='png')
        buffer.seek(0)
        return StreamingResponse(buffer, media_type='image/png')

    else:
        return HTTPException(status_code=404, detail='File Not Found')


@app.post('/predict')
def predict(file:UploadFile=File(...)):
    dicom_file = pydicom.dcmread(file.file)
    array = dicom_file.pixel_array
    prediction = model.predict(array)
    output = torch.argmax(prediction, dim=1)
    if output == 1:
        return {"label": "Pneumonia", "pneumonia": True, "probability": round(float(prediction[0][output]), 2)}
    return {"label": "No Pneumonia", "pneumonia": False, "probability": round(float(prediction[0][output]), 2)}


