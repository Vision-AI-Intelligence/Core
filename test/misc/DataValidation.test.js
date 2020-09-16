const { assert } = require("chai");
const chai = require("chai");
const should = chai.should();
const DataValidation = require("../../src/misc/DataValidation");
describe("Test Data Validation", () => {
  it("Should return true", () => {
    let obj = {
      a: 1,
      b: 3.14,
      c: "Hello World",
    };
    assert.equal(DataValidation.allNotUndefined(obj.a, obj.b, obj.c), true);
  });
  it("Should return false", () => {
    let obj = {
      a: 1,
      b: 3.14,
      c: "Hello World",
    };
    assert.equal(
      DataValidation.allNotUndefined(obj.a, obj.b, obj.c, obj.d),
      false
    );
  });
});
