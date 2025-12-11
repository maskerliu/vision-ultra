from ultralytics import YOLO
from pathlib import Path

print("yolo11")
model11 = YOLO(Path("./yolo11n.pt"))
results = model11("./bus.jpg")
for result in results:
  print(result.boxes)

# model11.export(format="tfjs")
print("yolov10n")
# YOLOv10 通过为NMS 训练引入一致的双重分配和以效率-准确性为导向的整体模型设计策略，解决了这些问题
modelv10 = YOLO("./yolov10n.pt")
results = modelv10("./bus.jpg")
for result in results:
  print(result.boxes)

# modelv10.export(format="tfjs")
print("yolov8n")
modelv8 = YOLO("./yolov8n.pt")
results = modelv8("./bus.jpg")

print("yolov6n")
# YOLOv6 是一种先进的对象检测器，在速度和准确性之间提供了卓越的平衡，使其成为实时应用的热门选择
modelv6 = YOLO("./yolov6n.pt")
modelv6.info()
results = modelv6("bus.jpg")
# modelv6.export(format="tfjs")

