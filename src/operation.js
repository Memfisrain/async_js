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

/*function fetchCurrentCity() {
  let operation = new Operation(function executor(resolve, reject) {
    getCurrentCity(function(error, result) {
      if (error) {
        reject(error);
        return;
      }

      resolve(result);
    });
  });

  return operation;
}*/


/*function fetchWeather(city) {
  let operation = new Operation(function executor(resolve, reject) {
    getWeather(city, function(error, result) {
      if (error) {
        reject(error);
        return;
      }

      resolve(result);
    });
  });

  return operation;
}

function fetchForecast(city) {
  let operation = new Operation(function executor(resolve, reject) {
    getForecast(city, function(error, result) {
      if (error) {
        reject(error);
        return;
      }

      resolve(result);
    });
  });

  return operation;
}*/

function Operation(callback) {
  const operation = {
    status: "pending",
    data: "",
    resolved: false,
    successReactions: [],
    errorReactions: []
  };

  function internalResolve(result) {
    operation.data = result;
    operation.status = "success";
    operation.successReactions.forEach(onSuccess => onSuccess(result));
    operation.successReactions = [];
  }

  operation.resolve = function (value) {
    if (!operation.resolved) {
      operation.resolved = true;

      if (value && value.then) {
        value.then(internalResolve, internalReject);
      } else {
        internalResolve(value);
      }
    }
  };

  function internalReject(error) {
    operation.data = error;
    operation.status = "error";
    operation.errorReactions.forEach(onError => onError(error));
    operation.errorReactions = [];
  }

  operation.reject = function (value) {
    if (!operation.resolved) {
      operation.resolved = true;

      if (value && value.then) {
        value.then(internalResolve, internalReject);
      } else {
        internalReject(value);
      }
    }
  };

  operation.nodeCallback = function (error, result) {
    if (error) {
      operation.reject(error);
      return;
    }

    operation.resolve(result);
  };


  operation.catch = function (onError) {
    return operation.then(null, onError);
  };
  
  operation.then = function (success, error) {
    const proxyOp = new Operation("tempo from then");
  
    //helper doAsync function
    function doAsync(fn) {
    return () => {
      setTimeout(fn, 0);
    };
    }
  
    function successHandler() {
    let op;

    if (success) {
      try {
        op = success(operation.data);
      } catch (e) {
        if (error) {
          error(e);
        } else {
          return proxyOp.reject(e);
        }
      }

      proxyOp.resolve(op);
    } else {
      proxyOp.resolve(operation.data);
    }
    }
  
    function errorHandler() {
    let op;

    if (error) {
      try {
        op = error(operation.data);
      } catch (e) {
        proxyOp.reject(e);
      }

      proxyOp.resolve(op);
    } else {
      proxyOp.reject(operation.data);
    }
    }
  
    let asyncSuccessHandler = doAsync(successHandler);
    let asyncErrorHandler = doAsync(errorHandler);
  
    if (operation.status === "success") {
      asyncSuccessHandler();
    } else if (operation.status === "error") {
      asyncErrorHandler();
    } else {
      operation.successReactions.push(asyncSuccessHandler);
      operation.errorReactions.push(asyncErrorHandler);
    }
  
    return proxyOp;
  };


  //execute callback function if it exists
  if (callback && typeof callback === "function") {
    callback(operation.resolve, operation.reject);
  }
  
  return operation;
}

Operation.resolve = function(result) {
  return new Operation(function(resolve) {
    resolve(result);
  });
};

Operation.reject = function(err) {
  return new Operation(function(resolve, reject) {
    reject(err);
  });
};

Operation.promisify = function(fn) {
  return function(...args) {
    console.log(args);
    return new Operation(function executor(resolve, reject) {
      fn.apply(fn, [...args, function callback(error, result) {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }]);
    });
  }
};

const fetchCurrentCity = Operation.promisify(getCurrentCity);
const fetchWeather = Operation.promisify(getWeather);
const fetchForecast = Operation.promisify(getForecast);

function fetchCurrentCityThatFails() {
  let operation = new Operation();
  doLater(() => operation.reject("GPS BROKEN"));
  return operation;
}

function fetchCurrentCityIndecisive() {
  const operation = new Operation();

  doLater(() => {
    operation.resolve("NYD");
    operation.resolve("Philly");
  });

  return operation;
}

function fetchCurrentCitySync() {
  let operation = new Operation();
  console.log("get current city");
  operation.resolve(currentCity);
  return operation;
}

function doLater(func) {
  setTimeout(func, 1);
}



//------------------------BEGIN TEST CASES------------------------
suite("Operations", () => {
  test("sync result transformation", ()=> {
    return fetchCurrentCity()
      .then(city => {
        return "1000";
      })
      .then(zip => {
        expect(zip).toBe("1000");
      });
  });

  test("use Operation.resolve method", () => {
    Operation.resolve(currentCity)
      .then(city => {
        expect(city).toBe(currentCity);
      });
  });

  test("use Operation.reject method", () => {
    Operation.reject(new Error("Some"))
      .then(err => {
        expect(err).toBe("Some");
      });
  });

  test("what does this print out", done => {
    let ui;

    fetchCurrentCitySync()
      .then(city => {
        console.log("city is received");
        ui = city;
      });

    console.log("set to loading");

    ui = "loading...";

    setTimeout(() => {
      expect(ui).toBe(currentCity);
      done();
    }, 1000);
  });

  test("what is resolve", done => {
    let fetchCurrentCity = new Operation();
    fetchCurrentCity.resolve("NYC");

    let fetchClone = new Operation();
    fetchClone.resolve(fetchCurrentCity);

    fetchClone.then(city => {
      expect(city).toBe("NYC");
      done();
    });
  });

  test("ensure that success handler are async", done => {
    let operation = new Operation(function executor(resolve, reject) {
      resolve(currentCity);
    });

    //operation.resolve(currentCity);
    operation.then(city => {
      doneAlias();
    });

    let doneAlias = done;
  });

  test("ensure that error handler are async", done => {
    let operation = new Operation();
    operation.reject("Error");
    operation.catch(err => {
      doneAlias();
    });

    let doneAlias = done;
  });

  test("invoke succeed method twice", done => {
    fetchCurrentCityIndecisive()
      .then(res => {
        expect(res).toBe("NYD");
        return res;
      })
      .then(res => {
        expect(res).toBe("NYD");
        done();
      })
  });

  test("protect from doubling up on success", done => {
    fetchCurrentCityIndecisive()
      .then(e => done());
  });

  test("error recovery bypassed if not needed", done => {
    fetchCurrentCity()
      .catch(error => "default city")
      .then(city => {
        expect(city).toBe(currentCity);
        done();
      });
  });

  test("thrown error recovery", done => {
    fetchCurrentCity()
      .then(city => {
        throw new Error("Oh noes");
        return fetchWeather(city);
      })
      .catch(e => done());
  });

  test("error, error recovery", done => {
    fetchCurrentCity()
      .then(city => {
        throw new Error("oh noes");
        return fetchWeather(City);
      })
      .catch(error => {
        expect(error.message).toBe("oh noes");
        throw new Error("Error from an error handler, ohhh no");
      })
      .catch(error => {
        expect(error.message).toBe("Error from an error handler, ohhh no");
        done();
      })
  });


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
      });

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
});


