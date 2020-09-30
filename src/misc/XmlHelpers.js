module.exports = {
  getChildrenByTag: function (source, tagName) {
    let pattern = new RegExp(`<${tagName}>((.|\n)*?)<\/${tagName}>`, "gm");
    let children = [];
    let res = pattern.exec(source);
    while (res != null) {
      children.push(res[1]);
      res = pattern.exec(source);
    }
    return children;
  },
};
