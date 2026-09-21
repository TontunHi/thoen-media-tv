module.exports = {
  apps: [
    {
      name: 'thoen-media-tv',
      script: 'server/index.js',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5035
      }
    }
  ]
};
