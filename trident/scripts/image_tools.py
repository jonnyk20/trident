import cv2
from pathlib import Path

cwd = Path.cwd()/'trident/scripts'
IMAGE_PATH = str(cwd/'rockfish.jpg')
mlDir = cwd/'tf_files'


def get_image():
    img = cv2.imread(IMAGE_PATH)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    return img