from ultralytics import YOLO
from pathlib import Path

model = YOLO(Path("./model-train/models/yolo11n.pt"))


results = model("https://ultralytics.com/images/bus.jpg")

model.export(format="tfjs")