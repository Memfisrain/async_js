"use strict";

const city = "New York, NY";
const apiKey = "3d04aaac6fdde93c9200d8e464f31b99";
const weatherUrl = `http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=imperial`;
const fiveDayUrl = `http://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=imperial`;

function* me() {
  const weather =  yield fetch(weatherUrl).then(response => response.json());
  const forecast = yield fetch(fiveDayUrl).then(response => response.json());
  return {
    weather,
    forecast
  };
}

function assistant(generator) {
  return new Promise(function executor(resolve, reject) {
    remind(() => generator.next());

    function remind(resume) {
      let next;
  
      try {
        next = resume();
      } catch(error) {
        reject(error);
      }
      
      if (next.done) {
        resolve(next.value);
        return;
      }
  
      let promise = Promise.resolve(next.value);

      promise.then(
        function fulfillReaction(result) {
          remind(() => generator.next(result));
        },
        function rejectReaction(error) {
          remind(() => generator.throw(error));
        });
    }
  });
}

suite.only("generators");

test("generator can yield a promise", (done) => {
  let myGenerator = me();

  assistant(myGenerator, done)
    .catch(error => {
      console.log(`recover from error: ${error}`);
      done();
    })
    .then(result => {
      console.log(`Assistant is done with result: ${JSON.stringify(result)}`);
      done();
    })
});




