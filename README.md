# 🫁 RSNA Pneumonia Detection from Chest X-Rays 🩺

**`Deep Learning · Medical Imaging · Transfer Learning · FastAPI · Docker · Azure`**

A chest radiograph screening system that classifies pneumonia from DICOM X-ray images using transfer
learning on pretrained CNNs — trained on the RSNA Pneumonia Detection Challenge dataset, served
through a FastAPI backend with a React interface, containerized with Docker, and deployed live on
Microsoft Azure.

Unlike a notebook that stops at a metric, this project runs end to end: **a trained model, a REST
API, a web interface, and a public URL anyone can open.**

### 🔗 **[Try it live →](https://rsna-app.salmonmeadow-7644e67e.eastasia.azurecontainerapps.io)**

> ⏱️ **First load takes ~34 seconds.** The app scales to zero when idle, so the first request waits
> for a container to start and PyTorch to load. Everything after that is sub-second. This is
> deliberate — it is what keeps hosting at **$5.06/month**.

---

## 🎯 Problem Statement

Pneumonia is one of the most common reasons for chest imaging, and reading those images is slow,
expensive, and requires expertise that is unevenly distributed. Automated screening could help by:

- Triaging which studies a radiologist should read first
- Flagging findings that might be missed under time pressure
- Extending basic screening capability where radiologists are scarce

This project builds a binary classifier over chest radiographs:

- **0** — No Pneumonia
- **1** — Pneumonia

Two things make it harder than a standard image classification task:

| Challenge | Why it matters |
|---|---|
| 🔍 **Subtle signal** | Pneumonia shows as soft-edged lung opacity with fuzzy boundaries, overlapping with other conditions |
| ⚖️ **Class imbalance** | ~70% of studies are negative — a model that always says "no" scores 70% accuracy and finds nothing |

That second point is why **accuracy is the wrong headline metric here**, and why pneumonia-class
recall is what this project optimises against.

---

## ✨ Project Highlights

- 🧠 **Transfer Learning Across Three Architectures** — DenseNet-121, EfficientNet-B2 and ResNet-34
  benchmarked under an identical protocol
- 🔬 **Augmentation Bug Caught & Fixed** — discovered `RandomCrop(224)` was discarding **95% of every
  1024×1024 X-ray** while keeping the positive label; removing it produced the single largest
  improvement in the project
- ⚖️ **Class Imbalance Handled Properly** — weighted `CrossEntropyLoss` after the unweighted model
  collapsed toward the majority class
- 🧬 **Patient-Level Splitting** — split on unique patient IDs, not rows, to prevent the same patient
  appearing in both train and validation
- 🎯 **Test Set Touched Once** — every decision made on validation; the test set evaluated exactly
  once, at the end
- 🖥️ **Full Application, Not Just a Model** — DICOM processing, FastAPI service, React interface,
  Docker image, live Azure deployment
- 💰 **Cost-Driven Architecture Decision** — built a PostgreSQL layer, measured it at $25.68/month to
  store a copy of a 4 KB CSV, and deleted it
- ☁️ **Trained on Kaggle GPUs** — local MacBook was not enough for 1024² medical images

---

## 🔥 Key Engineering Challenges & How They Were Solved

Three problems, in the order I actually hit them. The third one is the interesting one.

### ❌ Challenge 1 — The Model Learned to Say "No"

**What happened:** The first training run used a plain `nn.CrossEntropyLoss()`. Overall accuracy
looked respectable. The confusion matrix did not — the model heavily favoured "No Pneumonia" and
missed a large share of actual pneumonia cases.

**Why it happened:** Nothing was broken. With ~70% negatives, *always predicting negative is a
genuinely good strategy for minimising average loss.* The objective simply never encoded that a
missed pneumonia costs more than a false alarm.

**Fix:** Weight the loss inversely to class frequency.

```python
weights = compute_class_weight(class_weight='balanced',
                               classes=np.array([0, 1]),
                               y=np.array(train['Target']))
loss_function = nn.CrossEntropyLoss(weight=torch.tensor(weights, dtype=torch.float32))
```

> ⚠️ **Worth being precise:** this does **not** balance the dataset. It changes the *price* of each
> error. The model still sees the same skewed data — it just pays more for missing pneumonia.

---

### ❌ Challenge 2 — Better, But Still Not Right

**What happened:** Recall improved after weighting. But results were still weaker than they should
have been, and staring at the model architecture explained nothing.

**Fix:** Stop looking at the model. Go back and look at the data actually reaching it.

---

### ❌ Challenge 3 — `RandomCrop` Was Destroying Every Image ⭐

**What happened:** I had copied a standard ImageNet augmentation pipeline:

```python
transforms.Compose([
    transforms.ToPILImage(),
    transforms.RandomCrop(size=[224]),      # ← the culprit
    transforms.RandomHorizontalFlip(0.1),
    transforms.RandomRotation(degrees=(-10, +10)),
    transforms.ColorJitter(brightness=0.1, contrast=0.1),
    transforms.Grayscale(num_output_channels=3),
    transforms.Resize(size=[256]),
    transforms.ToTensor(),
    transforms.Normalize(mean=mean, std=std),
])
```

Then I checked the source resolution. **RSNA radiographs are 1024 × 1024.**

`RandomCrop` runs *first*, on the full-resolution image:

```
224 × 224
─────────────  =  4.8%  of the image
1024 × 1024
```

**Every training image was a random ~5% patch of a chest X-ray, still carrying the label
"Pneumonia".** Most of those patches contained no lung opacity at all — many contained no lung. I
was training the model to find pneumonia in crops where it demonstrably was not, and penalising it
for failing to.

**Why this is safe on ImageNet and dangerous here:**

| | Natural images | Chest radiographs |
|---|---|---|
| Subject size | Fills most of the frame | Finding is small and localised |
| Random crop still contains subject? | ✅ Usually | ❌ Frequently not |
| Label describes | The crop, effectively | The **whole study** |

**Fix:** Removed `RandomCrop`, preserved the full field of view, retrained on Kaggle.

> 🏆 **That one deletion produced a larger improvement than every architecture swap in the project
> combined.** All metrics reported below come from models trained *after* this fix.

**The lesson:** augmentation is not free. Every transform encodes an assumption about your data, and
a transform that is standard in one domain can silently corrupt your labels in another.

---

## 📦 Dataset

**Source:** [RSNA Pneumonia Detection Challenge](https://www.kaggle.com/competitions/rsna-pneumonia-detection-challenge) — Kaggle Competition
*Radiological Society of North America*

| File | Description | Key Columns |
|---|---|---|
| `stage_2_train_labels.csv` | One row **per bounding box** — patients can repeat | `patientId`, `x`, `y`, `width`, `height`, `Target` |
| `stage_2_train_images/` | Chest radiographs in DICOM format | 1024 × 1024, 8-bit grayscale |
| `stage_2_detailed_class_info.csv` | Finer-grained class labels | `patientId`, `class` |

**Coverage:** ~30,000 studies · 1024 × 1024 DICOM · roughly 70% negative / 30% pneumonia

### 🧬 The Patient-Level Split

The label file has **one row per bounding box**, so a patient with two opacities appears twice.
Splitting rows at random would place the same patient in both train and validation — the model
would score well by memorising patients rather than learning pneumonia.

> 🚨 This is data leakage, and it is **invisible in the metrics**. The numbers look *better*, not
> worse. Nothing warns you.

The split is therefore done on unique patient IDs first, and rows selected afterwards
([`Essentials/split_data.py`](Essentials/split_data.py)):

```python
patient_ids = self.data['patientId'].unique().to_numpy()
train, temp = train_test_split(patient_ids, test_size=0.3, shuffle=True)
val, test   = train_test_split(temp, test_size=0.2)

train_set = self.data[self.data['patientId'].isin(train)].copy()
```

```
Unique patients
   ├── 🏋️  Train        70%   model fitting
   ├── 🎛️  Validation   24%   architecture choice, tuning, threshold analysis
   └── 🔒 Test          6%   evaluated ONCE, at the very end
```

No patient appears in more than one split.

---

## 🏗️ Architecture Overview

```
DICOM images + labels (RSNA Challenge)
         │
         ▼
   Datasplit (split_data.py)
   ─────────────────────────────────────────────────────
   · split on UNIQUE patientId, never on rows
   · train 70% / validation 24% / test 6%
         │
         ▼
   RSNA_Dataset + make_transform (Dataset_class.py)
   ─────────────────────────────────────────────────────
   · pydicom.dcmread() → pixel_array (1024×1024, uint8)
   · grayscale → 3 channels (pretrained models expect RGB)
   · resize 256, ImageNet normalisation
   · NO RandomCrop  ← the fix that mattered
         │
         ▼
   Training_loop (training_loop.py)
   ─────────────────────────────────────────────────────
   · stage 1: classifier head only, Adam lr=1e-4
   · stage 2: deeper layers unfrozen, Adam lr=1e-5
   · weighted CrossEntropyLoss (balanced)
   · ReduceLROnPlateau on validation F1
   · early stopping, patience=4, save best-F1 checkpoint
         │
         ▼
   Evaluation (evaluation_loop.py)  →  benchmark 3 architectures
         │
         ▼
   Final_model.py  →  ResNet-34 inference wrapper
         │
         ▼
   main.py — FastAPI
   ─────────────────────────────────────────────────────
   · serves React bundle at /  AND  API routes, one origin
   · /samples  /image/{id}  /predict  /predict/sample/{id}
         │
         ▼
   Docker  →  Azure Container Registry  →  Azure Container Apps
```

---

## ⚙️ Preprocessing & Feature Pipeline

Medical DICOM images need different handling from ordinary photos.

**Image Pipeline**

| Step | Purpose |
|---|---|
| `pydicom.dcmread()` | Read DICOM, extract `pixel_array` (1024×1024, uint8) |
| `ToPILImage()` | Convert NumPy array to PIL for torchvision transforms |
| `Grayscale(num_output_channels=3)` | Pretrained models expect 3 channels; X-rays are 1 |
| `Resize([256])` | Downscale while **preserving the full field of view** |
| `ToTensor()` | To tensor, scale to `[0, 1]` |
| `Normalize(ImageNet mean/std)` | Match the statistics the pretrained backbone was trained on |

**Training-time augmentation (after the crop fix)**

| Transform | Kept? | Reasoning |
|---|---|---|
| `RandomCrop` | ❌ **Removed** | Discarded 95% of the image while keeping the study-level label |
| `RandomHorizontalFlip(0.1)` | ✅ | Low probability — anatomy is not truly symmetric, but mild flips add robustness |
| `RandomRotation(±10°)` | ✅ | Simulates real patient positioning variation |
| `ColorJitter(0.1, 0.1)` | ✅ | Mimics exposure and contrast differences between machines |

> 🔑 **Critical detail:** inference uses the **same `val_transform` as evaluation** — no crop, no
> flip, no jitter. If preprocessing differs between evaluation and serving, your reported metrics
> describe a model that is not the one answering requests.

---

## 🧪 Model Training & Hyperparameter Decisions

Three ImageNet-pretrained backbones, trained in two stages each.

**Why two stages?** Training only the classifier head keeps ImageNet features frozen — but chest
X-rays look nothing like ImageNet photos. Unfreezing deeper layers at a *lower* learning rate lets
those features adapt without being destroyed.

| Model | Stage 1 (head only) | Stage 2 (fine-tuned) |
|---|---|---|
| DenseNet-121 | `classifier` → 2 outputs, Adam `lr=1e-4` | `features.denseblock4` + `norm5` unfrozen, `lr=1e-5` |
| EfficientNet-B2 | `classifier` → 2 outputs, Adam `lr=1e-4` | `features[8]` unfrozen, `lr=1e-5` |
| ResNet-34 | `fc` → 2 outputs, Adam `lr=1e-4` | `layer4` unfrozen, `lr=1e-5` |

**Shared training configuration**

| Setting | Value | Why |
|---|---|---|
| Loss | Weighted `CrossEntropyLoss` | Reprices missed pneumonia |
| Scheduler | `ReduceLROnPlateau(patience=2, factor=0.1, mode='max')` | Drops LR when **validation F1** stalls, not on a fixed schedule |
| Early stopping | `patience=4` on validation F1 | Stops once generalisation stops improving |
| Max epochs | 30 | Rarely reached — early stopping fires first |
| Checkpointing | Save **only** on F1 improvement | Restored model is the best seen, not the last trained |

```python
if best_f1 < f1:
    best_f1 = f1
    counter = 0
    torch.save(model.state_dict(), f'{model_name}_bestweights.pth')
else:
    counter += 1
if counter >= patience:
    print("Early Stopping")
    break
```

> 💡 **Selection metric matters.** Both the scheduler and early stopping watch **F1**, not accuracy.
> On imbalanced data, an accuracy-driven scheduler would happily reward the model for getting
> better at saying "no".

---

## 📊 Model Performance

> ✅ **All metrics below are from models trained with `RandomCrop` removed** — the corrected
> pipeline described in Challenge 3. Class 1 = Pneumonia.

### 🎯 Final Test Set Result

**ResNet-34, fine-tuned. Evaluated exactly once, at the end. 1,836 held-out studies.**

| Metric | No Pneumonia | **Pneumonia** |
|---|---|---|
| Precision | 0.92 | **0.75** |
| Recall | 0.87 | **0.83** |
| F1-score | 0.89 | **0.79** |
| Support | 1,245 | 591 |
| **Accuracy** | | **0.86** |

> 📌 Predicting "No Pneumonia" for every study would score **68%** accuracy on this split and be
> clinically worthless. The pneumonia column is the one that means anything — and **83% recall**
> means the model catches roughly 5 in 6 actual cases.

### 🔬 Architecture Comparison (Validation Set)

Pneumonia-class metrics, identical split and protocol:

| Model | Stage | Precision | Recall | F1 | Accuracy |
|---|---|---|---|---|---|
| DenseNet-121 | head only | 0.57 | 0.83 | 0.68 | 0.76 |
| DenseNet-121 | fine-tuned | 0.67 | **0.86** | 0.75 | 0.83 |
| EfficientNet-B2 | head only | 0.62 | 0.82 | 0.70 | 0.78 |
| EfficientNet-B2 | fine-tuned | 0.62 | 0.83 | 0.71 | 0.78 |
| ResNet-34 | head only | 0.65 | 0.61 | 0.63 | 0.78 |
| 🏆 **ResNet-34** | **fine-tuned** | **0.72** | 0.83 | **0.77** | **0.85** |

**Selected Model: ResNet-34 (fine-tuned)**

- Highest F1 on the pneumonia class (0.77)
- Best precision/recall balance — DenseNet reached higher recall (0.86) but at 0.67 precision,
  meaning noticeably more false alarms
- Highest overall accuracy (0.85)

**Two observations worth recording:**

| Observation | Evidence |
|---|---|
| 📈 Fine-tuning is not optional | ResNet-34 jumped **0.63 → 0.77** F1 once deeper layers were unfrozen |
| 📉 More trainable layers ≠ better | EfficientNet-B2 barely moved: **0.70 → 0.71**. "Unfreeze more" is not a strategy |

### 🎚️ Threshold Analysis

`argmax` implicitly decides at p = 0.5, which is rarely the best operating point on imbalanced data.
Softmax probabilities were inspected on validation and the decision threshold swept on Kaggle to
find an F1-oriented operating point.

Training a model and choosing its decision threshold are **two separate decisions**, and only
validation data was used for the second.

> ⚠️ The deployed API currently still uses `argmax`. Applying the tuned threshold is in the
> [roadmap](#-future-roadmap).

---

## ☁️ Compute

Development ran on a **MacBook**, which was not enough — training CNNs on 1024 × 1024 medical images
locally was impractically slow.

Training therefore moved to **Kaggle Notebooks** for free GPU access, including the final no-crop
retrain that produced the deployed weights. The code is device-aware: `mps` locally, CUDA on Kaggle,
CPU inside the container.

---

## 🚀 From Model to Application

A trained `.pth` file is not a product. The serving path:

```
DICOM upload
    ↓  pydicom.dcmread()
Pixel array (1024 × 1024, uint8)
    ↓  val_transform — grayscale→3ch, resize 256, ImageNet normalise
Tensor (1, 3, 256, 256)
    ↓  ResNet-34, torch.no_grad()
Logits
    ↓  torch.softmax(dim=1)
P(pneumonia)
    ↓
JSON response
```

The model loads **lazily on first prediction** rather than at import, so a slow load can never stop
the API from binding its port.

### 🔌 API Reference

| Route | Method | Returns |
|---|---|---|
| `/` | GET | The React interface |
| `/api` | GET | Service status |
| `/samples` | GET | The 100 bundled sample studies |
| `/image/{id}` | GET | A study rendered as PNG |
| `/predict/sample/{id}` | POST | Prediction for a bundled study |
| `/predict` | POST | Prediction for an uploaded `.dcm` file |
| `/docs` | GET | Swagger UI |

```json
{ "label": "Pneumonia", "pneumonia": true, "probability": 0.68 }
```

> `probability` is **P(pneumonia)** — not the confidence of whichever class won. A negative
> prediction therefore returns a *low* number, and the interface's probability bar reads correctly
> in both directions.

### 💰 The Database I Built and Then Deleted

The backend originally used **SQLAlchemy with PostgreSQL** on Azure — ORM models, a seed script,
session management, the whole setup. It worked fine.

Then I priced it:

| | Before | After |
|---|---|---|
| PostgreSQL (`Standard_B1ms` + 32 GB) | $25.68/mo | **deleted** |
| Container Registry (Basic) | $5.06/mo | $5.06/mo |
| Container App (scale-to-zero) | $0.00/mo | $0.00/mo |
| **Total** | **$30.74/mo** | **$5.06/mo** |

The database was **84% of the hosting bill**, and the table it served held exactly one thing: a copy
of `UserCase_studies.csv` — a 4 KB file already inside the container image. Static reference data
that never changed, with no reason to live in a database.

I replaced it with [`Backend/store.py`](Backend/store.py), which loads the same CSV into a dict at
startup, and deleted the server. **Identical API responses, no data lost, bill cut by 84%.**

> The SQLAlchemy code remains in `Backend/database.py` and `Backend/seed.py` for reference, no
> longer imported. I'm keeping this in the README rather than quietly deleting it — deciding a
> component you built *should not exist* is a more useful skill than adding one.

---

## 🐳 Deployment

```
Source code
    ↓  docker buildx build --platform linux/amd64
Docker image (519 MB)
    ↓  docker push
Azure Container Registry
    ↓  az containerapp update
Azure Container Apps  →  public HTTPS URL
```

**One process serves everything.** FastAPI serves the built React bundle at `/` and mounts the API
routes alongside it, so the browser calls `/samples` on its own origin — **no CORS configuration, no
reverse proxy, no second service to pay for.**

**Deployment notes worth recording:**

| Note | Detail |
|---|---|
| 🏗️ Platform flag is mandatory | Container Apps runs x86 only; Apple Silicon needs `--platform linux/amd64` |
| 🚫 `az acr build` is blocked | Not available on Azure for Students — images must be built locally |
| 📦 Layer order matters | Dependencies install *before* `COPY . .`, so a code change re-uploads a few MB instead of the ~400 MB PyTorch layer |
| 💤 `min-replicas 0` | Free while idle, at the cost of a ~34s cold start |
| ⚡ PNG caching | Rendered images cached in memory with immutable headers — revisits take 3 ms instead of 900 ms |

**Running cost: $5.06/month** — entirely the container registry. Compute is free under the Container
Apps monthly grant (180,000 vCPU-seconds), which a demo never approaches.

---

## 💡 Key Learnings

**1. 🔍 Look at your data before you tune your model**
I spent real time on architectures and loss functions while the actual problem was that my
augmentation pipeline was feeding the model 5% crops of a 1024² image. No architecture would have
fixed that. Checking the input resolution took thirty seconds and was the highest-value thing I did.

**2. 📋 A standard recipe is not a neutral choice**
The ImageNet pipeline I copied encoded an assumption — that a random crop still contains the subject
— true for photos, false for radiographs. Borrowed defaults carry borrowed assumptions.

**3. 📊 Accuracy hid the failure**
The first model had respectable accuracy and was useless. On imbalanced data the aggregate metric is
the one that will lie to you most convincingly. Per-class recall is where I should have looked first.

**4. ⚖️ Class weighting reprices errors; it does not fix data**
Necessary but not sufficient. Understanding *why* — that it changes the loss, not the distribution —
stopped me from expecting it to solve everything.

**5. 🧬 Leakage in medical data hides in the patient ID**
Splitting rows instead of patients would have inflated every number silently. In medical datasets,
the unit you split on is almost never the row.

**6. 🔒 Keeping the test set untouched is uncomfortable and correct**
Every decision came from validation. The test set was evaluated once. It is genuinely tempting to
peek, and the whole value of the number depends on not doing so.

**7. 🏗️ The model was maybe a third of the work**
Serving it, matching preprocessing between evaluation and inference, containerising it, deploying
it, then noticing the hosting bill was 84% one unnecessary database — none of that is model work,
and all of it decides whether anyone can actually use the thing.

---

## 🛠️ Tech Stack

![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![PyTorch](https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)
![NumPy](https://img.shields.io/badge/NumPy-013243?style=for-the-badge&logo=numpy&logoColor=white)
![Pandas](https://img.shields.io/badge/Pandas-150458?style=for-the-badge&logo=pandas&logoColor=white)

![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Azure](https://img.shields.io/badge/Microsoft_Azure-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white)
![Kaggle](https://img.shields.io/badge/Kaggle-20BEFF?style=for-the-badge&logo=kaggle&logoColor=white)
![Jupyter](https://img.shields.io/badge/Jupyter-F37626?style=for-the-badge&logo=jupyter&logoColor=white)
![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white)

| Area | Tools |
|---|---|
| Deep Learning | PyTorch, torchvision |
| Medical Imaging | pydicom |
| Data & Metrics | NumPy, pandas, scikit-learn |
| Backend | FastAPI, uvicorn |
| Frontend | React 19, TypeScript, Vite |
| Data (historic) | SQLAlchemy, PostgreSQL — since removed |
| Deployment | Docker, Azure Container Registry, Azure Container Apps |
| Training Compute | Kaggle Notebooks (GPU), MacBook (local dev) |

---

## 📁 Project Structure

```
RSNA-Pneumonia-Detection/
│
├── Essentials/                     # training pipeline
│   ├── Dataset_class.py            # RSNA_Dataset + make_transform
│   ├── split_data.py               # patient-level split
│   ├── models.py                   # DenseNet / EfficientNet / ResNet wrappers
│   ├── training_loop.py            # early stopping + best-F1 checkpointing
│   └── evaluation_loop.py          # validation / test evaluation
│
├── Backend/
│   ├── store.py                    # CSV-backed sample index (replaced the DB)
│   ├── database.py                 # SQLAlchemy models — reference only, unused
│   └── seed.py                     # DB seeding — reference only, unused
│
├── web/                            # React + TypeScript + Vite frontend
│   ├── src/
│   └── dist/                       # built bundle, served by FastAPI
│
├── main.py                         # FastAPI app: API routes + static frontend
├── Final_model.py                  # inference wrapper around ResNet-34
├── Experiments.ipynb               # training, evaluation, architecture comparison
├── UserCase_studies.csv            # the 100 bundled sample studies
├── Dockerfile
├── requirements.txt
└── README.md
```

**Gitignored for size:** `Dataset/`, `model_weights/`, `Essentials/resnet_model/`, `selected_images/`

---

## ⚡ Installation & Usage

**1. Clone the repository**

```bash
git clone https://github.com/NaramCharan/RSNA-Pneumonia-Detection.git
cd RSNA-Pneumonia-Detection
```

**2. Install dependencies**

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
```

**3. Run the application**

```bash
uvicorn main:app --reload
```

Open **http://127.0.0.1:8000** — FastAPI serves both the interface and the API.

**Or with Docker:**

```bash
docker build -t rsna-pneumonia .
docker run -p 8000:8000 rsna-pneumonia
```

> 📋 **Before you run it:** `Dataset/`, `model_weights/` and `Essentials/resnet_model/` are
> gitignored for size. Get the DICOM data from the
> [Kaggle competition page](https://www.kaggle.com/competitions/rsna-pneumonia-detection-challenge);
> the trained weights (`unfreezedresnet_bestweights.pth`, ~85 MB) must be supplied separately or
> regenerated by re-running `Experiments.ipynb`.

> 🔁 **Pipeline Execution Flow**
>
> `📂 DICOM Loading` → `🧬 Patient-Level Split` → `🖼️ Transform Pipeline` → `🏋️ Stage 1 Head Training` → `🔓 Stage 2 Fine-Tuning` → `📉 LR Scheduling + Early Stopping` → `📊 Architecture Benchmark` → `🎚️ Threshold Analysis` → `🔒 Single Test Evaluation` → `🐳 Docker` → `☁️ Azure`

---

## ⚠️ Limitations

> 🩺 **This is an educational project, not a clinical tool.** It has not been clinically validated
> and must not be used for medical decisions.

- **Image-level classification only.** The original RSNA challenge is a *localisation* task —
  predicting bounding boxes around opacities. This predicts one label per study, a strictly easier
  problem. The comparison is not like-for-like.
- **The test set is 6% of the data** (1,836 studies). Enough for one honest estimate, narrow enough
  that the numbers carry real uncertainty.
- **Single split, no cross-validation.** Results would shift somewhat with a different random seed.
- **One dataset, one source.** No external validation, so generalisation to radiographs from other
  hospitals or equipment is untested — a well-documented weakness of medical imaging models.
- **Labels are imperfect.** RSNA annotations come from human readers, and radiologists disagree on
  ambiguous cases. Label quality sets the ceiling.
- **25% of flagged studies are false alarms** (precision 0.75), and **17% of pneumonia cases are
  missed** (recall 0.83). Both matter clinically, in different directions.

---

## 🔮 Future Roadmap

- [ ] **Cross-validation instead of a single split**, for error bars on the metrics
- [ ] **External validation on a different chest X-ray dataset** — the real test of generalisation
- [ ] **Higher-resolution training** now that the cropping problem is understood
- [ ] **Grad-CAM overlays** — show *where* the model is looking. On a medical task this is close to
      essential, both for trust and for catching a model that is right for the wrong reason
- [ ] Move toward the original localisation task (bounding boxes), not just classification

---

## 🙏 Acknowledgements

- **Dataset:** [RSNA Pneumonia Detection Challenge](https://www.kaggle.com/competitions/rsna-pneumonia-detection-challenge),
  Radiological Society of North America, hosted on Kaggle
- **Compute:** Kaggle Notebooks, for the free GPU access without which this would not have been
  trainable
- **Pretrained weights:** torchvision ImageNet models (DenseNet-121, EfficientNet-B2, ResNet-34)

**On how this was built:** the machine learning pipeline — dataset handling, transforms, training,
evaluation, model selection — and the FastAPI/SQLAlchemy backend were written by me. The React
frontend and the Azure deployment were done with the help of an AI coding assistant, as a self-paced
learner working through cloud deployment for the first time.

---

## 📬 Contact

**Naram Charan**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?logo=linkedin)](https://www.linkedin.com/in/naramcharan/)
[![Email](https://img.shields.io/badge/Email-charannaram1710@gmail.com-red?logo=gmail)](mailto:charannaram1710@gmail.com)

---

*🩺 Educational project. Not for clinical use.*

*If this project helped you, consider giving it a ⭐ on GitHub.*
