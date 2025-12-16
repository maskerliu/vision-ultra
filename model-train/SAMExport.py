from ultralytics import SAM

# Load a model
model = SAM("./sam2.1_t.pt")

# Display model information (optional)
model.info()

results = model("./bus.jpg", bboxes=[100, 100, 200, 200])

print(results)


model.export(format="tfjs", half=True)
