import torch
from sklearn.metrics import classification_report

class Evaluation():
    def __init__(self):
        self.device = torch.device('mps' if torch.mps.is_available() else 'cpu')

    def evaluate(self, model, loss_function, val_dataloader, train: bool):
        model = model.to(self.device)
        model.eval()
        val_loss = 0.0
        real_values = []
        predicted = []
        with torch.no_grad():
            for image, label in val_dataloader:
                image, label = image.to(self.device), label.to(self.device)
                predictions = model(image)
                loss = loss_function(predictions, label)
                val_loss += loss
                classification = torch.argmax(predictions, dim=1)
                real_values.extend(label.tolist())
                predicted.extend(classification.tolist())

        report = classification_report(real_values, predicted, output_dict=True)
        f1 = report['1']['f1-score']
        if train:
            return (val_loss.item()) / len(val_dataloader), f1
        return (val_loss.item()) / len(val_dataloader), f1, real_values, predicted
