const delayms = 1;

const currentCity = "New York, NY";

function getCurrentCity(callback) {
  setTimeout(function () {

    const city = currentCity;
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

  operation.catch = function(onError) {
    return operation.then(null, onError);
  };

  operation.forwardCompletion = function (op) {
    operation.then(op.succeed, op.fail);
  };

  operation.then = function (success, error) {
    const proxyOp = new Operation("tempo from then");

    function successHandler() {
      if (success) {
        try {
          let op = success(operation.data);

          if (op && op.then) {
            op.forwardCompletion(proxyOp);
          } else {
            proxyOp.succeed(op);
          }
        } catch(e) {
          if (error) {
            error(e);
          } else {
            return proxyOp.fail(e);
          }
        }

      } else {
        proxyOp.succeed(operation.data);
      }
    }

    function errorHandler() {
      if (error) {
        let op = error(operation.data);

        if (op && op.forwardCompletion) {
          op.forwardCompletion(proxyOp);
        } else if(op != null) {
          proxyOp.succeed(op);
        }
      } else {
        proxyOp.fail(operation.data);
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

    return proxyOp;
  };

  return operation;
}


function fetchCurrentCityThatFails() {
  let operation = new Operation();
  doLater(() => operation.fail("GPS BROKEN"));
  return operation;
}

function doLater(func) {
  setTimeout(func, 1);
}

suite.only("Operations");

test("error recovery bypassed if not needed", done => {
  fetchCurrentCity()
    .catch(error => "default city")
    .then(city => {
      expect(city).toBe(currentCity);
      done();
    });
})


test("register success callback async", (done) => {
  let currentCity = fetchCurrentCity();

  doLater(function () {
    currentCity.then(() => done());
  });
});

test("life is full of async, nesting is inevitable, let's do something about it", (done) => {
  fetchCurrentCity()
    .then(fetchWeather)
    .then(printWeather);

  function printWeather(weather) {
    console.log(weather);
    done();
  }
});

test("error recovery", done => {

   /* fetchCurrentCity()
      .then(city => {
        throw new Error("Oh noes");
        return fetchWeather(city);
      })
      .catch(err => {
        console.log(err);
        done();
      })*/

  fetchCurrentCityThatFails()
    .then(city => {
      expect(city).toBe("default city");
      done();
    })
    .then(smth => {
      console.log(smth);
    })
    .catch(err => {
      console.log(err);
      done();
    })

});

test("sync error recovery", done => {
  fetchCurrentCityThatFails()
    .catch(error => {
      console.log(error);
      return "default city";
    })
    .then(city => {
      expect(city).toBe("default city");
      done();
    });
});


test("lexical parallelism", (done) => {
  const city = "NYC";

  const weatherOp = fetchWeather(city);
  const forecastOp = fetchForecast(city);

  weatherOp.then((weather) => {
    forecastOp.then((forecast) => {
      console.log(`It's currently ${weather.temp} in ${city} with a five day forecast of ${forecast.fiveDay}`);
      done();
    });
  })
});

test("register only error handler, ignores success", (done) => {
  let multiDone = callDone(done).afterTwoCalls();
  let operation = fetchCurrentCity();

  operation.catch(error => done(error));
  operation.then(result => done());
});

test("register only success handler, ignores error handler", (done) => {
  const operation = fetchCurrentCity();

  operation.then(result => done(new Error("Shouldn't succeed")));
  operation.catch(error => done());
});
