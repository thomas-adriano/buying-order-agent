module.exports = {
  apps: [
    {
      name: "buying-order-agent-server",
      script: "bundle.js",
      // Options reference: https://pm2.keymetrics.io/docs/usage/application-declaration/
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development"
      },
      env_production: {
        NODE_ENV: "production"
      }
    }
  ]
};
