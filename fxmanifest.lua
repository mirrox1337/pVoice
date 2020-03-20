resource_manifest_version '44febabe-d386-4d18-afbe-5e627f4af937'

client_script 'dist/client.js'

server_script 'dist/server.js'

files {
    'config/*.json'
}

game { 'gta5' }

fx_version 'adamant'

dependency 'yarn'
dependency 'webpack'

--webpack_config 'webpack/client.config.js'
--webpack_config 'webpack/server.config.js'