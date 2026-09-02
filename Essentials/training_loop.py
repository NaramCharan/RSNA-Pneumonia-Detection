
import torch
from .evaluation_loop import Evaluation

class Training_loop():
    def __init__(self):
        self.device = torch.device('mps' if torch.mps.is_available() else 'cpu')
        self.evaluate = Evaluation()

    def training_loop(self, model, loss_function, optimization, lr_sch, model_name: str, train_dataloader, val_dataloader):
        model = model.to(self.device)
        model.train()
        patience = 4
        counter = 0
        best_f1 = 0.0

        for i in range(0, 30):
            running_loss = 0.0
            training_loss = 0.0
            for image, label in train_dataloader:
                image, label = image.to(self.device), label.to(self.device)
                preditions = model(image)
                loss = loss_function(preditions, label)
                running_loss += loss.item()
                optimization.zero_grad()
                loss.backward()
                optimization.step()
            training_loss = running_loss / len(train_dataloader)
            val_loss, f1 = self.evaluate.evaluate(model, loss_function, val_dataloader, train=True)
            if best_f1 < f1:
                best_f1 = f1
                counter = 0
                print("New model is saved")
                torch.save(model.state_dict(), f'{model_name}_bestweights.pth')
            else:
                counter += 1
            if counter >= patience:
                print("Early Stopping")
                break
            lr_sch.step(f1)
            print(f'For the Epoch {i + 1}\n'
                  f'Training loss : {training_loss:.4f}\n'
                  f'Validation loss : {val_loss:.4f}\n'
                  f'F1 score is {f1}')
        model.load_state_dict(torch.load(f'{model_name}_bestweights.pth', weights_only=True, map_location='mps'))
        return model



