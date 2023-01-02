// global variables

const canvas = document.getElementsByTagName("canvas")[0];

const ctx = document.getElementById("canvas").getContext("2d");

let defaultCsv = "defaultCsv.csv";

let tabledata = sessionStorage.getItem("csvData");

Chart.defaults.font.size = 14;

const datapoints = [];
const labels = [];

const currencys = {
  usd: {
    name: "USD",
    prefix: "$",
    postfix: "dollar",
    value: sessionStorage.getItem("ValueUSD") || 0.095,
    currencyFormat: "en-US",
  },
  sek: {
    name: "SEK",
    postfix: "kr",
    value: 1,
    currencyFormat: "se-SE",
  },
  euro: {
    name: "EUR",
    postfix: "€",
    value: sessionStorage.getItem("ValueEURO") || 0.089,
    currencyFormat: "de-DE",
  },
  gold: {
    name: "GOLD",
    postfix: "gram",
    value: 0.00167894,
  },
};

async function getRate() {

let currencyData = null;

var myHeaders = new Headers();
myHeaders.append("apikey", "PZZUg25dRZrrNsgcYhD3gIYUTMM2lfRO");

var requestOptions = {
 method: 'GET',
 redirect: 'follow',
 headers: myHeaders
};

await fetch("https://api.apilayer.com/exchangerates_data/latest?symbols=EUR%2C%20USD&base=SEK", requestOptions)
 .then(response => response.text())
 .then(result => currencyData = JSON.parse(result))
 .catch(error => console.log('error', error));

 return currencyData.rates;

}
if (
  sessionStorage.getItem("ValueUSD") === null ||
  sessionStorage.getItem("ValueEURO") === null
) {
  (async () => {
    const rates = await getRate();

    currencys.usd.value = rates.USD;
    sessionStorage.setItem("ValueUSD", rates.USD);

    currencys.euro.value = rates.EUR;
    sessionStorage.setItem("ValueEURO", rates.EUR);
  })();
}

let clicked = [];

let arrOfCurrencys = [];

let selectedCurrency = currencys.sek;

let markerIndex = null;

let diffFromMarker = null;

let startSumGoal;

isNaN(parseInt(sessionStorage.getItem("startSumGoal")))
  ? (startSumGoal = 100000)
  : (startSumGoal = parseInt(sessionStorage.getItem("startSumGoal")));

let percentageGoal;

isNaN(parseInt(sessionStorage.getItem("percentageGoal")))
  ? (percentageGoal = 20)
  : (percentageGoal = parseInt(sessionStorage.getItem("percentageGoal")));

// functions

for (const currency in currencys) {
  arrOfCurrencys.push(currencys[currency]);
}

function handleDatapointRadius() {
  if (datapoints.length < 6) {
    config.options.hitRadius = 30;
    config.options.radius = 10;
    config.options.hoverRadius = 15;
  } else if(datapoints.length < 12) {
    config.options.hitRadius = 20;
    config.options.radius = 5;
    config.options.hoverRadius = 10;
  } else {
    config.options.hitRadius = 15;
    config.options.radius = 2;
    config.options.hoverRadius = 7;
  }
}

function saveSessionData() {
  let arr = "";
  arr += `"year","month","amount"`;
  for (let i = 0; i < datapoints.length; i++) {
    arr += "\n";
    arr += labels[i].substring(5, 7);
    arr += ",";
    arr += labels[i].substring(0, 2);
    arr += ",";
    arr += datapoints[i];
  }
  tabledata = arr;
  sessionStorage.setItem("csvData", tabledata);
}

function updateData() {
  chart.config.data.datasets[0].data = datapoints;
  chart.config.data.labels = labels;
  chart.config.data.datasets[1].data = generateGoalData(
    startSumGoal,
    percentageGoal
  );
  handleDatapointRadius();
  changeCurrency(selectedCurrency);
  updateCurrentTotalValue(selectedCurrency, chart.config.data.datasets[0].data);
  updateLines();
  document.getElementById("startAmountField").placeholder = datapoints[0];
  chart.update();
  saveSessionData();
}

function changeGoal() {
  startSumGoal = parseInt(document.getElementById("startAmountField").value);
  if (isNaN(startSumGoal)) {
    startSumGoal = datapoints[0];
  }
  sessionStorage.setItem("startSumGoal", startSumGoal);
  percentageGoal = parseInt(
    document.getElementById("increasePerYearField").value
  );
  sessionStorage.setItem("percentageGoal", percentageGoal);
  updateData();
}

document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("currencys")
    .addEventListener("input", handleSelectCurrency);
});

async function handleSelectCurrency(ev) {
  let selected = ev.target;
  selectedCurrency = arrOfCurrencys.find(
    (currency) => currency.name == selected.value.toUpperCase()
  );
  changeCurrency(selectedCurrency);
  data.datasets[0].backgroundColor = getRandomColor();
  updateData();
}

async function fillDataFromCsv() {
  const response = await fetch(defaultCsv);
  if (tabledata === null) {
    tabledata = await response.text();
  }
  const table = tabledata.split("\n").slice(1);

  table.forEach((row) => {
    let column;

    if (row.includes(";")) {
      column = row.split(";");
    } else {
      column = row.split(",");
    }

    const month = column[1];

    const year = column[0];
    labels.push(month + " - " + year);

    const value = column[2];
    datapoints.push(parseInt(value));
  });

  if (response.status != 200) {
    Swal.fire({
      icon: "error",
      title: "Could not load the file properly, try again!",
    });
    resetChart();
  }

  for (let i = 0; i < labels.length; i++) {
    if (labels[i].length !== 7) {
      Swal.fire({
        icon: "error",
        title: "Unvalid format of labels",
      });
      resetChart();
      return;
    }
  }

  chart.config.data.labels = labels;

  datapoints.forEach(() => {
    clicked.push(0);
  });
  updateData();
}

function addDataFromForm() {
  const date = document.getElementById("dateField").value;
  if (
    parseInt(date.substring(0, 4)) < 2000 ||
    parseInt(date.substring(0, 4)) > 2099
  ) {
    Swal.fire({
      icon: "error",
      title: "Year must be between 2000 and 2099!",
    });
    return;
  }
  if (date.length != 7) {
    Swal.fire({
      icon: "error",
      title: "Invalid date!",
    });
    return;
  }
  const year = date.substring(2, 4);
  const month = date.substring(5, 7);
  const formatedDate = `${month} - ${year}`;

  let value = 0;
  if (!isNaN(parseInt(document.getElementById("amountField").value))) {
    value = parseInt(document.getElementById("amountField").value);
  }
  //scenario 0 (chart is empty)
  if (datapoints.length === 0) {
    datapoints.push(value);
    labels.push(formatedDate);
    clicked.push(0);
  }
  // scenario 1 (date is smaller than the smallest date)
  if (
    year < labels[0].substring(5, 7) ||
    (year == labels[0].substring(5, 7) && month < labels[0].substring(0, 2))
  ) {
    labels.unshift(formatedDate);
    datapoints.unshift(value);
    clicked.push(0);
  }
  // scenario 2 (date is bigger than the biggest date)
  else if (
    year > labels[labels.length - 1].substring(5, 7) ||
    (year == labels[labels.length - 1].substring(5, 7) &&
      month > labels[labels.length - 1].substring(0, 2))
  ) {
    labels.push(formatedDate);
    datapoints.push(value);
    clicked.push(0);
  } else {
    for (let i = 0; i < labels.length; i++) {
      // scenario 3 (date is the same as another date)
      if (labels[i] == formatedDate) {
        datapoints[i] = value;
        break;
      }
      if (i < 1) {
        continue;
      }
      const date = year + month;
      const prevDate =
        labels[i - 1].substring(5, 7) + labels[i - 1].substring(0, 2);
      const nextDate = labels[i].substring(5, 7) + labels[i].substring(0, 2);
      // scenario 4 (date is between two dates)
      if (date > prevDate && date < nextDate) {
        labels.splice(i, 0, formatedDate);
        datapoints.splice(i, 0, value);
        clicked.push(0);
        break;
      }
    }
  }
  updateData();
}

function removeDatapoint() {
  if (markerIndex == null) {
    Swal.fire(
      "Select a datapoint to remove by clicking on the dot on the chart."
    );
    return;
  }
  clicked.pop();
  labels.splice(markerIndex, 1);
  datapoints.splice(markerIndex, 1);
  markerIndex = null;
  clicked.fill(0);
  diffFromMarker = null;
  updateData();
}

function round(value, decimalPoints) {
  let num = "1";
  for (let i = 0; i < decimalPoints; i++) {
    num += "0";
  }
  num = parseInt(num);
  return Math.round((value + Number.EPSILON) * num) / num;
}

function formatToCurrency(value, currency) {
  if (currency === currencys.gold) {
    return round(value, 2) + " " + currencys.gold.postfix;
  }

  let currencyFormat = new Intl.NumberFormat(currency.currencyFormat, {
    style: "currency",
    currency: currency.name,
  }).format(value);

  if (currency === currencys.sek) {
    return currencyFormat.slice(0, -6) + " kr";
  }
  return currencyFormat;
}

function getPercentageDiff(newVal, oldVal) {
  const val = ((newVal - oldVal) / oldVal) * 100;
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

function updateLines() {
  if (markerIndex != null && markerIndex < datapoints.length) {
    const diff =
      data.datasets[0].data[data.datasets[0].data.length - 1] -
      data.datasets[0].data[markerIndex];
    diffFromMarker = formatToCurrency(diff, selectedCurrency);
  }
}

function updateCurrentTotalValue(currency, dataArray) {
  // checking if values should be displayed
  if (dataArray.length < 1) {
    document.getElementById("diffFromLastMonth").innerHTML = "";
    document.getElementById("diffToGoal").innerHTML = "";
    document.getElementById("currentTotalValue").innerHTML = "";
    return;
  }

  let currentTotalValue = dataArray[dataArray.length - 1];
  let lastMonthsTotalValue = dataArray[dataArray.length - 2];

  const percentDiff = getPercentageDiff(
    currentTotalValue,
    lastMonthsTotalValue
  );

  let sign = "";
  if (percentDiff > 0) {
    sign = "+";
  }

  document.getElementById(
    "diffFromLastMonth"
  ).innerHTML = `Difference from last month: ${sign}${percentDiff} %`;

  const currentTotalValueText = `Total net wealth: ${formatToCurrency(
    currentTotalValue,
    currency
  )}`;

  document.getElementById("currentTotalValue").innerHTML =
    currentTotalValueText;

  let diff;

  // marked datapoint
  if (clicked.includes(1) && clicked[datapoints.length - 1] != 1) {
    diff = currentTotalValue - dataArray[clicked.indexOf(1)];
    diff > 0 ? (sign = "+") : (sign = "");
    document.getElementById(
      "diffToGoal"
    ).innerHTML = `Difference from marked point: ${sign}${formatToCurrency(
      diff,
      currency
    )}`;
  }
  // no marked datapoint
  else {
    diff =
      currentTotalValue -
      data.datasets[1].data[data.datasets[1].data.length - 1];
    diff > 0 ? (sign = "+") : (sign = "");
    document.getElementById(
      "diffToGoal"
    ).innerHTML = `Difference from goal: ${sign}${formatToCurrency(
      diff,
      currency
    )}`;
  }
}

function changeCurrency(currency) {
  let newGoal = generateGoalData(startSumGoal, percentageGoal);
  let newDatapoints = [...datapoints];
  for (let i = 0; i < datapoints.length; i++) {
    newDatapoints[i] *= currency.value;
    newGoal[i] *= currency.value;
  }
  chart.config.data.datasets[0].data = newDatapoints;
  chart.config.data.datasets[1].data = newGoal;
  updateCurrentTotalValue(currency, newDatapoints);
}

function getRandomRBGA() {
  return Math.floor(Math.random() * 255);
}

function getRandomColor() {
  let colorStop1;

  selectedCurrency == currencys.gold
    ? (colorStop1 = "gold")
    : (colorStop1 = `rgba(${getRandomRBGA()},${getRandomRBGA()},${getRandomRBGA()},${getRandomRBGA()})`);

  let colorStop2 = `rgba(0,${getRandomRBGA()},${getRandomRBGA()},0.2)`;
  let gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, colorStop1);
  gradient.addColorStop(1, colorStop2);
  return gradient;
}

function generateGoalData(startSum, percentageGoal) {
  if (datapoints.length === 0) {
    return [];
  }

  const firstDate = labels[0];
  const lastDate = labels[labels.length - 1];

  let diffInMonths;

  // calc months
  diffInMonths =
    parseInt(lastDate.substring(0, 2)) - parseInt(firstDate.substring(0, 2));
  // calc years
  diffInMonths +=
    (parseInt(lastDate.substring(5, 7)) - parseInt(firstDate.substring(5, 7))) *
    12;

  let goalSum = startSum;

  while (diffInMonths >= 12) {
    goalSum = goalSum + (goalSum * percentageGoal) / 100;
    diffInMonths -= 12;
  }

  const spare =
    ((goalSum + (goalSum * percentageGoal) / 100 - goalSum) / 12) *
    diffInMonths;
  goalSum += spare;

  goalSum -= startSum;

  const amountPerDatapoint = goalSum / (datapoints.length - 1);
  const goalData = [];

  for (let i = 0; i < datapoints.length; i++) {
    goalData.push(Math.round(startSum));
    startSum += amountPerDatapoint;
  }
  return goalData;
}

function alertResetChart() {
  return Swal.fire({
    title: "Are you sure?",
    text: "You won't be able to revert this!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, reset chart!",
  }).then((result) => {
    if (result.isConfirmed) {
      resetChart();
      Swal.fire("Deleted!", "Your chart is empty.", "success");
    }
  });
}

function resetChart() {
  datapoints.length = 0;
  labels.length = 0;
  clicked.length = 0;
  updateData();
}

async function loadCsv() {
  await Swal.fire({
    title: "The csv-file should have the following format:",
    text: `"year","month","amount" |
  Example:
  22,06,126741`,
  });

  let files = await selectFile(".csv", false);
  let reader = new FileReader();
  reader.onload = function () {
    tabledata = this.result;
  };
  reader.readAsText(files);
  resetChart();
  fillDataFromCsv();
}

function selectFile(contentType, multiple) {
  return new Promise((resolve) => {
    let input = document.createElement("input");
    input.type = "file";
    input.multiple = multiple;
    input.accept = contentType;
    input.onchange = (_) => {
      let files = Array.from(input.files);
      multiple ? resolve(files) : resolve(files[0]);
    };
    input.click();
  });
}

function getDownloadData() {
  const arr = [];
  arr.push(`"year","month","amount"`);
  for (let i = 0; i < datapoints.length; i++) {
    arr.push("\n");
    arr.push(labels[i].substring(5, 7));
    arr.push(",");
    arr.push(labels[i].substring(0, 2));
    arr.push(",");
    arr.push(datapoints[i]);
  }
  return arr;
}

function downloadCsv() {
  const download = document.getElementById("download");
  const file = new Blob(getDownloadData(), { type: "text/plain" });
  download.href = URL.createObjectURL(file);
  download.download = "MyChart.csv";
}

const data = {
  labels: [],
  datasets: [
    {
      tension: 0.1,
      fill: true,
      label: "Total Net Wealth",
      backgroundColor: getRandomColor(),
      borderColor: "gray",
      data: [],
    },
    {
      tension: 0.1,
      fill: false,
      label: "Goal",
      backgroundColor: "red",
      borderColor: "red",
      data: [],
    },
  ],
};

// plugin clickableLines block
const clickableLines = {
  id: "clickableLines",
  afterEvent(chart, args, pluginOptions) {
    const xCursor = args.event.x;
    const yCursor = args.event.y;
    if (args.event.type === "click") {
      // xy cordinates of each dataset
      const xyData = chart._metasets[0].data;
      const clickRadius = config.options.hoverRadius * 2;

      for (let i = 0; i < xyData.length; i++) {
        const xMin = xyData[i].x - clickRadius;
        const xMax = xyData[i].x + clickRadius;
        const yMin = xyData[i].y - clickRadius;
        const yMax = xyData[i].y + clickRadius;

        if (
          xCursor >= xMin &&
          xCursor <= xMax &&
          yCursor >= yMin &&
          yCursor <= yMax
        ) {
          if (clicked[i] === 0) {
            clicked = clicked.map(() => 0);
            clicked[i] = 1;
            markerIndex = i;
          } else {
            clicked[i] = 0;
            markerIndex = null;
            diffFromMarker = null;
          }
        }
      }
      updateData();
    }
  },
  beforeDatasetsDraw(chart, args, pluginOptions) {
    const {
      ctx,
      chartArea: { top, bottom },
    } = chart;
    class Line {
      constructor(xCoor) {
        this.width = xCoor;
      }
      draw(ctx) {
        ctx.restore();
        ctx.beginPath();
        ctx.setLineDash([1, 1]);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = "grey";
        ctx.moveTo(this.width, top);
        ctx.lineTo(this.width, bottom);
        ctx.stroke();
        ctx.save();
      }
    }
    const xyData = chart._metasets[0].data;
    if (clicked.includes(1)) {
      const drawLine = new Line(xyData[clicked.indexOf(1)].x);
      drawLine.draw(ctx);
    }
  },
};

let delayed;

const config = {
  type: "line",
  data: data,
  options: {
    elements: {
      line: {
        borderWidth: 1.5,
      },
    },
    onHover: (event, chartElement) => {
      event.native.target.style.cursor = chartElement[0]
        ? "pointer"
        : "crosshair";
    },
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      zoom: {
        zoom: {
          drag: {
            enabled: true,
            threshold: 15,
          },
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true,
          },
          mode: "x",
        },
      },
    },
    interaction: {
      mode: "index",
    },
    hitRadius: 15,
    radius: 2,
    hoverRadius: 7,
    responsive: true,
    animation: {
      onComplete: () => {
        delayed = false;
      },
      delay: (context) => {
        let delay = 0;
        if (context.type === "data" && context.mode === "default" && !delayed) {
          delay = context.dataIndex * 20 + context.datasetIndex * 100;
        }
        return delay;
      },
    },
    scales: {
      // adds currency to yAxes
      yAxes: {
        ticks: {
          callback: function (value, index, ticks) {
            const formatedNum = Chart.Ticks.formatters.numeric.apply(this, [
              value,
              index,
              ticks,
            ]);
            return selectedCurrency === currencys.usd
              ? `${currencys.usd.prefix} ${formatedNum}`
              : `${formatedNum} ${selectedCurrency.postfix}`;
          },
        },
      },
      xAxes: {
        title: {
          display: true,
          text: "Month / Year",
          color: "#626262",
          font: {
            family: "Helvetica Neue",
            size: 15,
            lineHeight: 1,
          },
          padding: { top: 15, left: 0, right: 0, bottom: 0 },
        },
        ticks: {
          minRotation: 35,
        },
      },
    },
  },
  plugins: [clickableLines],
};

const chart = new Chart(ctx, config);

fillDataFromCsv();
