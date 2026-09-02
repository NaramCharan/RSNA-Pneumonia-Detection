
import pydicom
from torch.utils.data import Dataset
from torchvision.transforms import transforms

class RSNA_Dataset(Dataset):
    def __init__(self, data, transform):
        self.data = data
        self.transform = transform


    def __len__(self):
        return len(self.data)

    def __getitem__(self, item):
        current = self.data.iloc[item]
        patientId = current['patientId']
        path = f'./Dataset/rsna-pneumonia-detection-challenge/stage_2_train_images/{patientId}.dcm'
        data = pydicom.dcmread(path)
        array = data.pixel_array
        label = current['Target']
        if self.transform:
            array = self.transform(array)
        return (array, label)

class make_transform():
    def __init__(self):
        pass

    def train_transform(self, resize, mean, std, crop_size):
        transform = transforms.Compose([
            transforms.ToPILImage(),
            transforms.RandomCrop(size=crop_size),
            transforms.RandomHorizontalFlip(0.1),
            transforms.RandomRotation(degrees=(-10, +10)),
            transforms.ColorJitter(brightness=0.1, contrast=0.1),
            transforms.Grayscale(num_output_channels=3),
            transforms.Resize(size=resize),
            transforms.ToTensor(),
            transforms.Normalize(mean=mean, std=std)])
        return transform

    def val_transform(self, resize, mean, std):
        transform = transforms.Compose([
            transforms.ToPILImage(),
            transforms.Grayscale(num_output_channels=3),
            transforms.Resize(size=resize),
            transforms.ToTensor(),
            transforms.Normalize(mean=mean, std=std)
        ])
        return transform


