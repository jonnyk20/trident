#!/usr/bin/env python
# coding: utf-8

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from pathlib import Path
from PIL import Image
import numpy as np
import tensorflow as tf
import time
import cv2
import sys
import time
import tensorflow as tf

cwd = Path.cwd()/'trident/scripts'
IMAGE_PATH = str(cwd/'fish.jpg')
mlDir = cwd/'tf_files'


def load_graph(model_file):
    graph = tf.Graph()
    graph_def = tf.GraphDef()

    with open(str(model_file), "rb") as f:
        graph_def.ParseFromString(f.read())
    with graph.as_default():
        tf.import_graph_def(graph_def)

    return graph


def load_labels(label_file):
    label = []
    proto_as_ascii_lines = tf.gfile.GFile(label_file).readlines()
    for l in proto_as_ascii_lines:
        label.append(l.rstrip())
    return label


def read_tensor_from_image_file(cropped_file, input_height=299, input_width=299,
                                input_mean=0, input_std=255):
    input_name = "file_reader"
    output_name = "normalized"
    data_tf = tf.convert_to_tensor(cropped_file, np.float32)
    float_caster = tf.cast(data_tf, tf.float32)
    dims_expander = tf.expand_dims(float_caster, 0)
    resized = tf.image.resize_bilinear(
        dims_expander, [input_height, input_width])
    normalized = tf.divide(tf.subtract(resized, [input_mean]), [input_std])
    sess = tf.Session()
    result = sess.run(normalized)

    return result


def classify(file):
    print('CLASSIFYING')
    file_name = mlDir/"fish.jpg"
    model_file = mlDir/"retrained_graph.pb"
    label_file = mlDir/"retrained_labels.txt"
    input_height = 224
    input_width = 224
    input_mean = 128
    input_std = 128
    input_layer = "input"
    output_layer = "final_result"

    graph = load_graph(model_file)
    t = read_tensor_from_image_file(file,
                                    input_height=input_height,
                                    input_width=input_width,
                                    input_mean=input_mean,
                                    input_std=input_std)

    input_name = "import/" + input_layer
    output_name = "import/" + output_layer
    input_operation = graph.get_operation_by_name(input_name)
    output_operation = graph.get_operation_by_name(output_name)

    with tf.Session(graph=graph) as sess:
        start = time.time()
        results = sess.run(output_operation.outputs[0],
                           {input_operation.outputs[0]: t})
        end = time.time()
    results = np.squeeze(results)

    top_k = results.argsort()[-5:][::-1]
    labels = load_labels(str(label_file))

    print('\nEvaluation time (1-image): {:.3f}s\n'.format(end-start))
    template = "{} (score={:0.5f})"
    output = []
    for i in top_k:
        print(template.format(labels[i], results[i]))
        output.append({ 'class': labels[i], 'score': np.float64(results[i])})
    return output

class Object_Detector():
    def __init__(self, model_path):
        self.__load_model(model_path)
        print('model loaded')

    def __load_model(self, model_path):
        self.detection_graph = tf.Graph()
        with self.detection_graph.as_default():
            od_graph_def = tf.GraphDef()
            with tf.gfile.GFile(model_path, 'rb') as fid:
                serialized_graph = fid.read()
                od_graph_def.ParseFromString(serialized_graph)
                tf.import_graph_def(od_graph_def, name='')

        config = tf.ConfigProto()
        config.gpu_options.allow_growth = True

        with self.detection_graph.as_default():
            self.sess = tf.Session(config=config, graph=self.detection_graph)
            self.image_tensor = self.detection_graph.get_tensor_by_name(
                'image_tensor:0')
            self.detection_boxes = self.detection_graph.get_tensor_by_name(
                'detection_boxes:0')
            self.detection_scores = self.detection_graph.get_tensor_by_name(
                'detection_scores:0')
            self.detection_classes = self.detection_graph.get_tensor_by_name(
                'detection_classes:0')
            self.num_detections = self.detection_graph.get_tensor_by_name(
                'num_detections:0')

        # load label_dict
        self.label_dict = {1: 'fish'}

        # warmup
        self.detect_image(np.ones((600, 600, 3)))

    def detect_image(self, image_np, score_thr=0.5, print_time=True):
        image_w, image_h = image_np.shape[1], image_np.shape[0]
        detections = []

        # Actual detection.
        t = time.time()
        (boxes, scores, classes, num) = self.sess.run(
            [self.detection_boxes, self.detection_scores,
                self.detection_classes, self.num_detections],
            feed_dict={self.image_tensor: np.expand_dims(image_np, axis=0)})
        high_scores  = scores[scores > score_thr]
        if print_time:
            print('detection time :', time.time()-t)
        # Visualization of the results of a detection.
        for i, box in enumerate(boxes[scores > score_thr]):
            top_left = (int(box[1]*image_w), int(box[0]*image_h))
            bottom_right = (int(box[3]*image_w), int(box[2]*image_h))

            # cropping
            cropped = image_np[top_left[1]:bottom_right[1],
                               top_left[0]:bottom_right[0]]
#             cv2.imwrite(CROPPED_PATH, cropped)
            classifications = classify(cropped)
            detection = {
                'raw_coords': np.float64(box).tolist(),
                'score': np.float64(high_scores[i]),
                'coords': [top_left, bottom_right],
                'classifications': classifications
            }
            detections.append(detection)

            cv2.rectangle(image_np, top_left, bottom_right, (0, 255, 0), 3)
            cv2.putText(image_np, self.label_dict[int(
                classes[0, i])], top_left, cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

        return detections


# MODEL_PATH = 'fish_ssd_fpn_graph/frozen_inference_graph.pb'
DETECTOR_PATH = str(cwd/'rcnn.pb')


object_detector = Object_Detector(DETECTOR_PATH)

def run(img):
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    result = object_detector.detect_image(img, score_thr=0.8)
    return result

# run()