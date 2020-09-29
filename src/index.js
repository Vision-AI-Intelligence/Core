const server = require("./app");
const config = require("./config");
server.listen(config.port, config.host, () => {
  console.log(`Server is running on ${config.host}:${config.port}`);
});
