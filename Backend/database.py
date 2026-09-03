from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy import create_engine, Integer, Column, VARCHAR
import os
from dotenv import load_dotenv, find_dotenv

path = find_dotenv()
load_dotenv(path)

database_url = os.getenv('database_url')


#For docker replace the localhost with --> host.docker.internal

url = database_url
engine = create_engine(url=url)
session = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass

class Dicom_database(Base):
    __tablename__ = 'Dicom_database'
    id = Column(Integer, index=True, primary_key=True, nullable=False)
    storage_key = Column(VARCHAR, nullable=False)
    target = Column(Integer, nullable=True)



