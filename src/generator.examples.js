"use strict";

const city = "New York, NY";
const apiKey = "3d04aaac6fdde93c9200d8e464f31b99";
const weatherUrl = `http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=imperial`;
const fiveDayUrl = `http://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=imperial`;

function* me() {
  const response = yield fetch(weatherUrl);
  console.log("response");
}

function assistant(generator, doneFn) {
  remind();

  function remind(waitingFor) {
    let next = generator.next(waitingFor);
    let value = next.value;

    if (typeof value.then == "function") {
      value.then(res => {
        doneFn();
        return remind(res);
      });
    } else {
      return value;
    }
  }

}

suite.only("generators");

test("generator can yield a promise", (done) => {
  let myGenerator = me();
  assistant(myGenerator, done);
});




