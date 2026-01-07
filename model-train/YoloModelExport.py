from ultralytics import YOLO
from pathlib import Path

# print("yolo11")
# model11 = YOLO(Path("./yolo11n.pt"))
# results = model11("./bus.jpg")
# model11.export(
#     format="tfjs",
#     half=True,
# )

# model11.export(format="tfjs")
# print("yolov10n")
# YOLOv10 通过为NMS 训练引入一致的双重分配和以效率-准确性为导向的整体模型设计策略，解决了这些问题
# modelv10 = YOLO("./yolov10n.pt")
# results = modelv10("./bus.jpg")
# modelv10.export(
#     format="tfjs",
#     half=True,
# )

# modelv10.export(format="tfjs")
# print("yolov8n")
# modelv8 = YOLO("./yolov8n.pt")
# results = modelv8("./bus.jpg")
# modelv8.export(
#     format="tfjs",
#     half=True,
# )
# for result in results:
#     print(result.boxes)

# print("yolov6n")
# YOLOv6 是一种先进的对象检测器，在速度和准确性之间提供了卓越的平衡，使其成为实时应用的热门选择
# modelv6 = YOLO("./yolov6n.yaml")
# modelv6.info()
# results = modelv6("bus.jpg")
# for result in results:
#     print(result.boxes)
# modelv6.export(format="tfjs", half=True)

# modelv6 = YOLO("./yolov6n.yaml")
# modelv6.info()
# results = modelv6.train(data="coco8.yaml", epochs=100, imgsz=640)
# results = modelv6("bus.jpg")
# for result in results:
#     print(result.boxes)
# modelv6.export(format="tfjs", half=True)


model11n_seg = YOLO("./yolo11s.pt")
# results = model11n_seg("bus.jpg")
# for result in results:
#     print(result.masks)

model11n_seg.export(format="tfjs", half=True, int8=True)
