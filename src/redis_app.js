const redis = require("redis");
const config = require("./config");

class RedisApp {
  /**
   * @type {redis.RedisClient}
   */
  static app = redis.createClient({
    host: config.redisHost,
    port: config.port,
    auth_pass: config.redisSecret,
  });
}

module.exports = RedisApp;
