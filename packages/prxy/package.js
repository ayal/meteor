Package.describe({
  summary: "proxies stuff"
});

Package.on_use(function (api) {
  api.use(['http'], 'server');
  api.add_files('prxy_server.js', 'server');
});
