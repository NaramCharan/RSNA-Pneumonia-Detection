from Essentials.Dataset_class import make_transform
import torch
from Essentials.models import Resnet_Model
import numpy

class Final_model():
    def __init__(self):

        # self.device = torch.device("mps" if torch.mps.is_available() else'cpu')
        self.resnet_model = Resnet_Model()
        self.model = self.resnet_model.load_model(classifier_only=False)

    def predict(self, image:numpy):
        transform = make_transform()
        resnet_val_transform = transform.val_transform(resize=[256], mean=[0.485, 0.456, 0.406],
                                                      std=[0.229, 0.224, 0.225])
        self.model.eval()
        # self.model = self.model.to(self.device)
        transformed_image = resnet_val_transform(image)
        with torch.no_grad():
            transformed_image = transformed_image.unsqueeze(0)
            logits = self.model(transformed_image)
            prob = torch.softmax(logits, dim=1)
            return prob

