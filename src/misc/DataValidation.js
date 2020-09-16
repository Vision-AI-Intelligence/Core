module.exports = {
  allNotUndefined: function (...params) {
    for (let i = 0; i < params.length; i++) {
      if (params[i] == undefined) {
        return false;
      }
    }
    return true;
  },
};
