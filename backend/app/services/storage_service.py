import os
import aioboto3
import shutil
from abc import ABC, abstractmethod
from fastapi import UploadFile

from app.core.config import settings

class StorageService(ABC):
    @abstractmethod
    async def upload_file(self, file: UploadFile, filename: str, owner_id: str) -> str:
        pass
        
    @abstractmethod
    async def delete_file(self, filename: str, owner_id: str):
        pass

class LocalStorageService(StorageService):
    def __init__(self, upload_dir: str = "data/uploads"):
        self.upload_dir = upload_dir

    async def upload_file(self, file: UploadFile, filename: str, owner_id: str) -> str:
        owner_dir = os.path.join(self.upload_dir, str(owner_id))
        os.makedirs(owner_dir, exist_ok=True)
        filepath = os.path.join(owner_dir, filename)
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return filepath
        
    async def delete_file(self, filename: str, owner_id: str):
        filepath = os.path.join(self.upload_dir, str(owner_id), filename)
        if os.path.exists(filepath):
            os.remove(filepath)

class S3StorageService(StorageService):
    def __init__(self, bucket_name: str, region_name: str = "us-east-1"):
        self.bucket_name = bucket_name
        self.region_name = region_name

    async def upload_file(self, file: UploadFile, filename: str, owner_id: str) -> str:
        s3_key = f"{owner_id}/{filename}"
        session = aioboto3.Session()
        async with session.client("s3", region_name=self.region_name) as s3_client:
            file.file.seek(0)
            await s3_client.upload_fileobj(file.file, self.bucket_name, s3_key)
            
            temp_path = os.path.join("/tmp", f"{owner_id}_{filename}")
            file.file.seek(0)
            with open(temp_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            return temp_path
            
    async def delete_file(self, filename: str, owner_id: str):
        s3_key = f"{owner_id}/{filename}"
        session = aioboto3.Session()
        async with session.client("s3", region_name=self.region_name) as s3_client:
            await s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
