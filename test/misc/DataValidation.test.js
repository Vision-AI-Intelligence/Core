const DataValidation = require("../../src/misc/DataValidation");
describe("Test Data Validation", () => {
  it("Should return true", () => {
    let obj = {
      a: 1,
      b: 3.14,
      c: "Hello World",
    };
    expect(DataValidation.allNotUndefined(obj.a, obj.b, obj.c)).toBe(true);
  });
  it("Should return false", () => {
    let obj = {
      a: 1,
      b: 3.14,
      c: "Hello World",
    };
    expect(DataValidation.allNotUndefined(obj.a, obj.b, obj.c, obj.d)).toBe(
      false
    );
  });
});
