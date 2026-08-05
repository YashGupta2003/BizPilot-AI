import os
import aioboto3
import shutil
from abc import ABC, abstractmethod
from fastapi import UploadFile

class StorageService(ABC):
    @abstractmethod
    async def upload_file(self, file: UploadFile, filename: str) -> str:
        pass

class LocalStorageService(StorageService):
    def __init__(self, upload_dir: str = "data/uploads"):
        self.upload_dir = upload_dir
        os.makedirs(self.upload_dir, exist_ok=True)

    async def upload_file(self, file: UploadFile, filename: str) -> str:
        filepath = os.path.join(self.upload_dir, filename)
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return filepath

class S3StorageService(StorageService):
    def __init__(self, bucket_name: str, region_name: str = "us-east-1"):
        self.bucket_name = bucket_name
        self.region_name = region_name

    async def upload_file(self, file: UploadFile, filename: str) -> str:
        session = aioboto3.Session()
        async with session.client("s3", region_name=self.region_name) as s3_client:
            # Re-wind the file before uploading
            file.file.seek(0)
            await s3_client.upload_fileobj(file.file, self.bucket_name, filename)
            # We must return a path that `load_text_from_file` can read, or modify it to read from S3.
            # But the prompt says "stream uploads directly to AWS S3".
            # For this exercise, we can return the s3 uri or a downloaded temp path.
            # However, for simplicity and local text chunking, we can save a temp file locally to chunk,
            # or chunk it in memory. Let's return the local temp path as fallback so chunk_text works.
            temp_path = os.path.join("/tmp", filename)
            file.file.seek(0)
            with open(temp_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            return temp_path
