const input = document.getElementById("input");
const uploadLabel = document.getElementById("upload");
const loadButton = document.getElementById("load");
const identifyButton = document.getElementById("identify");
const resetButton = document.getElementById("reset");
const resultsContainer = document.getElementById("results");
const progressIndicator = document.getElementById("progress");
const image = document.getElementById("image");

const formatClassAndScore = (label, score) =>
  `${label}: %${(score * 100).toFixed(2)}`;

const dynamicElements = [
  uploadLabel,
  //   loadButton,
  identifyButton,
  resetButton,
  progressIndicator,
  resultsContainer
];

const hideElement = el => (el.style.display = "none");
const showElement = el => (el.style.display = "initial");

const showOnly = elementsToShow => {
  dynamicElements.forEach(hideElement);
  elementsToShow.forEach(showElement);
};

let file;

const handleUpload = event => {
  const { files } = event.target;
  if (files.length > 0) {
    file = files[0];
    image.src = URL.createObjectURL(files[0]);
    showOnly([identifyButton]);
  }
};

const upload = async e => {
  showOnly([progressIndicator]);
  const formData = new FormData();
  formData.append("upload", file);
  const response = await fetch("/classify/", {
    method: "POST",
    body: formData
  });
  const json = await response.json();
  console.log("JSON", json);
  return;
  const formattedResults = json.results.map(({ className, probability }) =>
    formatClassAndScore(className, probability)
  );
  renderClassifications(formattedResults);
  showOnly([resultsContainer, resetButton]);
};

const renderClassifications = predictions => {
  predictions.forEach(prediction => {
    el = document.createElement("li");
    el.innerText = prediction;
    resultsContainer.appendChild(el);
  });
};

const reset = () => {
  showOnly([uploadLabel]);
  image.src = "";
  resultsContainer.innerHTML = "";
};

input.onchange = handleUpload;
identifyButton.onclick = upload;
resetButton.onclick = reset;

showOnly([uploadLabel]);

console.log("done!!");
