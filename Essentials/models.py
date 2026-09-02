
from torchvision.models import DenseNet121_Weights, densenet121, EfficientNet_B2_Weights, efficientnet_b2, resnet34, ResNet34_Weights
import torch.nn as nn
import torch

class Densenet_Model():
    def __init__(self):
        self.model = densenet121(weights=DenseNet121_Weights.IMAGENET1K_V1)
        self.model.classifier = nn.Linear(in_features=1024, out_features=2)

    def classifier_only(self):
        for param in self.model.parameters():
            param.requires_grad = False

        for param in self.model.classifier.parameters():
            param.requires_grad = True

        return self.model

    def one_unfreezed_layer(self):
        for param in self.model.parameters():
            param.requires_grad = False
        for param in self.model.features.denseblock4.parameters():
            param.requires_grad = True
        for param in self.model.classifier.parameters():
            param.requires_grad = True
        self.model.features.norm5.weight.requires_grad = True
        self.model.features.norm5.bias.requires_grad = True
        return self.model

    def load_model(self, classifier_only:bool):
        if classifier_only:
            model = self.classifier_only()
            model.load_state_dict(torch.load('model_weights/densnet_model/dense_bestweights.pth', weights_only=True, map_location='cpu'))
            return model
        model = self.one_unfreezed_layer()
        model.load_state_dict(torch.load('model_weights/densnet_model/retrianed_dense.pth', weights_only=True, map_location='cpu'))
        return model


class Efficient_Model():
    def __init__(self):
        self.model = efficientnet_b2(weights=EfficientNet_B2_Weights.IMAGENET1K_V1)
        self.model.classifier = nn.Linear(1408, 2)

    def classifier_only(self):
        model = self.model
        for param in model.parameters():
            param.requires_grad = False
        for param in model.classifier.parameters():
            param.requires_grad = True
        return model

    def one_unfreezed_layer(self):
        model = self.model
        for param in model.parameters():
            param.requires_grad = False

        for param in model.features[8].parameters():
            param.requires_grad = True

        for param in model.classifier.parameters():
            param.requires_grad = True
        return model

    def load_model(self, classifier_only:bool):
        if classifier_only:
            model = self.classifier_only()
            model.load_state_dict(torch.load('model_weights/efficient_net/efficientnet_bestweights.pth', weights_only=True, map_location='cpu'))
            return model
        model = self.one_unfreezed_layer()
        model.load_state_dict(torch.load('model_weights/efficient_net/unfreeze_efficientnet_bestweights.pth', weights_only=True, map_location='cpu'))
        return model

class Resnet_Model():
    def __init__(self):
        self.model = resnet34(weights=ResNet34_Weights.IMAGENET1K_V1)
        self.model.fc = nn.Linear(in_features=512, out_features=2)

    def classifier_only(self):
        model = self.model
        for param in model.parameters():
            param.requires_grad= False

        for param in model.fc.parameters():
            param.requires_grad = True
        return model

    def one_unfreezed_layer(self):
        model = self.model
        for param in model.parameters():
            param.requires_grad = False

        for param in model.layer4.parameters():
            param.requires_grad = True

        for param in model.fc.parameters():
            param.requires_grad = True

        return model


    def load_model(self, classifier_only: bool):
        if classifier_only:
            model = self.classifier_only()
            model.load_state_dict(
                    torch.load('model_weights/resnet_model/resnet_bestweights.pth', weights_only=True, map_location='cpu'))
            return model
        model = self.one_unfreezed_layer()
        model.load_state_dict(torch.load('Essentials/resnet_model/unfreezedresnet_bestweights.pth', weights_only=True,
                                             map_location='cpu'))
        return model


