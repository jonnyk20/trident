import React, { useState, useRef, Fragment } from "react";
import { getImageOrientation, adjustCanvas, argMax } from "./utils";
import LoadingSpinner from "./components/LoadingSpinner";
import Boxes from "./components/Boxes";
import sampleFishPhoto from "./images/rockfish.jpg";
import {
  ML_STATUSES,
  DETECTION_MODEL_URL,
  CLASSIFICATION_MODEL_URL
} from "./constants";
import "./styles.scss";

const classificationLabels = [
  "black",
  "blue",
  "brown",
  "canary",
  "china",
  "copper",
  "grass",
  "quillback",
  "tiger",
  "vermillion",
  "yelloweye",
  "yellowtail"
];

const runSampleDetection = async () => {
  const response = await fetch("/sample");
  const json = await response.json();

  return json;
};

const RockfishDemo = () => {
  const [classifiedBoxes, setClassifiedBoxes] = useState([]);

  const [hiddenSrc, setHiddenSrc] = useState(null);
  const [isSample, setIsSample] = useState(false);
  const [resizedSrc, setResizedSrc] = useState(null);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState(ML_STATUSES.READY_FOR_DETECTION);
  const [isImageReady, setIsImageReady] = useState(false);
  const [orientation, setOrientation] = useState(0);
  const [dimensions, setDimensions] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const inputRef = useRef();
  const hiddenRef = useRef();
  const resizedRef = useRef();
  const rotationCanvasRef = useRef();
  const hiddenCanvasRef = useRef();
  const cropRef = useRef();

  const formatScore = score => (score * 100).toFixed(2);

  const getTopClassification = classifications => {
    const { class: label, score } = classifications[0];

    return {
      label,
      score: formatScore(score)
    };
  };

  const formatBoxCoordinates = (coords, index) => {
    const { current: img } = rotationCanvasRef;
    const { width: imgW, height: imgH } = img;
    const topLeft = [coords[1] * imgW, coords[0] * imgH];
    const bottomRight = [coords[3] * imgW, coords[2] * imgH];
    const boxW = bottomRight[0] - topLeft[0];
    const boxH = bottomRight[1] - topLeft[1];
    const boxX = topLeft[0];
    const boxY = topLeft[1];
    return {
      index,
      x: boxX,
      y: boxY,
      w: boxW,
      h: boxH
    };
  };

  const drawBoxes = results => {
    const classifiedBoxes = results.map((result, i) => {
      return {
        ...formatBoxCoordinates(result.raw_coords, i),
        ...getTopClassification(result.classifications)
      };
    });
    console.log("CLASSIFIED", classifiedBoxes);
    setClassifiedBoxes(classifiedBoxes);
    setStatus(ML_STATUSES.COMPLETE);
  };

  const runDetection = async () => {
    const formData = new FormData();
    formData.append("upload", imageFile);
    const response = await fetch("/classify/", {
      method: "POST",
      body: formData
    });
    const json = await response.json();

    return json;
  };

  const detect = async () => {
    const { current: img } = rotationCanvasRef;
    let predictionFailed = false;
    setStatus(ML_STATUSES.DETECTING);
    let res;
    try {
      // _JK
      if (isSample) {
        res = await runSampleDetection();
      } else {
        res = await runDetection(imageFile);
      }
      drawBoxes(res);
      console.log("RES", res);
    } catch (err) {
      predictionFailed = true;
    }
    setError(predictionFailed);
  };

  const handleLoad = () => {
    const { current: img } = hiddenRef;
    const width = img.width,
      height = img.height;
    const { current: canvas } = hiddenCanvasRef;
    const ctx = canvas.getContext("2d");
    adjustCanvas(canvas, ctx, width, height, orientation);
    ctx.drawImage(img, 0, 0);
    setResizedSrc(canvas.toDataURL());
  };

  const resize = () => {
    const { innerWidth: maxWidth } = window;
    const { current: canvas } = rotationCanvasRef;
    const ctx = canvas.getContext("2d");
    const { current: img } = resizedRef;
    let { height, width } = img;

    if (width > maxWidth) {
      const ratio = width / height;
      width = maxWidth;
      height = maxWidth / ratio;
    }
    canvas.width = width;
    canvas.height = height;
    setDimensions({ width, height });
    ctx.drawImage(img, 0, 0, width, height);
    setStatus(ML_STATUSES.READY_FOR_DETECTION);
    setIsImageReady(true);
  };

  const handleChange = event => {
    const { files } = event.target;
    if (files.length > 0) {
      const file = event.target.files[0];
      const hiddenSrc = URL.createObjectURL(file);
      setImageFile(file);
      getImageOrientation(event.target.files[0], orientation => {
        setOrientation(orientation);
        setHiddenSrc(hiddenSrc);
      });
    }
  };

  const getSamplePhoto = () => {
    setImageFile(sampleFishPhoto);
    setResizedSrc(sampleFishPhoto);
    setIsSample(true);
  };

  const clearImage = () => {
    const canvas = rotationCanvasRef.current;
    const context = canvas.getContext("2d");

    context.clearRect(0, 0, canvas.width, canvas.height);
    setIsImageReady(false);
  };

  const reset = e => {
    e.stopPropagation();
    setStatus(ML_STATUSES.READY_FOR_DETECTION);
    setResizedSrc(null);
    setClassifiedBoxes([]);
    clearImage();
  };

  const triggerInput = () => {
    inputRef.current.click();
  };

  const hidden = {
    display: "none"
  };

  const showSpinner = status === ML_STATUSES.DETECTING;
  const isComplete = status === ML_STATUSES.COMPLETE;
  console.log("JUICY", sampleFishPhoto);
  console.log("SMOOLIYSY", typeof sampleFishPhoto);

  return (
    <div className="wrapper" style={isImageReady ? { ...dimensions } : {}}>
      <img
        id="hidden-upload-placeholder"
        src={hiddenSrc}
        ref={hiddenRef}
        style={hidden}
        onLoad={handleLoad}
      />
      <img
        id="resized-placeholder"
        src={resizedSrc}
        ref={resizedRef}
        style={hidden}
        onLoad={resize}
      />
      <canvas ref={hiddenCanvasRef} id="hidden-canvas" style={hidden} />
      <canvas
        ref={rotationCanvasRef}
        style={isImageReady ? {} : hidden}
        id="adjusted-image"
      />
      <Boxes boxes={classifiedBoxes} />
      {isImageReady && <div className="overlay" />}

      <div className="control">
        {status === ML_STATUSES.READY_FOR_DETECTION && isImageReady && (
          <button onClick={detect} className="control__button">
            Identify Rockfish
          </button>
        )}
        {showSpinner && <LoadingSpinner />}
        {status === ML_STATUSES.DETECTING && <div>Detecting...</div>}
        {!isImageReady && status === ML_STATUSES.READY_FOR_DETECTION && (
          <Fragment>
            <button href="#" onClick={triggerInput} className="control__button">
              Upload a Photo
            </button>
            <div className="separator">- OR -</div>
            <button
              href="#"
              onClick={getSamplePhoto}
              className="control__button"
            >
              Use a Sample
            </button>
          </Fragment>
        )}
        {isComplete && error && (
          <div>
            Failed to Find Fish <br />
          </div>
        )}

        {isComplete && (
          <button onClick={reset} className="control__button">
            Reset
          </button>
        )}

        <input
          type="file"
          accept="image/*"
          capture="camera"
          onChange={handleChange}
          ref={inputRef}
          id="file-input"
          className="control__input"
        />
      </div>
      <canvas className="cropped" ref={cropRef} style={hidden} />
    </div>
  );
};

export default RockfishDemo;
