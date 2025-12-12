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

modelv6 = YOLO("./yolov6n.yaml")
# modelv6.info()
results = modelv6.train(data="coco8.yaml", epochs=100, imgsz=640)
results = modelv6("bus.jpg")
# for result in results:
#     print(result.boxes)
# modelv6.export(format="tfjs", half=True)


def wrap_detection(self, input_image, out_data):
    confidences = []
    boxes = []
    kypts = []
    rows = out_data.shape[0]

    image_width, image_height, _ = input_image.shape

    x_factor = image_width / 640.0
    y_factor = image_height / 640.0

    sd = np.zeros((5, 2), dtype=np.float32)
    sd[0:5] = (x_factor, y_factor)
    sd = np.squeeze(sd.reshape((-1, 1)), 1)
    # xyxy,lmdks,conf,cls,
    for r in range(rows):
        row = out_data[r]
        conf = row[14]
        cls = row[15]
        if conf > 0.25 and cls > 0.25:
            confidences.append(conf)
            x, y, w, h = row[0].item(), row[1].item(), row[2].item(), row[3].item()
            left = int((x - 0.5 * w) * x_factor)
            top = int((y - 0.5 * h) * y_factor)
            width = int(w * x_factor)
            height = int(h * y_factor)
            box = np.array([left, top, width, height])
            boxes.append(box)
            kypts.append(np.multiply(row[4:14], sd))

    indexes = cv.dnn.NMSBoxes(boxes, confidences, 0.25, 0.25)

    result_confidences = []
    result_boxes = []
    result_kypts = []

    for i in indexes:
        result_confidences.append(confidences[i])
        result_boxes.append(boxes[i])
        result_kypts.append(kypts[i])

    return result_kypts, result_confidences, result_boxes
