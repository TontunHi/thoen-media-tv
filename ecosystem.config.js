module.exports = {
  apps: [
    {
      name: 'thoen-media-tv',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -H 0.0.0.0 -p 5035',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5035,
        HOSTNAME: '0.0.0.0'
      }
    }
  ]
};
