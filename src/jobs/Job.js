const kue = require("kue");

const Job = function () {};

Job.instance = function () {
  if (Job._cache == undefined) {
    Job._cache = new Job();
  }
  return Job._cache;
};

Job.prototype.create = function (jobPayload, jobFunc) {};

module.exports = Job;
