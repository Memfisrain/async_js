const delayms = 1;

function getCurrentCity(callback) {
  setTimeout(function () {

    const city = "New York, NY";
    callback(null, city);

  }, delayms);
}

function getWeather(city, callback) {
  setTimeout(function () {

    if (!city) {
      callback(new Error("City required to get weather"));
      return;
    }

    const weather = {
      temp: 50
    };

    callback(null, weather)

  }, delayms);
}

function getForecast(city, callback) {
  setTimeout(function () {

    if (!city) {
      callback(new Error("City required to get forecast"));
      return;
    }

    const fiveDay = {
      fiveDay: [60, 70, 80, 45, 50]
    };

    callback(null, fiveDay)

  }, delayms);
}

function fetchCurrentCity() {
  let operation = new Operation("fetchCity");

  getCurrentCity(operation.nodeCallback);

  return operation;
}

function fetchWeather(city) {
  let operation = new Operation('fetchWeather');

  getWeather(city, operation.nodeCallback);

  return operation;
}

function fetchForecast(city) {
  let operation = new Operation();

  getForecast(city, operation.nodeCallback);

  return operation;
}

function Operation(name) {
  const operation = {
    status: "pending",
    data: "",
    name: name || "",
    successReactions: [],
    errorReactions: []
  };

  operation.fail = function (error) {
    operation.data = error;
    operation.status = "error";
    operation.errorReactions.forEach(onError => onError(error));
    operation.errorReactions = [];
  };

  operation.succeed = function (result) {
    operation.data = result;
    operation.status = "success";
    operation.successReactions.forEach(onSuccess => onSuccess(result));
    operation.successReactions = [];
  };

  operation.nodeCallback = function (error, result) {
    if (error) {
      operation.fail(error);
      return;
    }

    operation.succeed(result);
  };

  operation.onFailure = function (onError) {
    operation.onCompletion(null, onError);
  };

  operation.forwardCompletion = function (op) {
    operation.onCompletion(op.succeed, op.fail);
  };

  operation.onCompletion = function (success, error) {
    const completionOp = new Operation("tempo from onCompletion");

    function successHandler() {
      if (success) {
        let op = success(operation.data);

        if (op && op.onCompletion) {
          op.forwardCompletion(completionOp);
        }
      }
    }

    function errorHandler() {
      if (error) {
        let op = error(operation.data);

        if (op && op.forwardCompletion) {
          op.forwardCompletion(completionOp);
        }
      }
    }

    if (operation.status === "success") {
      successHandler();
    } else if (operation.status === "error") {
      errorHandler();
    } else {
      operation.successReactions.push(successHandler);
      operation.errorReactions.push(errorHandler);
    }

    return completionOp;
  };

  return operation;
}

function doLater(func) {
  setTimeout(func, 1);
}

suite.only("Operations");

test("register success callback async", (done) => {
  let currentCity = fetchCurrentCity();

  doLater(function () {
    currentCity.onCompletion(() => done());
  });
});

test.only("life is full of async, nesting is inevitable, let's do something about it", (done) => {
  fetchCurrentCity()
    .onCompletion(city => fetchWeather(city))
    .onCompletion(weather => done());

  /*let weatherOp = new Operation();

  fetchCurrentCity()
    .onCompletion(city => {
      fetchWeather(city).forwardCompletion(weatherOp);
    });

  weatherOp.onCompletion(weather => done());*/
});

test("lexical parallelism", (done) => {
  const city = "NYC";

  const weatherOp = fetchWeather(city);
  const forecastOp = fetchForecast(city);

  weatherOp.onCompletion((weather) => {
    forecastOp.onCompletion((forecast) => {
      console.log(`It's currently ${weather.temp} in ${city} with a five day forecast of ${forecast.fiveDay}`);
      done();
    });
  })
});

test("register only error handler, ignores success", (done) => {
  let multiDone = callDone(done).afterTwoCalls();
  let operation = fetchCurrentCity();

  operation.onFailure(error => done(error));
  operation.onCompletion(result => done());
});

test("register only success handler, ignores error handler", (done) => {
  const operation = fetchCurrentCity();

  operation.onCompletion(result => done(new Error("Shouldn't succeed")));
  operation.onFailure(error => done());
});
