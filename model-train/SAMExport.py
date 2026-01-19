from ultralytics import SAM
import cv2
import numpy as np
from ultralytics.models.sam import SAM2DynamicInteractivePredictor
from ultralytics.utils.plotting import Annotator, colors

# # Load a model
model = SAM("./sam2.1_t.pt")
# # Display model information (optional)
# model.info()
results = model("./bus.jpg", )
# print(results)

if results[0].masks is not None:
    masks, boxes = results[0].masks.cpu().numpy(), results[0].boxes.cpu().numpy()
    masks = np.array(masks)
    im = cv2.imread("./bus.jpg")
    annotator = Annotator(im, pil=False)
    annotator.masks(masks, [colors(x, True) for x in range(len(masks))])

    cv2.imshow("result", annotator.result())
    cv2.waitKey(0)
# model.export(format="tfjs", half=True)
