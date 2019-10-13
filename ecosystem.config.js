module.exports = {
  apps: [
    {
      name: "BUYING-ORDER-AGENT",
      script: "dist/app.js",

      // Options reference: https://pm2.io/doc/en/runtime/reference/ecosystem-file/
      args: "",
      instances: 1,
      autorestart: true,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development"
      },
      env_production: {
        NODE_ENV: "production"
      },
      error_file: "err.log",
      out_file: "out.log",
      log_file: "combined.log",
      time: true
    }
  ],

  deploy: {
    production: {
      user: "node",
      host: "0.0.0.0",
      ref: "origin/master",
      repo: "git@github.com:thomas-adriano/buying-order-agent.git",
      path: "C:/Users/thoma/buying-order-agent",
      ssh_options: "StrictHostKeyChecking=no",
      "post-deploy":
        "npm install && npx pm2 reload ecosystem.config.js --env production"
    }
  }
};
